-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create policy for suppliers
CREATE POLICY "Public access to suppliers" 
ON public.suppliers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN cost_price NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);

-- Rename unit_price to sales_price for clarity
ALTER TABLE public.products 
RENAME COLUMN unit_price TO sales_price;

-- Update purchases table to track supplier
ALTER TABLE public.purchases
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);