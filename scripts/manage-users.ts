import { config } from "dotenv";
config({ path: ".env" });

// Set DATABASE_URL before importing db
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env file");
  process.exit(1);
}

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// Set up database connection
neonConfig.webSocketConstructor = ws;
const rawUrl = process.env.DATABASE_URL;
const databaseUrl = rawUrl.startsWith("postgresql://")
  ? rawUrl.replace("postgresql://", "postgres://")
  : rawUrl;
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool, schema });

// Helper function to create/update users with passwords
async function createPlatformUser(userData: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  globalRole?: "super_admin" | "admin" | "manager" | "staff" | "viewer";
  department?: string;
  jobTitle?: string;
}) {
  const passwordHash = await bcrypt.hash(userData.password, 10);
  
  const [user] = await db
    .insert(schema.platformUsers)
    .values({
      ...userData,
      email: userData.email.toLowerCase(),
      passwordHash,
      globalRole: userData.globalRole || "staff",
    })
    .onConflictDoUpdate({
      target: schema.platformUsers.email,
      set: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        globalRole: userData.globalRole || "staff",
        department: userData.department,
        jobTitle: userData.jobTitle,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

async function createStaffMember() {
  const args = process.argv.slice(3); // Skip "create" command
  
  if (args.length < 4) {
    console.log("Usage: npm run manage-users create <email> <firstName> <lastName> <password> [role] [department] [jobTitle]");
    console.log("Roles: super_admin, admin, manager, staff, viewer (default: staff)");
    process.exit(1);
  }

  const [email, firstName, lastName, password, role = "staff", department, jobTitle] = args;

  try {
    const user = await createPlatformUser({
      email,
      firstName,
      lastName,
      password,
      globalRole: role as any,
      department,
      jobTitle,
    });

    console.log(`✅ Created/updated user: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.globalRole}`);
    console.log(`   Department: ${user.department || 'Not set'}`);
    console.log(`   Job Title: ${user.jobTitle || 'Not set'}`);
    console.log(`   User ID: ${user.id}`);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    process.exit(1);
  }
}

async function listUsers() {
  try {
    const users = await db.select().from(schema.platformUsers).orderBy(schema.platformUsers.lastName, schema.platformUsers.firstName);
    
    console.log("\n📋 Platform Users:");
    console.log("─".repeat(80));
    console.log("Email".padEnd(30) + "Name".padEnd(25) + "Role".padEnd(15) + "Department");
    console.log("─".repeat(80));
    
    for (const user of users) {
      console.log(
        user.email.padEnd(30) +
        `${user.firstName} ${user.lastName}`.padEnd(25) +
        user.globalRole.padEnd(15) +
        (user.department || "-")
      );
    }
    console.log("─".repeat(80));
    console.log(`Total: ${users.length} users\n`);
  } catch (error) {
    console.error("❌ Error listing users:", error);
    process.exit(1);
  }
}

async function deleteUser(email: string) {
  try {
    const result = await db.delete(schema.platformUsers).where(eq(schema.platformUsers.email, email.toLowerCase()));
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ Deleted user: ${email}`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    process.exit(1);
  }
}

// Main script logic
const command = process.argv[2];

switch (command) {
  case "create":
    createStaffMember();
    break;
  case "list":
    listUsers();
    break;
  case "delete":
    if (!process.argv[3]) {
      console.log("Usage: npm run manage-users delete <email>");
      process.exit(1);
    }
    deleteUser(process.argv[3]);
    break;
  default:
    console.log("Available commands:");
    console.log("  npm run manage-users create <email> <firstName> <lastName> <password> [role] [department] [jobTitle]");
    console.log("  npm run manage-users list");
    console.log("  npm run manage-users delete <email>");
    process.exit(1);
}
