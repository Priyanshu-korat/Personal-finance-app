-- Run this in your Supabase SQL Editor to set up Multiplayer Splits!

-- 1. Create the Shared Splits Table
CREATE TABLE IF NOT EXISTS public.shared_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    title TEXT,
    category TEXT,
    sub_category TEXT,
    split_type TEXT NOT NULL, 
    paid_by UUID REFERENCES auth.users(id), 
    paid_by_name TEXT, 
    involved_profiles UUID[] DEFAULT '{}', 
    involved_contacts JSONB DEFAULT '[]', 
    split_data JSONB NOT NULL 
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.shared_splits ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies
-- Users can see splits they created or are involved in
CREATE POLICY "Users can view splits they are involved in"
ON public.shared_splits FOR SELECT
USING (
  auth.uid() = creator_id OR
  auth.uid() = paid_by OR
  auth.uid() = ANY(involved_profiles)
);

-- Users can insert splits
CREATE POLICY "Users can insert splits"
ON public.shared_splits FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Users can update splits they are involved in
CREATE POLICY "Users can update splits they are involved in"
ON public.shared_splits FOR UPDATE
USING (
  auth.uid() = creator_id OR
  auth.uid() = paid_by OR
  auth.uid() = ANY(involved_profiles)
);

-- Users can delete splits they created
CREATE POLICY "Users can delete splits they created"
ON public.shared_splits FOR DELETE
USING (auth.uid() = creator_id);

-- 4. Enable Realtime Sync
-- Note: You might get a warning if it's already enabled, you can ignore it
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_splits;
