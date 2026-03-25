// This script needs to be run with DATABASE_URL from Render
// Run it directly on the Render shell or set the environment variable

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { platformUsers } from './server/db/schema.ts';
import { eq } from 'drizzle-orm';

async function fixAdminAccess() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    console.log('Please run this with: DATABASE_URL="your-render-db-url" npx tsx fix-admin-render.ts');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    const client = postgres(databaseUrl);
    const db = drizzle(client);
    
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
        const userModules = await client`SELECT * FROM user_modules LIMIT 1`;
        console.log('Found user_modules table');
        
        // Grant access to all modules
        await client`
          INSERT INTO user_modules (user_id, module_key, granted_by, granted_at)
          SELECT ${latestUser.id}, module_key, 'system', NOW()
          FROM modules
          WHERE active = true
          ON CONFLICT (user_id, module_key) DO NOTHING
        `;
        
        console.log('✅ Granted access to all modules!');
        
      } catch (err) {
        console.log('user_modules table not found, checking for user_permissions...');
        
        try {
          const userPerms = await client`SELECT * FROM user_permissions LIMIT 1`;
          console.log('Found user_permissions table');
          
          // Grant all permissions
          await client`
            INSERT INTO user_permissions (user_id, permission_type, resource_key, granted_by, granted_at)
            SELECT ${latestUser.id}, 'module_access', module_key, 'system', NOW()
            FROM modules
            WHERE active = true
            ON CONFLICT (user_id, permission_type, resource_key) DO NOTHING
          `;
          
          console.log('✅ Granted all module permissions!');
          
        } catch (permErr) {
          console.log('No permissions table found - role-based access should be sufficient');
        }
      }
      
      // Verify the update
      const updatedUser = await db.select().from(platformUsers).where(eq(platformUsers.id, latestUser.id)).limit(1);
      console.log(`\n🎯 Final verification:`);
      console.log(`Email: ${updatedUser[0].email}`);
      console.log(`Role: ${updatedUser[0].globalRole}`);
      console.log(`User ID: ${updatedUser[0].id}`);
      
      return updatedUser[0];
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

fixAdminAccess();
