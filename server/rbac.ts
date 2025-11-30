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

    // Get module access for all user's groups
    const moduleAccessResult = await db.execute(sql`
      SELECT 
        pm.module_key,
        bool_or(gma.has_access) as has_access
      FROM group_module_access gma
      INNER JOIN platform_modules pm ON gma.module_id = pm.id
      WHERE gma.group_id = ANY(${groupIds}::text[])
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
      WHERE gfp.group_id = ANY(${groupIds}::text[])
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

  // Get module access
  const moduleAccessResult = await db.execute(sql`
    SELECT 
      pm.id as module_id,
      pm.module_key,
      pm.module_name,
      COALESCE(gma.has_access, false) as has_access
    FROM platform_modules pm
    LEFT JOIN group_module_access gma ON pm.id = gma.module_id AND gma.group_id = ${groupId}
    ORDER BY pm.sort_order
  `);

  // Get feature permissions by module
  const featurePermsResult = await db.execute(sql`
    SELECT 
      mf.id as feature_id,
      mf.module_id,
      mf.feature_key,
      mf.feature_name,
      COALESCE(gfp.permission_level, 'none') as permission_level
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
  return result.rows[0];
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
