import { ObjectStorageService, objectStorageClient } from './objectStorage';
import { setObjectAclPolicy } from './objectAcl';
import { db } from './db';
import { mediaLibrary, slideshowImages } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function migrateMediaToPublic() {
  console.log('Starting migration to make media files public...');
  
  const objectStorageService = new ObjectStorageService();
  const allMediaFiles = await db.select().from(mediaLibrary);
  
  console.log(`Found ${allMediaFiles.length} media files to process`);
  
  for (const media of allMediaFiles) {
    try {
      console.log(`Processing: ${media.filename} (${media.id})`);
      
      // Get the file object
      const file = await objectStorageService.getObjectEntityFile(media.objectPath);
      
      // Set ACL to public
      await setObjectAclPolicy(file, { visibility: 'public' });
      console.log(`  ✓ Set to public`);
      
      // Get the public URL
      const [metadata] = await file.getMetadata();
      const publicUrl = `https://storage.googleapis.com/${file.bucket.name}/${file.name}`;
      
      // Update the database
      await db.update(mediaLibrary)
        .set({ publicUrl })
        .where(eq(mediaLibrary.id, media.id));
      
      console.log(`  ✓ Updated database with public URL`);
      
    } catch (error) {
      console.error(`  ✗ Error processing ${media.filename}:`, error);
    }
  }
  
  console.log('\nUpdating slideshow images to use public URLs...');
  
  // Update slideshow images to use public URLs
  const slides = await db.select().from(slideshowImages);
  
  for (const slide of slides) {
    if (slide.imageUrl?.startsWith('/api/media-library/')) {
      // Extract the media library ID from the URL
      const match = slide.imageUrl.match(/\/api\/media-library\/([^/]+)\/file/);
      if (match) {
        const mediaId = match[1];
        const mediaFile = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, mediaId)).limit(1);
        
        if (mediaFile.length > 0 && mediaFile[0].publicUrl) {
          await db.update(slideshowImages)
            .set({ imageUrl: mediaFile[0].publicUrl })
            .where(eq(slideshowImages.id, slide.id));
          
          console.log(`  ✓ Updated slide: ${slide.title}`);
        }
      }
    }
  }
  
  console.log('\n✅ Migration complete!');
}

migrateMediaToPublic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
