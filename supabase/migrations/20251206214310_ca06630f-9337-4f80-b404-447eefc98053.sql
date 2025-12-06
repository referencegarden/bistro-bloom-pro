-- Add preparation_status column to order_items for independent kitchen/bar tracking
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS preparation_status text NOT NULL DEFAULT 'pending';

-- Add check constraint for valid preparation statuses
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_preparation_status_check 
CHECK (preparation_status IN ('pending', 'preparing', 'ready'));