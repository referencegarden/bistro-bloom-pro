-- Update RLS policies for tenant isolation across all tables
-- Super admins bypass tenant filtering, regular users are restricted to their tenant

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view products" ON public.products;
DROP POLICY IF EXISTS "Employees can view products" ON public.products;
DROP POLICY IF EXISTS "Admins and stock managers can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins and stock managers can update products" ON public.products;
DROP POLICY IF EXISTS "Admins and stock managers can delete products" ON public.products;

CREATE POLICY "Admins can view products" ON public.products
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view products" ON public.products
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can insert products" ON public.products
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can update products" ON public.products
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can delete products" ON public.products
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, stock managers and product viewers can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and stock managers can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and stock managers can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and stock managers can delete categories" ON public.categories;

CREATE POLICY "Admins, stock managers and product viewers can view categories" ON public.categories
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock') OR has_employee_permission(auth.uid(), 'can_view_products')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can insert categories" ON public.categories
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can update categories" ON public.categories
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can delete categories" ON public.categories
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and authorized employees can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and authorized employees can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and authorized employees can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and authorized employees can delete suppliers" ON public.suppliers;

CREATE POLICY "Admins and authorized employees can view suppliers" ON public.suppliers
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock') OR has_employee_permission(auth.uid(), 'can_manage_suppliers') OR has_employee_permission(auth.uid(), 'can_view_products')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and authorized employees can insert suppliers" ON public.suppliers
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock') OR has_employee_permission(auth.uid(), 'can_manage_suppliers')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and authorized employees can update suppliers" ON public.suppliers
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock') OR has_employee_permission(auth.uid(), 'can_manage_suppliers')) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock') OR has_employee_permission(auth.uid(), 'can_manage_suppliers')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and authorized employees can delete suppliers" ON public.suppliers
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock') OR has_employee_permission(auth.uid(), 'can_manage_suppliers')) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;

CREATE POLICY "Admins can view employees" ON public.employees
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view own record" ON public.employees
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (user_id = auth.uid() AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can insert employees" ON public.employees
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can update employees" ON public.employees
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can delete employees" ON public.employees
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- EMPLOYEE_PERMISSIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Employees can view own permissions" ON public.employee_permissions;

CREATE POLICY "Admins can manage all permissions" ON public.employee_permissions
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view own permissions" ON public.employee_permissions
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid() AND tenant_id = get_user_tenant_id()))
);

-- ============================================================================
-- SALES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and report viewers can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Employees can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Employees can create sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;

CREATE POLICY "Admins and report viewers can view all sales" ON public.sales
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_view_reports')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view own sales" ON public.sales
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can insert sales" ON public.sales
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can create sales" ON public.sales
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can update sales" ON public.sales
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can delete sales" ON public.sales
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- PURCHASES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and stock managers can view purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins and stock managers can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins and stock managers can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can delete purchases" ON public.purchases;

CREATE POLICY "Admins and stock managers can view purchases" ON public.purchases
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can insert purchases" ON public.purchases
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can update purchases" ON public.purchases
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can delete purchases" ON public.purchases
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- PRODUCT_DEMANDS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all demands" ON public.product_demands;
DROP POLICY IF EXISTS "Employees can view demands" ON public.product_demands;
DROP POLICY IF EXISTS "Employees can create demands" ON public.product_demands;
DROP POLICY IF EXISTS "Employees can update own pending demands" ON public.product_demands;

CREATE POLICY "Admins can manage all demands" ON public.product_demands
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view demands" ON public.product_demands
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can create demands" ON public.product_demands
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can update own pending demands" ON public.product_demands
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((requested_by IN (SELECT id FROM employees WHERE user_id = auth.uid())) AND status = 'pending' AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((requested_by IN (SELECT id FROM employees WHERE user_id = auth.uid())) AND status = 'pending' AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- MENU_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and stock managers can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Employees can view menu items" ON public.menu_items;

CREATE POLICY "Admins and stock managers can manage menu items" ON public.menu_items
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view menu items" ON public.menu_items
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- MENU_ITEM_INGREDIENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and stock managers can manage ingredients" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Employees can view ingredients" ON public.menu_item_ingredients;

CREATE POLICY "Admins and stock managers can manage ingredients" ON public.menu_item_ingredients
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view ingredients" ON public.menu_item_ingredients
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- MENU_ITEM_SALES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all menu sales" ON public.menu_item_sales;
DROP POLICY IF EXISTS "Employees can view menu sales" ON public.menu_item_sales;
DROP POLICY IF EXISTS "Employees can create menu sales" ON public.menu_item_sales;
DROP POLICY IF EXISTS "Report viewers can view menu sales" ON public.menu_item_sales;
DROP POLICY IF EXISTS "Admins and stock managers can delete menu sales" ON public.menu_item_sales;

CREATE POLICY "Admins can manage all menu sales" ON public.menu_item_sales
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view menu sales" ON public.menu_item_sales
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can create menu sales" ON public.menu_item_sales
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Report viewers can view menu sales" ON public.menu_item_sales
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_employee_permission(auth.uid(), 'can_view_reports') AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins and stock managers can delete menu sales" ON public.menu_item_sales
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- POS_CATEGORIES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and stock managers can manage POS categories" ON public.pos_categories;
DROP POLICY IF EXISTS "Employees can view POS categories" ON public.pos_categories;

CREATE POLICY "Admins and stock managers can manage POS categories" ON public.pos_categories
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_stock')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view POS categories" ON public.pos_categories
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- TABLES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and POS users can view tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON public.tables;

CREATE POLICY "Admins and POS users can view tables" ON public.tables
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can manage tables" ON public.tables
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and POS users can view orders" ON public.orders;
DROP POLICY IF EXISTS "POS users can create orders" ON public.orders;
DROP POLICY IF EXISTS "POS users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

CREATE POLICY "Admins and POS users can view orders" ON public.orders
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "POS users can create orders" ON public.orders
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "POS users can update orders" ON public.orders
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_orders')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can delete orders" ON public.orders
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- ORDER_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and POS users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "POS users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "POS users can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

CREATE POLICY "Admins and POS users can view order items" ON public.order_items
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "POS users can create order items" ON public.order_items
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_use_pos')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "POS users can update order items" ON public.order_items
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_manage_orders')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can delete order items" ON public.order_items
FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and report viewers can view payments" ON public.payments;
DROP POLICY IF EXISTS "POS payment processors can create payments" ON public.payments;

CREATE POLICY "Admins and report viewers can view payments" ON public.payments
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_view_reports') OR has_employee_permission(auth.uid(), 'can_access_pos_reports')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "POS payment processors can create payments" ON public.payments
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_process_payments')) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- PAYMENT_SPLITS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and report viewers can view payment splits" ON public.payment_splits;
DROP POLICY IF EXISTS "POS payment processors can create payment splits" ON public.payment_splits;

CREATE POLICY "Admins and report viewers can view payment splits" ON public.payment_splits
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_view_reports') OR has_employee_permission(auth.uid(), 'can_access_pos_reports')) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "POS payment processors can create payment splits" ON public.payment_splits
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((has_role(auth.uid(), 'admin'::app_role) OR has_employee_permission(auth.uid(), 'can_process_payments')) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- ATTENDANCE TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can insert own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can update own attendance" ON public.attendance;

CREATE POLICY "Admins can view all attendance" ON public.attendance
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can manage all attendance" ON public.attendance
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can view own attendance" ON public.attendance
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can insert own attendance" ON public.attendance
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Employees can update own attendance" ON public.attendance
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- APP_SETTINGS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;

CREATE POLICY "Admins can view app settings" ON public.app_settings
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);

CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id())
);