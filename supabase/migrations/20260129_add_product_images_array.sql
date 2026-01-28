-- Add images array column to products table to store multiple media URLs
ALTER TABLE products
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Migrate existing image_url data to images array
UPDATE products
SET images = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND (images IS NULL OR images = '{}');

-- Add comment for documentation
COMMENT ON COLUMN products.images IS 'Array of image/video URLs for the product gallery';
