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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user order lookup
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
