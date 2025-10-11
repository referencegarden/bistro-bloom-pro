-- Add unique constraint to products.name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_name_key'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_name_key UNIQUE (name);
  END IF;
END $$;