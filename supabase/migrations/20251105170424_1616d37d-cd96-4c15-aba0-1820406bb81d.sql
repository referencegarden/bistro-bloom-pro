-- Update menu_items to properly link to pos_categories
-- This ensures all menu items have the correct pos_category_id for printing logic

-- Update menu items with Bar category
UPDATE menu_items 
SET pos_category_id = (SELECT id FROM pos_categories WHERE name = 'Bar' LIMIT 1)
WHERE category = 'Bar' 
  AND (pos_category_id IS NULL OR pos_category_id != (SELECT id FROM pos_categories WHERE name = 'Bar' LIMIT 1));

-- Update menu items with Cuisine/Kitchen categories
UPDATE menu_items 
SET pos_category_id = (SELECT id FROM pos_categories WHERE name = 'Cuisine' LIMIT 1)
WHERE category IN ('Cuisine', 'FAST FOOD', 'Kitchen', 'Food') 
  AND (pos_category_id IS NULL OR pos_category_id != (SELECT id FROM pos_categories WHERE name = 'Cuisine' LIMIT 1));

-- Add comment for documentation
COMMENT ON COLUMN menu_items.pos_category_id IS 'Links menu item to POS category for printer routing (Bar=Printer1, Cuisine=Printer2)';