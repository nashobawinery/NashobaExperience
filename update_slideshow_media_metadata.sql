-- =====================================================
-- UPDATE SLIDESHOW MEDIA METADATA FOR PRODUCTION
-- =====================================================
-- This script adds category, descriptions, and alt text
-- to slideshow images in the media library.
-- Run this on your PRODUCTION database.

-- Update areal.jpg
UPDATE media_library
SET 
  category = 'Slideshow',
  description = 'Aerial view of Nashoba Valley Winery estate and vineyard',
  alt_text = 'Aerial photograph showing Nashoba Valley Winery buildings and surrounding vineyard landscape',
  updated_at = NOW()
WHERE filename = 'areal.jpg';

-- Update winery_tasting_area.jpg
UPDATE media_library
SET 
  category = 'Slideshow',
  description = 'Winery tasting area interior with guests',
  alt_text = 'Interior view of the winery tasting area with customers enjoying wine tasting',
  updated_at = NOW()
WHERE filename = 'winery_tasting_area.jpg';

-- Update v2w.jpg
UPDATE media_library
SET 
  category = 'Slideshow',
  description = 'Wine bottles and glasses display',
  alt_text = 'Display of wine bottles and wine glasses at Nashoba Valley Winery',
  updated_at = NOW()
WHERE filename = 'v2w.jpg';

-- Update scenic_Js_Patio.jpg
UPDATE media_library
SET 
  category = 'Slideshow',
  description = 'Scenic outdoor patio area at the winery',
  alt_text = 'Outdoor patio seating area with scenic views at Nashoba Valley Winery',
  updated_at = NOW()
WHERE filename = 'scenic_Js_Patio.jpg';

-- Verify the updates
SELECT id, filename, category, description, alt_text 
FROM media_library 
WHERE category = 'Slideshow'
ORDER BY created_at;
