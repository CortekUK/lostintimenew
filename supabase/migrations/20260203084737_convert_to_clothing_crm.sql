-- Migration: Convert jewellery CRM to clothing CRM
-- Rename product columns from jewellery-specific to clothing-specific attributes
-- Rename customer columns from jewellery sizes to clothing sizes

-- =============================================
-- PRODUCTS TABLE: Rename jewellery columns to clothing columns
-- =============================================

-- Rename 'metal' to 'material' (e.g., Cotton, Silk, Wool, Polyester)
ALTER TABLE products RENAME COLUMN metal TO material;

-- Rename 'karat' to 'size' (e.g., XS, S, M, L, XL, or numeric sizes)
ALTER TABLE products RENAME COLUMN karat TO size;

-- Rename 'gemstone' to 'color' (e.g., Black, Navy, Red, White)
ALTER TABLE products RENAME COLUMN gemstone TO color;

-- Add comment to clarify new column purposes
COMMENT ON COLUMN products.material IS 'Fabric/material type (e.g., Cotton, Silk, Wool, Polyester, Denim)';
COMMENT ON COLUMN products.size IS 'Clothing size (e.g., XS, S, M, L, XL, XXL, or numeric)';
COMMENT ON COLUMN products.color IS 'Primary color of the item (e.g., Black, Navy, Red, White)';

-- =============================================
-- CUSTOMERS TABLE: Rename jewellery sizes to clothing sizes
-- =============================================

-- Rename 'ring_size' to 'shirt_size'
ALTER TABLE customers RENAME COLUMN ring_size TO shirt_size;

-- Rename 'bracelet_size' to 'pants_size'
ALTER TABLE customers RENAME COLUMN bracelet_size TO pants_size;

-- Rename 'necklace_length' to 'shoe_size'
ALTER TABLE customers RENAME COLUMN necklace_length TO shoe_size;

-- Rename 'metal_preference' to 'preferred_style'
ALTER TABLE customers RENAME COLUMN metal_preference TO preferred_style;

-- Add comments to clarify new column purposes
COMMENT ON COLUMN customers.shirt_size IS 'Customer shirt/top size (e.g., S, M, L, XL)';
COMMENT ON COLUMN customers.pants_size IS 'Customer pants/bottom size (e.g., 30, 32, 34, or S, M, L)';
COMMENT ON COLUMN customers.shoe_size IS 'Customer shoe size (e.g., UK 8, EU 42)';
COMMENT ON COLUMN customers.preferred_style IS 'Customer preferred clothing style (e.g., Casual, Formal, Streetwear)';
