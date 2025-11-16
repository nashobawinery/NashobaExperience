import type { InsertMediaLibrary, InsertProductMedia } from "@shared/schema";
import type { IStorage } from "./storage";
import { nanoid } from "nanoid";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";

interface MigrationResult {
  productId: string;
  productName: string;
  success: boolean;
  imagesMigrated: number;
  errors: string[];
}

interface ImageToMigrate {
  url: string;
  role: "primary" | "label" | "lifestyle" | "gallery";
  productId: string;
  productName: string;
}

export async function migrateProductImages(
  storage: IStorage,
  options: {
    dryRun?: boolean;
    productIds?: string[];
    skipExisting?: boolean;
  } = {}
): Promise<MigrationResult[]> {
  const { dryRun = false, productIds, skipExisting = true } = options;
  const results: MigrationResult[] = [];

  console.log("Starting product image migration...");
  console.log(`Dry run: ${dryRun}`);
  console.log(`Skip existing: ${skipExisting}`);

  // Get all products (or specific ones if productIds provided)
  const allProducts = await storage.getProducts();
  const products = productIds
    ? allProducts.filter((p) => productIds.includes(p.id))
    : allProducts;

  console.log(`Found ${products.length} products to process`);

  for (const product of products) {
    const result: MigrationResult = {
      productId: product.id,
      productName: product.name,
      success: true,
      imagesMigrated: 0,
      errors: [],
    };

    try {
      // Collect all images to migrate for this product
      const imagesToMigrate: ImageToMigrate[] = [];

      // Primary image
      if (product.imageUrl) {
        imagesToMigrate.push({
          url: product.imageUrl,
          role: "primary",
          productId: product.id,
          productName: product.name,
        });
      }

      // Label image
      if (product.labelImageUrl) {
        imagesToMigrate.push({
          url: product.labelImageUrl,
          role: "label",
          productId: product.id,
          productName: product.name,
        });
      }

      // Process each image
      for (const image of imagesToMigrate) {
        try {
          // Check if this product already has an image with this role
          if (skipExisting) {
            const existing = await storage.getProductMedia(product.id, image.role);
            if (existing.length > 0) {
              console.log(
                `  Skipping ${image.role} for ${product.name} - already exists`
              );
              continue;
            }
          }

          if (dryRun) {
            console.log(
              `  [DRY RUN] Would migrate ${image.role}: ${image.url}`
            );
            result.imagesMigrated++;
            continue;
          }

          // Download and upload the image
          const mediaLibraryFile = await downloadAndUploadImage(
            image.url,
            image.productName,
            image.role
          );

          // Create media_library record
          const createdMedia = await storage.createMediaLibraryFile(
            mediaLibraryFile
          );

          // Create product_media link
          const productMediaData: InsertProductMedia = {
            productId: product.id,
            mediaId: createdMedia.id,
            role: image.role,
            sortOrder: image.role === "primary" ? 0 : image.role === "label" ? 1 : 2,
          };

          await storage.createProductMedia(productMediaData);

          console.log(
            `  ✓ Migrated ${image.role} for ${product.name}: ${createdMedia.objectPath}`
          );
          result.imagesMigrated++;
        } catch (error) {
          console.error(`  ✗ Error migrating ${image.role}:`, error);
          const errorMsg = `Failed to migrate ${image.role}: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
          result.errors.push(errorMsg);
          result.success = false;
        }
      }
    } catch (error) {
      const errorMsg = `Failed to process product: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`✗ ${errorMsg}`);
      result.errors.push(errorMsg);
      result.success = false;
    }

    results.push(result);
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const totalImagesMigrated = results.reduce(
    (sum, r) => sum + r.imagesMigrated,
    0
  );

  console.log("\n=== Migration Summary ===");
  console.log(`Products processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${results.length - successful}`);
  console.log(`Total images migrated: ${totalImagesMigrated}`);

  if (!dryRun) {
    console.log(
      "\nNote: Legacy imageUrl and labelImageUrl fields have been preserved."
    );
    console.log(
      "You can remove them from the schema once you verify the migration."
    );
  }

  return results;
}

async function downloadAndUploadImage(
  url: string,
  productName: string,
  role: string
): Promise<InsertMediaLibrary> {
  // Fetch the image
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  // Extract filename from URL or generate one
  const urlParts = url.split("/");
  const originalFilename = urlParts[urlParts.length - 1].split("?")[0] || "image.jpg";
  const extension = originalFilename.split(".").pop() || "jpg";

  // Generate a clean filename
  const cleanProductName = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `${cleanProductName}-${role}-${nanoid(8)}.${extension}`;

  // Upload to object storage
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not configured");
  }

  const objectPath = `public/products/${filename}`;
  const bucket = objectStorageClient.bucket(bucketId);
  const file = bucket.file(objectPath);

  // Upload the file
  await file.save(imageBuffer, {
    metadata: {
      contentType: response.headers.get("content-type") || `image/${extension}`,
    },
  });

  // Set public ACL using ObjectStorageService
  const objectStorageService = new ObjectStorageService();
  const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
    owner: 'system',
    visibility: 'public',
  });

  // Construct the public URL
  const publicUrl = `https://storage.googleapis.com/${bucketId}/${normalizedPath}`;

  // Create media library record data
  const mediaLibraryData: InsertMediaLibrary = {
    filename,
    originalFilename,
    objectPath,
    publicUrl,
    mimeType: response.headers.get("content-type") || `image/${extension}`,
    fileSize: imageBuffer.length,
    category: "product-images",
  };

  return mediaLibraryData;
}
