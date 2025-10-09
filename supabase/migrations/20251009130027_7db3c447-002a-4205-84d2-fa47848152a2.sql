-- Step 1: Extend app_role enum to include employee role
-- This must be done in a separate migration before it can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';