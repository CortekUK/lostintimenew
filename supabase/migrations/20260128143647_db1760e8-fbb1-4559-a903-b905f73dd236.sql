-- Add category and description columns to deposit_order_items for product creation
ALTER TABLE deposit_order_items 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS description text;