-- Fix search_path syntax for the employee sales report function
CREATE OR REPLACE FUNCTION public.get_pos_sales_by_employee(
  _start_date timestamp with time zone,
  _end_date timestamp with time zone
)
RETURNS TABLE(
  employee_id uuid,
  employee_name text,
  employee_position text,
  total_orders bigint,
  total_revenue numeric,
  total_items_sold numeric,
  avg_order_value numeric,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    e.position AS employee_position,
    COUNT(DISTINCT o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
    CASE 
      WHEN COUNT(DISTINCT o.id) > 0 
      THEN ROUND(COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT o.id), 2)
      ELSE 0 
    END AS avg_order_value,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(o.total_amount), 0) DESC) AS rank
  FROM public.employees e
  LEFT JOIN public.orders o ON o.employee_id = e.id
    AND o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed', 'served')
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  WHERE e.is_active = true
  GROUP BY e.id, e.name, e.position
  HAVING COUNT(DISTINCT o.id) > 0
  ORDER BY total_revenue DESC;
END;
$function$;