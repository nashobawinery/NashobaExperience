import { db } from './server/db';
import { platformUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function resetPassword() {
  try {
    const email = 'email@nashobawinery.com';
    const newPassword = 'TempPass123!';
    
    console.log(`[Password Reset] Starting password reset for ${email}`);
    
    // Generate bcrypt hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`[Password Reset] Generated hash: ${passwordHash}`);
    
    // Update user password
    const result = await db
      .update(platformUsers)
      .set({ 
        passwordHash: passwordHash,
        updatedAt: new Date()
      })
      .where(eq(platformUsers.email, email));
    
    console.log(`[Password Reset] Update completed. Rows affected: ${result.rowCount}`);
    
    // Verify the update
    const [updatedUser] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, email));
    
    if (updatedUser) {
      console.log(`[Password Reset] Verification successful:`);
      console.log(`  - Email: ${updatedUser.email}`);
      console.log(`  - User ID: ${updatedUser.id}`);
      console.log(`  - Global Role: ${updatedUser.globalRole}`);
      console.log(`  - Password Hash Present: ${!!updatedUser.passwordHash}`);
      console.log(`  - Updated At: ${updatedUser.updatedAt}`);
    }
    
    console.log(`[Password Reset] ✅ Password reset completed successfully!`);
    console.log(`[Password Reset] New password: ${newPassword}`);
    
  } catch (error) {
    console.error('[Password Reset] Error:', error);
  } finally {
    // Delete this script after running
    try {
      const fs = await import('fs');
      fs.unlinkSync('./reset-password.ts');
      console.log('[Password Reset] Script deleted itself');
    } catch (err) {
      console.log('[Password Reset] Could not delete script:', err);
    }
    process.exit(0);
  }
}

resetPassword();
