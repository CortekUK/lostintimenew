-- Migration: Add clothing CRM specific features
-- Features: Brand management, condition grading, authentication tracking, customer wishlists

-- =============================================
-- BRANDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier TEXT CHECK (tier IN ('luxury', 'premium', 'contemporary', 'high_street')),
  logo_url TEXT,
  average_markup DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add some common luxury/designer brands as seed data
INSERT INTO brands (name, tier) VALUES
  ('Chanel', 'luxury'),
  ('Hermès', 'luxury'),
  ('Louis Vuitton', 'luxury'),
  ('Gucci', 'luxury'),
  ('Prada', 'luxury'),
  ('Dior', 'luxury'),
  ('Burberry', 'luxury'),
  ('Balenciaga', 'luxury'),
  ('Celine', 'luxury'),
  ('Saint Laurent', 'luxury'),
  ('Bottega Veneta', 'luxury'),
  ('Valentino', 'luxury'),
  ('Fendi', 'luxury'),
  ('Givenchy', 'luxury'),
  ('Loewe', 'luxury'),
  ('MaxMara', 'premium'),
  ('Acne Studios', 'premium'),
  ('Theory', 'premium'),
  ('Sandro', 'premium'),
  ('Maje', 'premium'),
  ('Reiss', 'premium'),
  ('AllSaints', 'premium'),
  ('Ted Baker', 'contemporary'),
  ('COS', 'contemporary'),
  ('& Other Stories', 'contemporary'),
  ('Arket', 'contemporary'),
  ('Massimo Dutti', 'contemporary'),
  ('Zara', 'high_street'),
  ('H&M', 'high_street'),
  ('Mango', 'high_street'),
  ('Other / Unbranded', NULL)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read brands
CREATE POLICY "Allow authenticated users to read brands"
  ON brands FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow managers/owners to insert brands
CREATE POLICY "Allow managers to insert brands"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Create policy to allow managers/owners to update brands
CREATE POLICY "Allow managers to update brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- =============================================
-- PRODUCTS TABLE: Add brand, condition, and authentication columns
-- =============================================

-- Add brand_id foreign key
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);

-- Add condition grading columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition_grade TEXT 
  CHECK (condition_grade IN ('new_with_tags', 'excellent', 'very_good', 'good', 'fair'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition_notes TEXT;

-- Add authentication tracking columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS authentication_status TEXT DEFAULT 'not_required'
  CHECK (authentication_status IN ('not_required', 'pending', 'authenticated', 'failed'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS authentication_provider TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS authentication_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS authentication_certificate_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.brand_id IS 'Reference to the brand/designer of the item';
COMMENT ON COLUMN products.condition_grade IS 'Standardized condition grading: new_with_tags, excellent, very_good, good, fair';
COMMENT ON COLUMN products.condition_notes IS 'Additional notes about condition (e.g., minor wear on heel)';
COMMENT ON COLUMN products.authentication_status IS 'Authentication status for luxury items: not_required, pending, authenticated, failed';
COMMENT ON COLUMN products.authentication_provider IS 'Authentication service provider (e.g., Entrupy, Real Authentication)';
COMMENT ON COLUMN products.authentication_date IS 'Date when authentication was completed';
COMMENT ON COLUMN products.authentication_certificate_url IS 'URL to authentication certificate document';

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_condition_grade ON products(condition_grade);
CREATE INDEX IF NOT EXISTS idx_products_authentication_status ON products(authentication_status);

-- =============================================
-- CUSTOMER WISHLISTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS customer_wishlists (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  category TEXT,
  size TEXT,
  notes TEXT,
  notify_by TEXT DEFAULT 'email' CHECK (notify_by IN ('email', 'sms', 'both')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE customer_wishlists IS 'Customer wishlists for specific brands/categories they want to be notified about';
COMMENT ON COLUMN customer_wishlists.notify_by IS 'Preferred notification method: email, sms, or both';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_wishlists_customer_id ON customer_wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_wishlists_brand_id ON customer_wishlists(brand_id);
CREATE INDEX IF NOT EXISTS idx_customer_wishlists_active ON customer_wishlists(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE customer_wishlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_wishlists
CREATE POLICY "Allow authenticated users to read wishlists"
  ON customer_wishlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert wishlists"
  ON customer_wishlists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update wishlists"
  ON customer_wishlists FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete wishlists"
  ON customer_wishlists FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- VIEW: Customer wishlist matches (for finding customers interested in a product)
-- =============================================

CREATE OR REPLACE VIEW v_wishlist_matches AS
SELECT 
  cw.id as wishlist_id,
  cw.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  cw.brand_id,
  b.name as brand_name,
  cw.category,
  cw.size,
  cw.notes,
  cw.notify_by,
  cw.is_active
FROM customer_wishlists cw
JOIN customers c ON c.id = cw.customer_id
LEFT JOIN brands b ON b.id = cw.brand_id
WHERE cw.is_active = true;

-- Grant access to the view
GRANT SELECT ON v_wishlist_matches TO authenticated;
