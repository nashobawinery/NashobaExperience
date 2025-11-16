import { db } from "./db";
import { storage } from "./storage";
import { migrateProductImages } from "./migrate-product-images";

async function main() {
  console.log("Running product image migration...\n");
  
  const results = await migrateProductImages(storage, {
    dryRun: false,
    skipExisting: true
  });
  
  console.log("\n✅ Migration complete!");
  console.log(`Total products: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Total images migrated: ${results.reduce((sum, r) => sum + r.imagesMigrated, 0)}`);
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
