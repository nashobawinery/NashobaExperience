import { db } from "./db";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "express";

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface UserPermissions {
  userId: string;
  groups: string[];
  moduleAccess: Record<string, boolean>;
  featurePermissions: Record<string, PermissionLevel>;
  computedAt: number;
}

const PERMISSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const permissionLevelOrder: Record<PermissionLevel, number> = {
  'none': 0,
  'view': 1,
  'edit': 2,
  'admin': 3
};

function getHigherPermission(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
  return permissionLevelOrder[a] >= permissionLevelOrder[b] ? a : b;
}

export async function computeUserPermissions(userId: string): Promise<UserPermissions> {
  const permissions: UserPermissions = {
    userId,
    groups: [],
    moduleAccess: {},
    featurePermissions: {},
    computedAt: Date.now()
  };

  try {
    // Get user's group memberships
    const groupsResult = await db.execute(sql`
      SELECT ug.id, ug.name
      FROM user_groups ug
      INNER JOIN group_memberships gm ON ug.id = gm.group_id
      WHERE gm.user_id = ${userId} AND ug.active = true
    `);
    
    permissions.groups = groupsResult.rows.map((r: any) => r.name);
    const groupIds = groupsResult.rows.map((r: any) => r.id);

    if (groupIds.length === 0) {
      return permissions;
    }

    // Format group IDs as PostgreSQL array literal
    const groupIdsArray = `{${groupIds.join(',')}}`;

    // Get module access for all user's groups
    const moduleAccessResult = await db.execute(sql`
      SELECT 
        pm.module_key,
        bool_or(gma.has_access) as has_access
      FROM group_module_access gma
      INNER JOIN platform_modules pm ON gma.module_id = pm.id
      WHERE gma.group_id = ANY(${groupIdsArray}::text[])
      GROUP BY pm.module_key
    `);

    for (const row of moduleAccessResult.rows as any[]) {
      permissions.moduleAccess[row.module_key] = row.has_access;
    }

    // Get feature permissions for all user's groups (highest wins)
    const featurePermsResult = await db.execute(sql`
      SELECT 
        pm.module_key || '.' || mf.feature_key as feature_key,
        MAX(CASE gfp.permission_level
          WHEN 'admin' THEN 3
          WHEN 'edit' THEN 2
          WHEN 'view' THEN 1
          ELSE 0
        END) as max_level
      FROM group_feature_permissions gfp
      INNER JOIN module_features mf ON gfp.feature_id = mf.id
      INNER JOIN platform_modules pm ON mf.module_id = pm.id
      WHERE gfp.group_id = ANY(${groupIdsArray}::text[])
      GROUP BY pm.module_key, mf.feature_key
    `);

    const levelMap: Record<number, PermissionLevel> = {
      0: 'none',
      1: 'view',
      2: 'edit',
      3: 'admin'
    };

    for (const row of featurePermsResult.rows as any[]) {
      permissions.featurePermissions[row.feature_key] = levelMap[row.max_level] || 'none';
    }

    // Get user-specific overrides (these override group permissions)
    const overridesResult = await db.execute(sql`
      SELECT 
        pm.module_key || '.' || mf.feature_key as feature_key,
        upo.permission_level
      FROM user_permission_overrides upo
      INNER JOIN module_features mf ON upo.feature_id = mf.id
      INNER JOIN platform_modules pm ON mf.module_id = pm.id
      WHERE upo.user_id = ${userId}
        AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
    `);

    for (const row of overridesResult.rows as any[]) {
      permissions.featurePermissions[row.feature_key] = row.permission_level as PermissionLevel;
    }

  } catch (error) {
    console.error('Error computing user permissions:', error);
  }

  return permissions;
}

export async function getUserPermissions(req: any): Promise<UserPermissions | null> {
  const user = req.user as any;
  
  if (!user?.claims?.sub) {
    return null;
  }

  const userId = user.claims.sub;

  // Check if we have cached permissions in session
  if (req.session?.permissions?.userId === userId) {
    const cached = req.session.permissions as UserPermissions;
    if (Date.now() - cached.computedAt < PERMISSION_CACHE_TTL) {
      return cached;
    }
  }

  // Compute fresh permissions
  const permissions = await computeUserPermissions(userId);
  
  // Cache in session
  if (req.session) {
    req.session.permissions = permissions;
  }

  return permissions;
}

