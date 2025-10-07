-- Add unit_of_measure column to products table
ALTER TABLE public.products 
ADD COLUMN unit_of_measure TEXT DEFAULT 'unité';