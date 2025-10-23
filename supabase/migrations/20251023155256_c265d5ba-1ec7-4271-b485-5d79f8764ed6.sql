-- Add foreign key constraints with CASCADE delete for menu_item_ingredients
ALTER TABLE public.menu_item_ingredients
  DROP CONSTRAINT IF EXISTS menu_item_ingredients_menu_item_id_fkey,
  DROP CONSTRAINT IF EXISTS menu_item_ingredients_product_id_fkey;

ALTER TABLE public.menu_item_ingredients
  ADD CONSTRAINT menu_item_ingredients_menu_item_id_fkey 
    FOREIGN KEY (menu_item_id) 
    REFERENCES public.menu_items(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT menu_item_ingredients_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES public.products(id) 
    ON DELETE CASCADE;