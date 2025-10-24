-- Ensure CASCADE DELETE is properly configured for menu_item_ingredients
-- This allows deleting menu items to automatically delete their associated ingredients

-- First, drop the existing foreign key if it exists
ALTER TABLE public.menu_item_ingredients
DROP CONSTRAINT IF EXISTS menu_item_ingredients_menu_item_id_fkey;

-- Recreate the foreign key with ON DELETE CASCADE
ALTER TABLE public.menu_item_ingredients
ADD CONSTRAINT menu_item_ingredients_menu_item_id_fkey
FOREIGN KEY (menu_item_id)
REFERENCES public.menu_items(id)
ON DELETE CASCADE;

-- Also ensure the product_id constraint uses RESTRICT (prevent deleting products used in recipes)
ALTER TABLE public.menu_item_ingredients
DROP CONSTRAINT IF EXISTS menu_item_ingredients_product_id_fkey;

ALTER TABLE public.menu_item_ingredients
ADD CONSTRAINT menu_item_ingredients_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE RESTRICT;