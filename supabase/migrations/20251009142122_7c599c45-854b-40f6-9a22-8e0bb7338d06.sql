-- Add PIN authentication fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS pin_hash text,
ADD COLUMN IF NOT EXISTS pin_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);