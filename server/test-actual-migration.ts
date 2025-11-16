import { storage } from "./storage";
import { migrateProductImages } from "./migrate-product-images";

async function testActualMigration() {
  console.log("=== Testing Actual Product Image Migration ===\n");

  // Get Baldwin Apple Wine which has a valid image URL
  const targetProductId = "642c95dc-a3de-456d-8011-4ce0b9c4f14e";
  
  console.log("Migrating product: Baldwin Apple Wine");
  console.log("Product ID:", targetProductId);

  const results = await migrateProductImages(storage, {
    dryRun: false,
    productIds: [targetProductId],
    skipExisting: true,
  });

  console.log("\n=== Migration Results ===");
  results.forEach(result => {
    console.log(`\n${result.productName}:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Images migrated: ${result.imagesMigrated}`);
    if (result.errors.length > 0) {
      console.log(`  Errors:`, result.errors);
    }
  });

  if (results[0].success && results[0].imagesMigrated > 0) {
    console.log("\n=== Verifying Migration ===");
    const productMedia = await storage.getProductMedia(targetProductId);
    console.log(`\nProduct media records: ${productMedia.length}`);
    productMedia.forEach(pm => {
      console.log(`\nRole: ${pm.role}`);
      console.log(`  Media ID: ${pm.mediaId}`);
      console.log(`  Filename: ${pm.media.filename}`);
      console.log(`  Public URL: ${pm.media.publicUrl}`);
      console.log(`  Object Path: ${pm.media.objectPath}`);
    });
  }

  console.log("\n=== Test Complete ===");
  process.exit(0);
}

testActualMigration().catch(error => {
  console.error("Test failed:", error);
  console.error(error.stack);
  process.exit(1);
});
