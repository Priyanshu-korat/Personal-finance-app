-- Run this in your Supabase SQL Editor to fix the Setup Wizard issue!

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;
