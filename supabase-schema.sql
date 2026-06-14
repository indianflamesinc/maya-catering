-- ═══════════════════════════════════════════════════════
-- MAYA Platform — Complete Database Schema
-- Run this in your Supabase SQL editor to set up all tables
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  google_id     TEXT UNIQUE,
  role          TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MENU DISHES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_dishes (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  cuisine_region  TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('appetizer','soup','veg_curry','nonveg_curry','rice','bread','dessert','chaat')),
  is_veg          BOOLEAN DEFAULT TRUE,
  is_active       BOOLEAN DEFAULT TRUE,
  half_price_cents    INTEGER NOT NULL,
  medium_price_cents  INTEGER NOT NULL,
  full_price_cents    INTEGER NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ORDERS (Tray ordering)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id               UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name             TEXT NOT NULL,
  customer_email            TEXT NOT NULL,
  customer_phone            TEXT,
  status                    TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','confirmed','preparing','ready','collected','cancelled'
  )),
  pickup_date               DATE NOT NULL,
  pickup_time               TEXT NOT NULL,
  subtotal_cents            INTEGER NOT NULL,
  tax_cents                 INTEGER NOT NULL,
  total_cents               INTEGER NOT NULL,
  stripe_payment_intent_id  TEXT,
  stripe_payment_status     TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id            UUID REFERENCES orders(id) ON DELETE CASCADE,
  dish_id             UUID REFERENCES menu_dishes(id) ON DELETE SET NULL,
  dish_name           TEXT NOT NULL,
  cuisine_region      TEXT,
  tray_size           TEXT NOT NULL CHECK (tray_size IN ('half','medium','full')),
  quantity            INTEGER NOT NULL DEFAULT 1,
  unit_price_cents    INTEGER NOT NULL,
  total_price_cents   INTEGER NOT NULL
);