export function invalidatePermissionCache(req: any): void {
  if (req.session) {
    delete req.session.permissions;
  }
}

// Check if user has access to a module
export function hasModuleAccess(permissions: UserPermissions | null, moduleKey: string): boolean {
  if (!permissions) return false;
  return permissions.moduleAccess[moduleKey] === true;
}

// Check if user has a minimum permission level for a feature
export function hasFeaturePermission(
  permissions: UserPermissions | null, 
  moduleKey: string, 
  featureKey: string, 
  requiredLevel: PermissionLevel
): boolean {
  if (!permissions) return false;
  
  // First check module access
  if (!hasModuleAccess(permissions, moduleKey)) {
    return false;
  }

  const fullKey = `${moduleKey}.${featureKey}`;
  const userLevel = permissions.featurePermissions[fullKey] || 'none';
  
  return permissionLevelOrder[userLevel] >= permissionLevelOrder[requiredLevel];
}

// Check if user is in Global Admin group
export function isGlobalAdmin(permissions: UserPermissions | null): boolean {
  if (!permissions) return false;
  return permissions.groups.includes('Global Admin');
}

// Middleware: require module access
export const requireModuleAccess = (moduleKey: string): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // First check old-style admin role for backward compatibility
      const { storage } = await import('./storage');
      const dbUser = await storage.getUser(req.user.claims.sub);
      
      if (dbUser?.role === 'admin') {
        return next(); // Admins bypass RBAC for now
      }

      const permissions = await getUserPermissions(req);
      
      if (isGlobalAdmin(permissions)) {
        return next();
      }

      if (hasModuleAccess(permissions, moduleKey)) {
        return next();
      }

      return res.status(403).json({ 
        message: `Access denied. You don't have access to the ${moduleKey} module.` 
      });
    } catch (error) {
      console.error('Error checking module access:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware: require feature permission
export const requireFeaturePermission = (
  moduleKey: string, 
  featureKey: string, 
  requiredLevel: PermissionLevel
): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // First check old-style admin role for backward compatibility
      const { storage } = await import('./storage');
      const dbUser = await storage.getUser(req.user.claims.sub);
      
      if (dbUser?.role === 'admin') {
        return next(); // Admins bypass RBAC for now
      }

      const permissions = await getUserPermissions(req);
      
      if (isGlobalAdmin(permissions)) {
        return next();
      }

      if (hasFeaturePermission(permissions, moduleKey, featureKey, requiredLevel)) {
        return next();
      }

      return res.status(403).json({ 
        message: `Access denied. You need ${requiredLevel} permission for ${featureKey}.` 
      });
    } catch (error) {
      console.error('Error checking feature permission:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// API endpoint handlers for RBAC management
export async function getAllUserGroups(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      ug.*,
      (SELECT COUNT(*) FROM group_memberships gm WHERE gm.group_id = ug.id) as member_count
    FROM user_groups ug
    WHERE ug.active = true
    ORDER BY ug.sort_order, ug.name
  `);
  return result.rows;
}

export async function getGroupWithPermissions(groupId: string): Promise<any> {
  const groupResult = await db.execute(sql`
    SELECT * FROM user_groups WHERE id = ${groupId}
  `);
  
  if (groupResult.rows.length === 0) {
    return null;
  }

  const group = groupResult.rows[0];

  // Get module access with camelCase aliases for frontend
  const moduleAccessResult = await db.execute(sql`
    SELECT 
      pm.id as "moduleId",
      pm.module_key as "moduleKey",
      pm.module_name as "moduleName",
      COALESCE(gma.has_access, false) as "hasAccess"
    FROM platform_modules pm
    LEFT JOIN group_module_access gma ON pm.id = gma.module_id AND gma.group_id = ${groupId}
    ORDER BY pm.sort_order
  `);

  // Get feature permissions by module with camelCase aliases for frontend
  const featurePermsResult = await db.execute(sql`
    SELECT 
      mf.id as "featureId",
      mf.module_id as "moduleId",
      mf.feature_key as "featureKey",
      mf.feature_name as "featureName",
      COALESCE(gfp.permission_level, 'none') as "permissionLevel"
    FROM module_features mf
    LEFT JOIN group_feature_permissions gfp ON mf.id = gfp.feature_id AND gfp.group_id = ${groupId}
    WHERE mf.active = true
    ORDER BY mf.sort_order
  `);

  return {
    ...group,
    moduleAccess: moduleAccessResult.rows,
    featurePermissions: featurePermsResult.rows
  };
}

export async function updateGroupModuleAccess(
  groupId: string, 
  moduleId: string, 
  hasAccess: boolean
): Promise<void> {
  await db.execute(sql`
    INSERT INTO group_module_access (group_id, module_id, has_access, updated_at)
    VALUES (${groupId}, ${moduleId}, ${hasAccess}, NOW())
    ON CONFLICT (group_id, module_id) 
    DO UPDATE SET has_access = ${hasAccess}, updated_at = NOW()
  `);
}

export async function updateGroupFeaturePermission(
  groupId: string, 
  featureId: string, 
  permissionLevel: PermissionLevel
): Promise<void> {
  await db.execute(sql`
    INSERT INTO group_feature_permissions (group_id, feature_id, permission_level, updated_at)
    VALUES (${groupId}, ${featureId}, ${permissionLevel}::permission_level, NOW())
    ON CONFLICT (group_id, feature_id) 
    DO UPDATE SET permission_level = ${permissionLevel}::permission_level, updated_at = NOW()
  `);
}

export async function getGroupMembers(groupId: string): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      pu.id,
      pu.email,
      pu.first_name,
      pu.last_name,
      pu.global_role,
      gm.assigned_at
    FROM platform_users pu
    INNER JOIN group_memberships gm ON pu.id = gm.user_id
    WHERE gm.group_id = ${groupId}
    ORDER BY pu.last_name, pu.first_name
  `);
  return result.rows;
}

export async function addUserToGroup(userId: string, groupId: string, assignedBy?: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO group_memberships (user_id, group_id, assigned_by)
    VALUES (${userId}, ${groupId}, ${assignedBy || null})
    ON CONFLICT (user_id, group_id) DO NOTHING
  `);
}

export async function removeUserFromGroup(userId: string, groupId: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM group_memberships 
    WHERE user_id = ${userId} AND group_id = ${groupId}
  `);
}

export async function getUserGroupMemberships(userId: string): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      ug.id,
      ug.name,
      ug.description,
      ug.color,
      gm.assigned_at
    FROM user_groups ug
    INNER JOIN group_memberships gm ON ug.id = gm.group_id
    WHERE gm.user_id = ${userId} AND ug.active = true
    ORDER BY ug.sort_order
  `);
  return result.rows;
}

export async function createUserGroup(data: {
  name: string;
  description?: string;
  color?: string;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO user_groups (name, description, color)
    VALUES (${data.name}, ${data.description || null}, ${data.color || null})
    RETURNING *
  `);
  
  const newGroup = result.rows[0] as any;
  
  // Auto-generate security entries for all modules and features
  const modulesCreated = await syncModulesForNewGroup(newGroup.id, false);
  const featuresCreated = await syncFeaturesForNewGroup(newGroup.id, false);
  
  console.log(`[RBAC] Created group "${data.name}" with ${modulesCreated} module access entries, ${featuresCreated} feature permission entries`);
  
  return newGroup;
}

