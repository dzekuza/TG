-- migration.sql: Create orders table for Telegram food ordering app
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  items JSONB NOT NULL,
  comment TEXT,
  location TEXT,
  status TEXT DEFAULT 'pending',
  driver_location TEXT,
  eta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total NUMERIC,
  deleted BOOLEAN DEFAULT FALSE
);

-- Index for fast user order lookup
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

CREATE TABLE IF NOT EXISTS admin_user_notes (
  user_id TEXT PRIMARY KEY,
  note TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_stats (
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  orders_delivered INTEGER DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  hours_worked NUMERIC DEFAULT 0,
  km_driven NUMERIC DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS admin_messages (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  nickname TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove old products table if exists
DROP TABLE IF EXISTS products;

-- Create new products table with price_ranges
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_ranges JSONB NOT NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example migration for existing data (if needed):
-- For each product, convert price_1, price_2, price_3 to price_ranges JSONB
-- This step should be done in a separate migration script or manually if needed.

-- Enable Row Level Security and policies for user CRUD on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own orders
CREATE POLICY user_insert_order ON orders
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Allow users to update their own orders
CREATE POLICY user_update_order ON orders
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true));

-- Allow users to delete their own orders
CREATE POLICY user_delete_order ON orders
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true));

-- (Admins can be handled with a separate policy or bypass RLS as needed)
