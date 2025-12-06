import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeePermissions {
  can_make_sales: boolean;
  can_view_products: boolean;
  can_view_reports: boolean;
  can_manage_stock: boolean;
  can_manage_suppliers: boolean;
  can_create_demands: boolean;
  can_manage_attendance: boolean;
  can_use_pos: boolean;
  can_manage_orders: boolean;
  can_process_payments: boolean;
  can_view_kitchen_display: boolean;
  can_view_bar_display: boolean;
  can_access_pos_reports: boolean;
}

export function useEmployeePermissions() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      return data?.role as "admin" | "employee" | null;
    },
    enabled: !!session?.user?.id,
  });

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["employee-permissions", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      // Get employee record
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!employee) return null;

      // Get permissions
      const { data } = await supabase
        .from("employee_permissions")
        .select("can_make_sales, can_view_products, can_view_reports, can_manage_stock, can_manage_suppliers, can_create_demands, can_manage_attendance, can_use_pos, can_manage_orders, can_process_payments, can_view_kitchen_display, can_view_bar_display, can_access_pos_reports")
        .eq("employee_id", employee.id)
        .maybeSingle();
      
      return data as EmployeePermissions | null;
    },
    enabled: !!session?.user?.id && userRole === "employee",
  });

  const permissions = permissionsData || {
    can_make_sales: false,
    can_view_products: false,
    can_view_reports: false,
    can_manage_stock: false,
    can_manage_suppliers: false,
    can_create_demands: false,
    can_manage_attendance: false,
    can_use_pos: false,
    can_manage_orders: false,
    can_process_payments: false,
    can_view_kitchen_display: false,
    can_view_bar_display: false,
    can_access_pos_reports: false,
  };

  const isWaiter = userRole === "employee" && permissions.can_use_pos && !permissions.can_make_sales && !permissions.can_view_products;

  if (userRole === "admin") {
    return {
      isAdmin: true,
      isEmployee: false,
      isWaiter: false,
      permissions: {
        can_make_sales: true,
        can_view_products: true,
        can_view_reports: true,
        can_manage_stock: true,
        can_manage_suppliers: true,
        can_create_demands: true,
        can_manage_attendance: true,
        can_use_pos: true,
        can_manage_orders: true,
        can_process_payments: true,
        can_view_kitchen_display: true,
        can_view_bar_display: true,
        can_access_pos_reports: true,
      },
      loading: false,
    };
  }

  if (userRole === "employee") {
    return {
      isAdmin: false,
      isEmployee: true,
      isWaiter,
      permissions,
      loading: isLoading,
    };
  }

  return {
    isAdmin: false,
    isEmployee: false,
    isWaiter: false,
    permissions: {
      can_make_sales: false,
      can_view_products: false,
      can_view_reports: false,
      can_manage_stock: false,
      can_manage_suppliers: false,
      can_create_demands: false,
      can_manage_attendance: false,
      can_use_pos: false,
      can_manage_orders: false,
      can_process_payments: false,
      can_view_kitchen_display: false,
      can_view_bar_display: false,
      can_access_pos_reports: false,
    },
    loading: false,
  };
}
