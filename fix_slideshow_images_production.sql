-- Fix slideshow images to use direct Google Cloud Storage URLs
-- This fixes the issue where images work in dev but not production
-- Run this script on your PRODUCTION database

UPDATE slideshow_images si
SET image_url = ml.object_path
FROM media_library ml
WHERE si.image_url LIKE '/api/media-library/%/file'
  AND si.image_url = '/api/media-library/' || ml.id || '/file';

-- Verify the update
SELECT id, title, image_url 
FROM slideshow_images 
ORDER BY display_order;