export async function updateUserGroup(groupId: string, data: {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}): Promise<any> {
  const result = await db.execute(sql`
    UPDATE user_groups
    SET 
      name = COALESCE(${data.name || null}, name),
      description = COALESCE(${data.description || null}, description),
      color = COALESCE(${data.color || null}, color),
      sort_order = COALESCE(${data.sortOrder ?? null}, sort_order),
      updated_at = NOW()
    WHERE id = ${groupId}
    RETURNING *
  `);
  return result.rows[0];
}

export async function deleteUserGroup(groupId: string): Promise<boolean> {
  // Check if it's a system group
  const groupResult = await db.execute(sql`
    SELECT is_system_group FROM user_groups WHERE id = ${groupId}
  `);
  
  if (groupResult.rows.length === 0) {
    return false;
  }
  
  if ((groupResult.rows[0] as any).is_system_group) {
    throw new Error('Cannot delete system groups');
  }

  // Soft delete by setting active = false
  await db.execute(sql`
    UPDATE user_groups SET active = false, updated_at = NOW()
    WHERE id = ${groupId}
  `);
  
  return true;
}

// Get all platform users with their group memberships
export async function getAllPlatformUsers(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      pu.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ug.id,
            'name', ug.name,
            'color', ug.color
          )
        ) FILTER (WHERE ug.id IS NOT NULL),
        '[]'
      ) as groups
    FROM platform_users pu
    LEFT JOIN group_memberships gm ON pu.id = gm.user_id
    LEFT JOIN user_groups ug ON gm.group_id = ug.id AND ug.active = true
    WHERE pu.active = true
    GROUP BY pu.id
    ORDER BY pu.last_name, pu.first_name
  `);
  return result.rows;
}

// =====================================
// AUTO-SYNC SECURITY ENTRIES
// =====================================

/**
 * Sync module access entries for a specific module across all groups.
 * Creates missing group_module_access entries with has_access = false by default.
 * Global Admin group gets has_access = true automatically.
 */
export async function syncModuleAccessForAllGroups(moduleId: string): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO group_module_access (group_id, module_id, has_access)
    SELECT 
      ug.id as group_id,
      ${moduleId} as module_id,
      CASE WHEN ug.name = 'Global Admin' THEN true ELSE false END as has_access
    FROM user_groups ug
    WHERE ug.active = true
      AND NOT EXISTS (
        SELECT 1 FROM group_module_access gma 
        WHERE gma.group_id = ug.id AND gma.module_id = ${moduleId}
      )
    RETURNING *
  `);
  return result.rows.length;
}

