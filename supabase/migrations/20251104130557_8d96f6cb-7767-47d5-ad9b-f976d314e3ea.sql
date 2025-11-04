-- Create function to get POS sales report
CREATE OR REPLACE FUNCTION public.get_pos_sales_report(
  _start_date timestamp with time zone,
  _end_date timestamp with time zone
)
RETURNS TABLE (
  menu_item_id uuid,
  menu_item_name text,
  menu_item_category text,
  total_quantity numeric,
  total_revenue numeric,
  order_count bigint,
  avg_order_value numeric,
  sales_percentage numeric,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_sales numeric;
BEGIN
  -- Calculate total sales for percentage
  SELECT COALESCE(SUM(oi.total_price), 0) INTO total_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed');

  -- Return detailed sales report
  RETURN QUERY
  SELECT 
    mi.id AS menu_item_id,
    mi.name AS menu_item_name,
    mi.category AS menu_item_category,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity,
    COALESCE(SUM(oi.total_price), 0) AS total_revenue,
    COUNT(DISTINCT oi.order_id) AS order_count,
    CASE 
      WHEN COUNT(DISTINCT oi.order_id) > 0 
      THEN ROUND(COALESCE(SUM(oi.total_price), 0) / COUNT(DISTINCT oi.order_id), 2)
      ELSE 0 
    END AS avg_order_value,
    CASE 
      WHEN total_sales > 0 
      THEN ROUND((COALESCE(SUM(oi.total_price), 0) / total_sales * 100), 2)
      ELSE 0 
    END AS sales_percentage,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(oi.quantity), 0) DESC) AS rank
  FROM public.menu_items mi
  LEFT JOIN public.order_items oi ON oi.menu_item_id = mi.id
  LEFT JOIN public.orders o ON o.id = oi.order_id 
    AND o.created_at BETWEEN _start_date AND _end_date
    AND o.status IN ('confirmed', 'completed')
  GROUP BY mi.id, mi.name, mi.category
  HAVING COALESCE(SUM(oi.quantity), 0) > 0
  ORDER BY total_quantity DESC;
END;
$function$;