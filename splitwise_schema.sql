-- Run this script in your Supabase SQL Editor to add the Splitwise features

-- 1. Contacts Table (Tracks people you split bills with, including offline/dummy friends)
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  registered_user_id UUID REFERENCES auth.users(id), -- If they ever join the app, this links them
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- 2. Expense Splits Table (Tracks who owes who for a specific transaction)
CREATE TABLE expense_splits (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
  debtor_id TEXT NOT NULL, -- Who owes the money (can be your user_id OR a contact.id)
  creditor_id TEXT NOT NULL, -- Who paid the money (can be your user_id OR a contact.id)
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' or 'settled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Note: Because debtor/creditor IDs can be either UUIDs (you) or TEXT (contacts), 
-- we allow TEXT for those columns rather than strict foreign keys, 
-- but we enforce that the row must belong to your transaction.
CREATE POLICY "Users can manage splits for their transactions" ON expense_splits 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = expense_splits.transaction_id AND t.user_id = auth.uid()
  )
);
