import { db } from './server/db';
import { platformUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function findAndUpdateUser() {
  try {
    // Find the most recently logged in user
    const users = await db.select().from(platformUsers).orderBy(platformUsers.lastLogin.desc()).limit(5);
    
    console.log('Recent users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Role: ${user.globalRole}, ID: ${user.id}, Last Login: ${user.lastLogin}`);
    });
    
    if (users.length > 0) {
      const latestUser = users[0];
      
      // Update to super_admin
      await db.update(platformUsers)
        .set({ 
          globalRole: 'super_admin',
          updatedAt: new Date()
        })
        .where(eq(platformUsers.id, latestUser.id));
      
      console.log(`\n✅ Updated user ${latestUser.email} to super_admin role!`);
      
      // Check for user_modules table
      try {
        const userModules = await db.execute(`SELECT * FROM user_modules LIMIT 1`);
        console.log('Found user_modules table');
        
        // Grant access to all modules
        await db.execute(`
          INSERT INTO user_modules (user_id, module_key, granted_by, granted_at)
          SELECT '${latestUser.id}', module_key, 'system', NOW()
          FROM modules
          WHERE active = true
          ON CONFLICT (user_id, module_key) DO NOTHING
        `);
        
        console.log('✅ Granted access to all modules!');
        
      } catch (err) {
        console.log('user_modules table not found, checking for user_permissions...');
        
        try {
          const userPerms = await db.execute(`SELECT * FROM user_permissions LIMIT 1`);
          console.log('Found user_permissions table');
          
          // Grant all permissions
          await db.execute(`
            INSERT INTO user_permissions (user_id, permission_type, resource_key, granted_by, granted_at)
            SELECT '${latestUser.id}', 'module_access', module_key, 'system', NOW()
            FROM modules
            WHERE active = true
            ON CONFLICT (user_id, permission_type, resource_key) DO NOTHING
          `);
          
          console.log('✅ Granted all module permissions!');
          
        } catch (permErr) {
          console.log('No permissions table found - role-based access should be sufficient');
        }
      }
      
      return latestUser;
    } else {
      console.log('No users found in database');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

findAndUpdateUser();
