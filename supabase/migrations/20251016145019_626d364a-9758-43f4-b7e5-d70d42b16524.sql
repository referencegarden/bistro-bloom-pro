-- Drop generated columns first
ALTER TABLE purchases DROP COLUMN IF EXISTS total_cost;
ALTER TABLE sales DROP COLUMN IF EXISTS total_price;

-- Change product stock to support decimal values
ALTER TABLE products 
ALTER COLUMN current_stock TYPE numeric USING current_stock::numeric;

-- Change purchase quantity to support decimal values
ALTER TABLE purchases 
ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- Change sales quantity to support decimal values
ALTER TABLE sales 
ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- Change product demands quantity to support decimal values
ALTER TABLE product_demands 
ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- Recreate generated columns with numeric types
ALTER TABLE purchases 
ADD COLUMN total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED;

ALTER TABLE sales 
ADD COLUMN total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED;