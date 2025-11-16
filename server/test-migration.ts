import { storage } from "./storage";
import { migrateProductImages } from "./migrate-product-images";

async function testMigration() {
  console.log("=== Testing Product Image Migration ===\n");

  // Get a few products with images
  const allProducts = await storage.getProducts();
  const productsWithImages = allProducts.filter(
    p => p.imageUrl || p.labelImageUrl
  ).slice(0, 3);

  console.log(`Found ${productsWithImages.length} products with images to test:\n`);
  productsWithImages.forEach(p => {
    console.log(`- ${p.name}`);
    if (p.imageUrl) console.log(`  Primary: ${p.imageUrl}`);
    if (p.labelImageUrl) console.log(`  Label: ${p.labelImageUrl}`);
  });

  console.log("\n=== Running DRY RUN ===\n");
  
  const dryRunResults = await migrateProductImages(storage, {
    dryRun: true,
    productIds: productsWithImages.map(p => p.id),
    skipExisting: true,
  });

  console.log("\n=== Dry Run Results ===");
  dryRunResults.forEach(result => {
    console.log(`\n${result.productName}:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Images to migrate: ${result.imagesMigrated}`);
    if (result.errors.length > 0) {
      console.log(`  Errors:`, result.errors);
    }
  });

  console.log("\n=== Test Complete ===");
  process.exit(0);
}

testMigration().catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});
