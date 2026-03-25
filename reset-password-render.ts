// Run this on Render with: DATABASE_URL="your-render-db-url" npx tsx reset-password-render.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcrypt';

async function resetPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    console.log('Run with: DATABASE_URL="your-render-db-url" npx tsx reset-password-render.ts');
    process.exit(1);
  }

  try {
    const client = postgres(databaseUrl);
    const db = drizzle(client);
    
    const email = 'email@nashobawinery.com';
    const newPassword = 'TempPass123!';
    
    console.log(`[Password Reset] Starting password reset for ${email}`);
    
    // Generate bcrypt hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`[Password Reset] Generated hash: ${passwordHash}`);
    
    // Update user password
    const result = await client`
      UPDATE platform_users 
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE email = ${email}
    `;
    
    console.log(`[Password Reset] Update completed. Rows affected: ${result.count}`);
    
    // Verify the update
    const [updatedUser] = await client`
      SELECT id, email, global_role, password_hash, updated_at
      FROM platform_users 
      WHERE email = ${email}
    `;
    
    if (updatedUser) {
      console.log(`[Password Reset] Verification successful:`);
      console.log(`  - Email: ${updatedUser.email}`);
      console.log(`  - User ID: ${updatedUser.id}`);
      console.log(`  - Global Role: ${updatedUser.global_role}`);
      console.log(`  - Password Hash Present: ${!!updatedUser.password_hash}`);
      console.log(`  - Updated At: ${updatedUser.updated_at}`);
    }
    
    console.log(`[Password Reset] ✅ Password reset completed successfully!`);
    console.log(`[Password Reset] New password: ${newPassword}`);
    
  } catch (error) {
    console.error('[Password Reset] Error:', error);
  } finally {
    process.exit(0);
  }
}

resetPassword();
