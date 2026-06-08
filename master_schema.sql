-- ==========================================
-- MASTER SUPABASE SCHEMA FILE
-- Run this in the Supabase SQL Editor
-- ==========================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  phone TEXT,
  tier INTEGER DEFAULT 2,
  use_sub_categories BOOLEAN DEFAULT false,
  is_setup_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id) ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  limit_amount NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  billing_date INTEGER,
  is_active_sip BOOLEAN DEFAULT false,
  sip_amount NUMERIC,
  sip_quantity NUMERIC,
  sip_date INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own accounts" ON accounts;
CREATE POLICY "Users can manage their own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  sub_categories JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC NOT NULL,
  title TEXT,
  type TEXT NOT NULL,
  category_id TEXT,
  sub_category_id TEXT,
  account_id TEXT NOT NULL,
  to_account_id TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 5. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date INTEGER NOT NULL,
  frequency TEXT DEFAULT 'Monthly',
  category_id TEXT,
  account_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- 6. Processed Logs Table
CREATE TABLE IF NOT EXISTS processed_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ref_id TEXT NOT NULL,
  month_year TEXT NOT NULL,
  type TEXT NOT NULL,
  snooze_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE processed_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own logs" ON processed_logs;
CREATE POLICY "Users can manage their own logs" ON processed_logs FOR ALL USING (auth.uid() = user_id);

-- 7. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  upi_id TEXT,
  bank_account TEXT,
  ifsc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
CREATE POLICY "Users can manage their own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- 8. Shared Splits Table (Multiplayer)
CREATE TABLE IF NOT EXISTS shared_splits (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) NOT NULL,
  creator_phone TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT,
  paid_by TEXT NOT NULL,
  split_type TEXT NOT NULL,
  split_data JSONB NOT NULL,
  involved_profiles JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Settlement Requests Table
CREATE TABLE IF NOT EXISTS settlement_requests (
  id TEXT PRIMARY KEY,
  initiator_id UUID REFERENCES auth.users(id) NOT NULL,
  initiator_phone TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  split_ids JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- In this version we will bypass RLS for multiplayer tables because of complexity, 
-- or we can just allow authenticated users to read/insert.
ALTER TABLE shared_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage splits" ON shared_splits;
CREATE POLICY "Allow authenticated users to manage splits" ON shared_splits FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE settlement_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage settlements" ON settlement_requests;
CREATE POLICY "Allow authenticated users to manage settlements" ON settlement_requests FOR ALL USING (auth.role() = 'authenticated');