/**
 * Sync feature permission entries for a specific feature across all groups.
 * Creates missing group_feature_permissions entries with permission_level = 'none' by default.
 * Global Admin group gets permission_level = 'admin' automatically.
 */
export async function syncFeaturePermissionsForAllGroups(featureId: string): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO group_feature_permissions (group_id, feature_id, permission_level)
    SELECT 
      ug.id as group_id,
      ${featureId} as feature_id,
      CASE WHEN ug.name = 'Global Admin' THEN 'admin'::permission_level ELSE 'none'::permission_level END as permission_level
    FROM user_groups ug
    WHERE ug.active = true
      AND NOT EXISTS (
        SELECT 1 FROM group_feature_permissions gfp 
        WHERE gfp.group_id = ug.id AND gfp.feature_id = ${featureId}
      )
    RETURNING *
  `);
  return result.rows.length;
}

/**
 * Sync all module access entries for a new group.
 * Creates group_module_access entries for all modules.
 */
export async function syncModulesForNewGroup(groupId: string, isGlobalAdmin: boolean = false): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO group_module_access (group_id, module_id, has_access)
    SELECT 
      ${groupId} as group_id,
      pm.id as module_id,
      ${isGlobalAdmin} as has_access
    FROM platform_modules pm
    WHERE NOT EXISTS (
      SELECT 1 FROM group_module_access gma 
      WHERE gma.group_id = ${groupId} AND gma.module_id = pm.id
    )
    RETURNING *
  `);
  return result.rows.length;
}

/**
 * Sync all feature permissions for a new group.
 * Creates group_feature_permissions entries for all active features.
 */
