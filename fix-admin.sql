-- Find and update the most recently logged in user to super_admin
-- Run this SQL script directly in your Render database console

-- First, let's see recent users
SELECT id, email, global_role, last_login, created_at 
FROM platform_users 
ORDER BY last_login DESC 
LIMIT 5;

-- Update the most recently logged in user to super_admin
UPDATE platform_users 
SET global_role = 'super_admin', updated_at = NOW() 
WHERE id = (
    SELECT id FROM platform_users 
    ORDER BY last_login DESC 
    LIMIT 1
);

-- Verify the update
SELECT id, email, global_role, last_login, updated_at 
FROM platform_users 
WHERE id = (
    SELECT id FROM platform_users 
    ORDER BY last_login DESC 
    LIMIT 1
);

-- Check if user_modules table exists and grant access to all modules
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_modules') THEN
        -- Grant access to all modules
        INSERT INTO user_modules (user_id, module_key, granted_by, granted_at)
        SELECT id, module_key, 'system', NOW()
        FROM platform_users, modules
        WHERE platform_users.id = (
            SELECT id FROM platform_users 
            ORDER BY last_login DESC 
            LIMIT 1
        ) AND modules.active = true
        ON CONFLICT (user_id, module_key) DO NOTHING;
        
        RAISE NOTICE '✅ Granted access to all modules via user_modules table';
    ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
        -- Grant permissions via user_permissions table
        INSERT INTO user_permissions (user_id, permission_type, resource_key, granted_by, granted_at)
        SELECT id, 'module_access', module_key, 'system', NOW()
        FROM platform_users, modules
        WHERE platform_users.id = (
            SELECT id FROM platform_users 
            ORDER BY last_login DESC 
            LIMIT 1
        ) AND modules.active = true
        ON CONFLICT (user_id, permission_type, resource_key) DO NOTHING;
        
        RAISE NOTICE '✅ Granted all module permissions via user_permissions table';
    ELSE
        RAISE NOTICE 'No permissions tables found - role-based access should be sufficient';
    END IF;
END $$;

-- Show final result
SELECT 
    u.id, 
    u.email, 
    u.global_role,
    u.last_login,
    COUNT(um.module_key) as module_count
FROM platform_users u
LEFT JOIN user_modules um ON u.id = um.user_id
WHERE u.id = (
    SELECT id FROM platform_users 
    ORDER BY last_login DESC 
    LIMIT 1
)
GROUP BY u.id, u.email, u.global_role, u.last_login;
