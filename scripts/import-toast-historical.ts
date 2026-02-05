import { db } from "../server/db";
import { rccToastHistoricalRevenue } from "../shared/schema";
import { readFileSync } from "fs";

async function importToastHistoricalData() {
  console.log("Importing Toast historical revenue data...");
  
  const fileContent = readFileSync("attached_assets/Pasted-Daily-Net-Revenue-Net-Sales-Report-Past-365-Days-Locati_1770296469040.txt", "utf-8");
  const lines = fileContent.split("\n");
  
  const dataLines = lines.slice(7); // Skip header lines
  const records: { date: string; netRevenue: string }[] = [];
  
  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Parse lines like "2026-02-04\t$699" or "2026-02-04\t$79.40"
    const parts = trimmed.split("\t");
    if (parts.length >= 2) {
      const date = parts[0].trim();
      const revenue = parts[1].trim();
      
      // Validate date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        records.push({ date, netRevenue: revenue });
      }
    }
  }
  
  console.log(`Parsed ${records.length} records`);
  
  let imported = 0;
  for (const item of records) {
    const dateObj = new Date(item.date);
    const dayOfWeek = dateObj.getDay();
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const weekOfYear = Math.ceil((((dateObj.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
    const year = dateObj.getFullYear();
    const netRevenue = item.netRevenue.replace(/[$,]/g, '');
    
    try {
      await db.insert(rccToastHistoricalRevenue)
        .values({
          revenueDate: item.date,
          netRevenue,
          dayOfWeek,
          weekOfYear,
          year,
        })
        .onConflictDoUpdate({
          target: rccToastHistoricalRevenue.revenueDate,
          set: { netRevenue, dayOfWeek, weekOfYear, year },
        });
      imported++;
    } catch (error) {
      console.error(`Error importing ${item.date}:`, error);
    }
  }
  
  console.log(`Successfully imported ${imported} records`);
  process.exit(0);
}

importToastHistoricalData().catch(console.error);
