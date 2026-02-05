import { db } from "../server/db";
import { rccTeams, rccWeeks, rccTasks } from "../shared/schema";
import { sql } from "drizzle-orm";

async function seedRcc() {
  console.log("Seeding RCC data...");

  // Check if teams already exist
  const existingTeams = await db.select().from(rccTeams);
  
  if (existingTeams.length > 0) {
    console.log("RCC teams already exist, skipping seed.");
    return;
  }

  // Create teams
  const teams = await db.insert(rccTeams).values([
    { name: "Tasting Room", color: "#8b5cf6" },
    { name: "Kitchen", color: "#f59e0b" },
    { name: "Retail", color: "#10b981" },
    { name: "Marketing", color: "#3b82f6" },
    { name: "Events", color: "#ec4899" },
  ]).returning();
  
  console.log(`Created ${teams.length} teams`);

  // Create current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const [week] = await db.insert(rccWeeks).values({
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
    focusStatement: "Valentine's Day Promotion",
    hookAngle: "Love at First Sip - romantic wine pairings for two",
    weeklyGoal: "Increase weekend traffic by 20% with couples' specials",
    status: "planning",
  }).returning();
  
  console.log(`Created week: ${week.weekStart} to ${week.weekEnd}`);

  // Create sample tasks
  const marketingTeam = teams.find(t => t.name === "Marketing");
  const tastingTeam = teams.find(t => t.name === "Tasting Room");
  
  await db.insert(rccTasks).values([
    { 
      weekId: week.id, 
      title: "Send Valentine's email blast", 
      status: "open",
      teamId: marketingTeam?.id 
    },
    { 
      weekId: week.id, 
      title: "Update Instagram with couples content", 
      status: "open",
      teamId: marketingTeam?.id 
    },
    { 
      weekId: week.id, 
      title: "Train staff on Valentine's specials", 
      status: "open",
      teamId: tastingTeam?.id 
    },
    { 
      title: "Spring release party planning", 
      status: "idea"
    },
    { 
      title: "Partner with local restaurants for cross-promo", 
      status: "idea"
    },
    { 
      title: "Launch wine club referral program", 
      status: "idea"
    },
  ]);
  
  console.log("Created sample tasks and ideas");
  console.log("RCC seed complete!");
}

seedRcc()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