export async function syncFeaturesForNewGroup(groupId: string, isGlobalAdmin: boolean = false): Promise<number> {
  const defaultLevel = isGlobalAdmin ? 'admin' : 'none';
  const result = await db.execute(sql`
    INSERT INTO group_feature_permissions (group_id, feature_id, permission_level)
    SELECT 
      ${groupId} as group_id,
      mf.id as feature_id,
      ${defaultLevel}::permission_level as permission_level
    FROM module_features mf
    WHERE mf.active = true
      AND NOT EXISTS (
        SELECT 1 FROM group_feature_permissions gfp 
        WHERE gfp.group_id = ${groupId} AND gfp.feature_id = mf.id
      )
    RETURNING *
  `);
  return result.rows.length;
}

/**
 * Comprehensive sync of all security entries.
 * Ensures every active group has entries for every module and feature.
 * Called after adding new modules, features, or groups.
 */
export async function syncAllSecurityEntries(): Promise<{
  moduleAccessCreated: number;
  featurePermissionsCreated: number;
}> {
  // Sync module access: create missing entries for all group/module combinations
  const moduleAccessResult = await db.execute(sql`
    INSERT INTO group_module_access (group_id, module_id, has_access)
    SELECT 
      ug.id as group_id,
      pm.id as module_id,
      CASE WHEN ug.name = 'Global Admin' THEN true ELSE false END as has_access
    FROM user_groups ug
    CROSS JOIN platform_modules pm
    WHERE ug.active = true
      AND NOT EXISTS (
        SELECT 1 FROM group_module_access gma 
        WHERE gma.group_id = ug.id AND gma.module_id = pm.id
      )
    RETURNING *
  `);

  // Sync feature permissions: create missing entries for all group/feature combinations
  const featurePermsResult = await db.execute(sql`
    INSERT INTO group_feature_permissions (group_id, feature_id, permission_level)
    SELECT 
      ug.id as group_id,
      mf.id as feature_id,
      CASE WHEN ug.name = 'Global Admin' THEN 'admin'::permission_level ELSE 'none'::permission_level END as permission_level
    FROM user_groups ug
    CROSS JOIN module_features mf
    WHERE ug.active = true
      AND mf.active = true
      AND NOT EXISTS (
        SELECT 1 FROM group_feature_permissions gfp 
        WHERE gfp.group_id = ug.id AND gfp.feature_id = mf.id
      )
    RETURNING *
  `);

  return {
    moduleAccessCreated: moduleAccessResult.rows.length,
    featurePermissionsCreated: featurePermsResult.rows.length
  };
}

/**
 * Add a new module and automatically generate security entries for all groups.
 */
export async function addModuleWithSecurity(moduleData: {
  moduleKey: string;
  moduleName: string;
  description?: string;
  icon?: string;
  color?: string;
  routePrefix?: string;
  status?: string;
}): Promise<any> {
  // Insert the new module
  const moduleResult = await db.execute(sql`
    INSERT INTO platform_modules (
      module_key, module_name, description, icon, color, route_prefix, status, sort_order
    )
    VALUES (
      ${moduleData.moduleKey},
      ${moduleData.moduleName},
      ${moduleData.description || null},
      ${moduleData.icon || 'FileText'},
      ${moduleData.color || 'bg-gray-500'},
      ${moduleData.routePrefix || `/${moduleData.moduleKey}`},
      ${moduleData.status || 'planning'},
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM platform_modules)
    )
    RETURNING *
  `);

  const newModule = moduleResult.rows[0] as any;

  // Auto-generate security entries for all groups
  await syncModuleAccessForAllGroups(newModule.id);

  console.log(`[RBAC] Created module "${moduleData.moduleName}" with auto-generated security entries`);

  return newModule;
}

/**
 * Add a new feature and automatically generate security entries for all groups.
 */
export async function addFeatureWithSecurity(featureData: {
  moduleId: string;
  featureKey: string;
  featureName: string;
  description?: string;
}): Promise<any> {
  // Insert the new feature
  const featureResult = await db.execute(sql`
    INSERT INTO module_features (
      module_id, feature_key, feature_name, description, sort_order
    )
    VALUES (
      ${featureData.moduleId},
      ${featureData.featureKey},
      ${featureData.featureName},
      ${featureData.description || null},
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM module_features WHERE module_id = ${featureData.moduleId})
    )
    RETURNING *
  `);

  const newFeature = featureResult.rows[0] as any;

  // Auto-generate security entries for all groups
  await syncFeaturePermissionsForAllGroups(newFeature.id);

  console.log(`[RBAC] Created feature "${featureData.featureName}" with auto-generated security entries`);

  return newFeature;
}