-- ─────────────────────────────────────────
-- EVENTS (Weddings, parties, corporate)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name           TEXT NOT NULL,
  customer_email          TEXT NOT NULL,
  customer_phone          TEXT,
  type                    TEXT NOT NULL CHECK (type IN (
    'wedding','birthday','corporate','home_party','puja','festival','other'
  )),
  event_date              DATE NOT NULL,
  event_time              TEXT,
  venue                   TEXT,
  venue_address           TEXT,
  guest_count             INTEGER NOT NULL,
  status                  TEXT DEFAULT 'inquiry' CHECK (status IN (
    'inquiry','proposal_sent','contract_sent','deposit_paid','confirmed','completed','cancelled'
  )),
  cuisine_preferences     TEXT[],
  special_requirements    TEXT,
  assigned_staff_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  estimated_total_cents   INTEGER,
  internal_notes          TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- EVENT CONTRACTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_contracts (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id                UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  contract_html           TEXT,
  contract_pdf_url        TEXT,
  docusign_envelope_id    TEXT,
  signed_at               TIMESTAMPTZ,
  deposit_percent         INTEGER DEFAULT 30,
  deposit_amount_cents    INTEGER,
  total_amount_cents      INTEGER,
  deposit_paid_at         TIMESTAMPTZ,
  deposit_stripe_id       TEXT,
  balance_due_date        DATE,
  balance_paid_at         TIMESTAMPTZ,
  balance_stripe_id       TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CALENDAR SLOTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_slots (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date        DATE NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  staff_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  slot_type   TEXT NOT NULL CHECK (slot_type IN ('event','pickup','tasting','blocked')),
  is_blocked  BOOLEAN DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PICKUP TIME SLOTS (available times customers can select)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_slots (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date          DATE NOT NULL,
  time          TEXT NOT NULL,
  max_orders    INTEGER DEFAULT 3,
  current_count INTEGER DEFAULT 0,
  is_available  BOOLEAN DEFAULT TRUE
);

-- ─────────────────────────────────────────
-- SEED MENU DATA
-- ─────────────────────────────────────────
INSERT INTO menu_dishes (name, cuisine_region, category, is_veg, half_price_cents, medium_price_cents, full_price_cents) VALUES
-- Appetizers
('Vegetable Samosa', 'North Indian', 'appetizer', TRUE, 3500, 6500, 12000),
('Paneer Tikka', 'North Indian', 'appetizer', TRUE, 5500, 10000, 18500),
('Chicken Tikka', 'North Indian', 'appetizer', FALSE, 6000, 11500, 21000),
('Seekh Kebab', 'North Indian', 'appetizer', FALSE, 6500, 12000, 22000),
('Onion Bhaji', 'North Indian', 'appetizer', TRUE, 3200, 5800, 10800),
('Fish Pakora', 'North Indian', 'appetizer', FALSE, 6200, 11800, 21500),
-- Veg Curries
('Palak Paneer', 'North Indian', 'veg_curry', TRUE, 4800, 9000, 16500),
('Paneer Butter Masala', 'North Indian', 'veg_curry', TRUE, 5000, 9500, 17500),
('Chana Masala', 'North Indian', 'veg_curry', TRUE, 4200, 7800, 14500),
('Dal Makhani', 'North Indian', 'veg_curry', TRUE, 4000, 7500, 13800),
('Aloo Gobi', 'North Indian', 'veg_curry', TRUE, 3800, 7000, 13000),
('Baingan Bharta', 'North Indian', 'veg_curry', TRUE, 4200, 7800, 14500),
('Matar Paneer', 'North Indian', 'veg_curry', TRUE, 4600, 8600, 16000),
('Mixed Vegetable Curry', 'North Indian', 'veg_curry', TRUE, 3800, 7000, 12800),
('Gatte Ki Sabzi', 'Rajasthani', 'veg_curry', TRUE, 4400, 8200, 15500),
('Undhiyu', 'Gujarati', 'veg_curry', TRUE, 5200, 9800, 18500),
('Bharli Vangi', 'Maharashtrian', 'veg_curry', TRUE, 4800, 9000, 17000),
('Avial', 'Kerala', 'veg_curry', TRUE, 4200, 7800, 14500),
('Gutti Vankaya', 'Telugu', 'veg_curry', TRUE, 4600, 8600, 16000),
-- Non-Veg Curries
('Butter Chicken', 'North Indian', 'nonveg_curry', FALSE, 5800, 10800, 20000),
('Chicken Tikka Masala', 'North Indian', 'nonveg_curry', FALSE, 5800, 10800, 20000),
('Chicken Vindaloo', 'North Indian', 'nonveg_curry', FALSE, 5500, 10200, 18800),
('Lamb Rogan Josh', 'North Indian', 'nonveg_curry', FALSE, 6800, 12800, 23800),
('Goat Curry', 'North Indian', 'nonveg_curry', FALSE, 7000, 13200, 24500),
('Fish Curry', 'Kerala', 'nonveg_curry', FALSE, 6500, 12200, 22500),
('Prawn Masala', 'Kerala', 'nonveg_curry', FALSE, 7200, 13500, 25000),
('Butter Chicken', 'Punjabi', 'nonveg_curry', FALSE, 5800, 10800, 20000),
('Gongura Mutton', 'Telugu', 'nonveg_curry', FALSE, 7200, 13500, 25000),
('Kosha Mangsho', 'Bengali', 'nonveg_curry', FALSE, 7000, 13200, 24500),
('Kori Rotti Curry', 'Karnataka', 'nonveg_curry', FALSE, 6500, 12200, 22500),
-- Rice & Biryani
('Basmati Rice (Plain)', 'North Indian', 'rice', TRUE, 2800, 5200, 9500),
('Jeera Rice', 'North Indian', 'rice', TRUE, 3200, 5800, 10800),
('Veg Biryani', 'North Indian', 'rice', TRUE, 4500, 8500, 15800),
('Chicken Biryani', 'North Indian', 'rice', FALSE, 5800, 10800, 20000),
('Goat Biryani', 'North Indian', 'rice', FALSE, 6800, 12800, 23800),
('Hyderabadi Biryani', 'Telugu', 'rice', FALSE, 6800, 12800, 23800),
('Pulihora', 'Telugu', 'rice', TRUE, 3800, 7000, 13000),
-- Breads
('Naan (per dozen)', 'North Indian', 'bread', TRUE, 1800, 3200, 5800),
('Garlic Naan (per dozen)', 'North Indian', 'bread', TRUE, 2200, 3800, 6800),
('Roti (per dozen)', 'North Indian', 'bread', TRUE, 1500, 2800, 5000),
('Paratha (per dozen)', 'North Indian', 'bread', TRUE, 2200, 4000, 7200),
-- Desserts
('Gulab Jamun', 'North Indian', 'dessert', TRUE, 3500, 6500, 12000),
('Kheer', 'North Indian', 'dessert', TRUE, 3800, 7000, 13000),
('Rasmalai', 'North Indian', 'dessert', TRUE, 4200, 7800, 14500),
('Gajar Halwa', 'North Indian', 'dessert', TRUE, 3800, 7000, 13000),
('Payasam', 'Kerala', 'dessert', TRUE, 3800, 7000, 13000),
-- Chaat
('Pani Puri (per dozen)', 'North Indian', 'chaat', TRUE, 2500, 4500, 8000),
('Bhel Puri', 'North Indian', 'chaat', TRUE, 2800, 5000, 9000),
('Dahi Chaat', 'North Indian', 'chaat', TRUE, 3000, 5500, 10000)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_slots ENABLE ROW LEVEL SECURITY;

-- Menu is public
CREATE POLICY "menu_public_read" ON menu_dishes FOR SELECT USING (true);

-- Pickup slots are public (customers need to see availability)
CREATE POLICY "pickup_slots_public_read" ON pickup_slots FOR SELECT USING (true);

-- Customers can read/update their own profile
CREATE POLICY "customers_own_profile" ON customers
  FOR ALL USING (auth.uid()::text = id::text);

-- Customers can read/insert their own orders
CREATE POLICY "orders_own" ON orders
  FOR ALL USING (auth.uid()::text = customer_id::text);

-- Order items follow order ownership
CREATE POLICY "order_items_own" ON order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM orders WHERE customer_id::text = auth.uid()::text)
  );

-- Events: customers see their own
CREATE POLICY "events_own" ON events
  FOR ALL USING (auth.uid()::text = customer_id::text);

-- Admin bypass: service role has full access (handled by supabaseAdmin client)

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_events_customer ON events(customer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_slots(date);
CREATE INDEX IF NOT EXISTS idx_pickup_slots_date ON pickup_slots(date);
