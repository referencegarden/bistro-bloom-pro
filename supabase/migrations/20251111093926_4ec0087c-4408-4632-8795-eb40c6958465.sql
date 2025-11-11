-- Phase 1.7: Add tenant_id to all existing tables (nullable initially to preserve existing data)

-- Products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);

-- Categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON public.categories(tenant_id);

-- Suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);

-- Purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_purchases_tenant_id ON public.purchases(tenant_id);

-- Sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);

-- Employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON public.employees(tenant_id);

-- Employee Permissions
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_employee_permissions_tenant_id ON public.employee_permissions(tenant_id);

-- Attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON public.attendance(tenant_id);

-- Product Demands
ALTER TABLE public.product_demands ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_product_demands_tenant_id ON public.product_demands(tenant_id);

-- Menu Items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_id ON public.menu_items(tenant_id);

-- Menu Item Ingredients
ALTER TABLE public.menu_item_ingredients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_tenant_id ON public.menu_item_ingredients(tenant_id);

-- Menu Item Sales
ALTER TABLE public.menu_item_sales ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_menu_item_sales_tenant_id ON public.menu_item_sales(tenant_id);

-- POS Categories
ALTER TABLE public.pos_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pos_categories_tenant_id ON public.pos_categories(tenant_id);

-- Tables
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tables_tenant_id ON public.tables(tenant_id);

-- Orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);

-- Order Items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id ON public.order_items(tenant_id);

-- Payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);

-- Payment Splits
ALTER TABLE public.payment_splits ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payment_splits_tenant_id ON public.payment_splits(tenant_id);

-- App Settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_app_settings_tenant_id ON public.app_settings(tenant_id);