/**
 * Get sync status showing any modules/features without complete security entries.
 */
export async function getSecuritySyncStatus(): Promise<{
  totalModules: number;
  totalFeatures: number;
  totalGroups: number;
  missingModuleAccess: number;
  missingFeaturePermissions: number;
  needsSync: boolean;
}> {
  const statsResult = await db.execute(sql`
    WITH stats AS (
      SELECT 
        (SELECT COUNT(*) FROM platform_modules) as total_modules,
        (SELECT COUNT(*) FROM module_features WHERE active = true) as total_features,
        (SELECT COUNT(*) FROM user_groups WHERE active = true) as total_groups,
        (SELECT COUNT(*) FROM group_module_access) as current_module_access,
        (SELECT COUNT(*) FROM group_feature_permissions) as current_feature_perms
    )
    SELECT 
      total_modules,
      total_features,
      total_groups,
      (total_modules * total_groups) - current_module_access as missing_module_access,
      (total_features * total_groups) - current_feature_perms as missing_feature_permissions
    FROM stats
  `);

  const stats = statsResult.rows[0] as any;

  return {
    totalModules: parseInt(stats.total_modules),
    totalFeatures: parseInt(stats.total_features),
    totalGroups: parseInt(stats.total_groups),
    missingModuleAccess: parseInt(stats.missing_module_access),
    missingFeaturePermissions: parseInt(stats.missing_feature_permissions),
    needsSync: parseInt(stats.missing_module_access) > 0 || parseInt(stats.missing_feature_permissions) > 0
  };
}

/**
 * Get all platform modules for sync export
 */
export async function getAllPlatformModules(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM platform_modules ORDER BY sort_order, module_name
  `);
  return result.rows;
}

/**
 * Get all module features for sync export
 */
export async function getAllModuleFeatures(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM module_features ORDER BY module_id, sort_order, feature_name
  `);
  return result.rows;
}

/**
 * Get all group module access entries for sync export
 */
export async function getAllGroupModuleAccess(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      gma.id,
      gma.group_id as "groupId",
      gma.module_id as "moduleId",
      gma.has_access as "hasAccess",
      gma.created_at as "createdAt",
      gma.updated_at as "updatedAt"
    FROM group_module_access gma
  `);
  return result.rows;
}

/**
 * Get all group feature permissions for sync export
 */
export async function getAllGroupFeaturePermissions(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      gfp.id,
      gfp.group_id as "groupId",
      gfp.feature_id as "featureId",
      gfp.permission_level as "permissionLevel",
      gfp.created_at as "createdAt",
      gfp.updated_at as "updatedAt"
    FROM group_feature_permissions gfp
  `);
  return result.rows;
}

/**
 * Upsert a platform user by email (for sync import)
 */
export async function upsertPlatformUserByEmail(data: {
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  globalRole?: string;
  isActive?: boolean;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO platform_users (email, first_name, last_name, global_role, active)
    VALUES (${data.email}, ${data.firstName || null}, ${data.lastName || null}, ${data.globalRole || 'staff'}, ${data.isActive !== false})
    ON CONFLICT (email) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, platform_users.first_name),
      last_name = COALESCE(EXCLUDED.last_name, platform_users.last_name),
      global_role = EXCLUDED.global_role,
      active = EXCLUDED.active,
      updated_at = NOW()
    RETURNING *
  `);
  return result.rows[0];
}

/**
 * Upsert a user group by name (for sync import)
 */
export async function upsertUserGroupByName(data: {
  name: string;
  description?: string | null;
  color?: string | null;
  isSystem?: boolean;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO user_groups (name, description, color, is_system_group)
    VALUES (${data.name}, ${data.description || null}, ${data.color || '#6366f1'}, ${data.isSystem || false})
    ON CONFLICT (name) DO UPDATE SET
      description = COALESCE(EXCLUDED.description, user_groups.description),
      color = COALESCE(EXCLUDED.color, user_groups.color),
      updated_at = NOW()
    RETURNING *
  `);
  return result.rows[0];
}

