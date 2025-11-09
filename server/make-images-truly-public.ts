// Attempt to make GCS files truly public (not just metadata)
import { objectStorageClient } from './objectStorage';
import { db } from './db';
import { mediaLibrary } from '../shared/schema';

async function makeFilesTrulyPublic() {
  console.log('Attempting to make files truly public in GCS...');
  
  const allMediaFiles = await db.select().from(mediaLibrary);
  
  for (const media of allMediaFiles) {
    try {
      const url = new URL(media.objectPath);
      const pathParts = url.pathname.split('/').filter(p => p);
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join('/');
      
      console.log(`Processing: ${bucketName}/${objectName}`);
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Try to make file publicly readable
      await file.makePublic();
      
      console.log(`  ✓ Made public: ${media.filename}`);
      
    } catch (error) {
      console.error(`  ✗ Error with ${media.filename}:`, error.message);
    }
  }
  
  console.log('\nDone!');
}

makeFilesTrulyPublic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
