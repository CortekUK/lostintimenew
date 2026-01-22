-- Add columns to sale_items for custom/bespoke orders
ALTER TABLE sale_items 
ADD COLUMN product_name TEXT,
ADD COLUMN is_custom_order BOOLEAN NOT NULL DEFAULT FALSE;