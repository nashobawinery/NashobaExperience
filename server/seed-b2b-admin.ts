import bcrypt from 'bcrypt';
import { db } from './db';
import { b2bAdmins } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedB2bAdmin() {
  try {
    // Check if admin already exists
    const [existing] = await db
      .select()
      .from(b2bAdmins)
      .where(eq(b2bAdmins.email, 'admin@nashobawinery.com'));

    if (existing) {
      console.log('✓ B2B admin already exists:', existing.email);
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create the admin
    const [admin] = await db
      .insert(b2bAdmins)
      .values({
        firstName: 'B2B',
        lastName: 'Admin',
        email: 'admin@nashobawinery.com',
        passwordHash,
        active: true,
      })
      .returning();

    console.log('✓ Created B2B admin:');
    console.log('  Email:', admin.email);
    console.log('  Password: admin123');
    console.log('  Name:', admin.firstName, admin.lastName);
  } catch (error) {
    console.error('Error seeding B2B admin:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedB2bAdmin();
