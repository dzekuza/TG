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
  total NUMERIC
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

DROP TABLE IF EXISTS products;
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_1 NUMERIC NOT NULL,
  price_2 NUMERIC,
  price_3 NUMERIC,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
