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

  const { data: permissions, isLoading } = useQuery({
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
        .select("*")
        .eq("employee_id", employee.id)
        .maybeSingle();
      
      return data as EmployeePermissions | null;
    },
    enabled: !!session?.user?.id && userRole === "employee",
  });

  if (userRole === "admin") {
    return {
      isAdmin: true,
      isEmployee: false,
      permissions: {
      can_make_sales: true,
      can_view_products: true,
      can_view_reports: true,
      can_manage_stock: true,
      can_manage_suppliers: true,
      can_create_demands: true,
      can_manage_attendance: true,
      },
      loading: false,
    };
  }

  if (userRole === "employee") {
    return {
      isAdmin: false,
      isEmployee: true,
      permissions: permissions || {
        can_make_sales: false,
        can_view_products: false,
        can_view_reports: false,
        can_manage_stock: false,
        can_manage_suppliers: false,
        can_create_demands: false,
        can_manage_attendance: false,
      },
      loading: isLoading,
    };
  }

  return {
    isAdmin: false,
    isEmployee: false,
    permissions: {
      can_make_sales: false,
      can_view_products: false,
      can_view_reports: false,
      can_manage_stock: false,
      can_manage_suppliers: false,
      can_create_demands: false,
      can_manage_attendance: false,
    },
    loading: false,
  };
}
