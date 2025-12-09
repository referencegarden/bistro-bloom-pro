-- Add use_tables_system setting to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS use_tables_system boolean NOT NULL DEFAULT true;

-- Add is_open_tab to orders for multi-bill/tab system
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_open_tab boolean NOT NULL DEFAULT false;

-- Update the types comment for reference
COMMENT ON COLUMN public.app_settings.use_tables_system IS 'When true, POS requires table selection for dine-in orders';
COMMENT ON COLUMN public.orders.is_open_tab IS 'When true, order stays open for additional items';