-- =====================================================
-- PRODUCTION FIX FOR SLIDESHOW IMAGES
-- =====================================================
-- This script fixes the slideshow images on production.
-- Run this on your PRODUCTION database.

-- Step 1: Verify slideshow images are using proxy endpoints
-- (Should show URLs like /api/media-library/{id}/file)
SELECT id, title, image_url 
FROM slideshow_images 
ORDER BY display_order;

-- Step 2: If images are using direct GCS URLs, update them to use proxy endpoints
-- (Only run this if Step 1 shows https://storage.googleapis.com URLs)
UPDATE slideshow_images si
SET image_url = '/api/media-library/' || ml.id || '/file'
FROM media_library ml
WHERE si.image_url = ml.public_url
  AND si.image_url LIKE 'https://storage.googleapis.com/%';

-- Step 3: Verify the update worked
SELECT id, title, image_url 
FROM slideshow_images 
ORDER BY display_order;

-- Expected result: All image_url values should be like:
-- /api/media-library/fe47f685-7c1c-4db3-a76e-f5d9838b6cfb/file