/**
 * Upsert a platform module by key (for sync import)
 */
export async function upsertPlatformModuleByKey(data: {
  moduleKey: string;
  moduleName: string;
  description?: string | null;
  icon?: string | null;
  route?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  progress?: string | null;
  notes?: string | null;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO platform_modules (module_key, module_name, description, icon, route, sort_order, is_active, progress, notes)
    VALUES (${data.moduleKey}, ${data.moduleName}, ${data.description || null}, ${data.icon || null}, ${data.route || null}, ${data.sortOrder || 0}, ${data.isActive !== false}, ${data.progress || 'not_started'}, ${data.notes || null})
    ON CONFLICT (module_key) DO UPDATE SET
      module_name = EXCLUDED.module_name,
      description = COALESCE(EXCLUDED.description, platform_modules.description),
      icon = COALESCE(EXCLUDED.icon, platform_modules.icon),
      route = COALESCE(EXCLUDED.route, platform_modules.route),
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      progress = COALESCE(EXCLUDED.progress, platform_modules.progress),
      notes = COALESCE(EXCLUDED.notes, platform_modules.notes),
      updated_at = NOW()
    RETURNING *
  `);
  return result.rows[0];
}

/**
 * Upsert a module feature by key (for sync import)
 */
export async function upsertModuleFeatureByKey(moduleId: string, data: {
  featureKey: string;
  featureName: string;
  description?: string | null;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO module_features (module_id, feature_key, feature_name, description)
    VALUES (${moduleId}, ${data.featureKey}, ${data.featureName}, ${data.description || null})
    ON CONFLICT (feature_key) DO UPDATE SET
      module_id = EXCLUDED.module_id,
      feature_name = EXCLUDED.feature_name,
      description = COALESCE(EXCLUDED.description, module_features.description),
      updated_at = NOW()
    RETURNING *
  `);
  return result.rows[0];
}

/**
 * Upsert group module access by group and module (for sync import)
 */
export async function upsertGroupModuleAccessByKeys(groupId: string, moduleId: string, hasAccess: boolean): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO group_module_access (group_id, module_id, has_access)
    VALUES (${groupId}, ${moduleId}, ${hasAccess})
    ON CONFLICT (group_id, module_id) DO UPDATE SET
      has_access = EXCLUDED.has_access,
      updated_at = NOW()
    RETURNING *
  `);
  return result.rows[0];
}

/**
 * Upsert group feature permission by group and feature (for sync import)
 */
export async function upsertGroupFeaturePermissionByKeys(groupId: string, featureId: string, permissionLevel: string): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO group_feature_permissions (group_id, feature_id, permission_level)
    VALUES (${groupId}, ${featureId}, ${permissionLevel})
    ON CONFLICT (group_id, feature_id) DO UPDATE SET
      permission_level = EXCLUDED.permission_level,
      updated_at = NOW()
    RETURNING *
  `);
  return result.rows[0];
}

/**
 * Get group ID by name (for sync import FK resolution)
 */
export async function getGroupIdByName(name: string): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT id FROM user_groups WHERE LOWER(name) = LOWER(${name})
  `);
  const row = result.rows[0] as { id: string } | undefined;
  return row?.id || null;
}

/**
 * Get module ID by key (for sync import FK resolution)
 */
export async function getModuleIdByKey(moduleKey: string): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT id FROM platform_modules WHERE LOWER(module_key) = LOWER(${moduleKey})
  `);
  const row = result.rows[0] as { id: string } | undefined;
  return row?.id || null;
}

/**
 * Get feature ID by key (for sync import FK resolution)
 */
export async function getFeatureIdByKey(featureKey: string): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT id FROM module_features WHERE LOWER(feature_key) = LOWER(${featureKey})
  `);
  const row = result.rows[0] as { id: string } | undefined;
  return row?.id || null;
}
