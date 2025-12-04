-- Add preparation_display column to menu_items
-- Values: 'kitchen', 'bar', 'none' (none = no preparation display needed)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS preparation_display text DEFAULT 'none';

-- Add a check constraint for valid values
ALTER TABLE public.menu_items 
ADD CONSTRAINT menu_items_preparation_display_check 
CHECK (preparation_display IN ('kitchen', 'bar', 'none'));

-- Update existing items based on their category
UPDATE public.menu_items 
SET preparation_display = 'kitchen' 
WHERE category = 'Cuisine' OR pos_category_id IN (
  SELECT id FROM pos_categories WHERE name = 'Cuisine'
);

UPDATE public.menu_items 
SET preparation_display = 'bar' 
WHERE category = 'Bar' OR pos_category_id IN (
  SELECT id FROM pos_categories WHERE name = 'Bar'
);