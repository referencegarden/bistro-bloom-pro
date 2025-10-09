import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeePermissions {
  can_make_sales: boolean;
  can_view_products: boolean;
  can_view_reports: boolean;
  can_manage_stock: boolean;
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
      
      return data?.role;
    },
    enabled: !!session?.user?.id,
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["employee-permissions", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data } = await supabase
        .from("employee_permissions")
        .select("*")
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
      },
      loading: permissionsLoading,
    };
  }

  return {
    isAdmin: false,
    isEmployee: false,
    permissions: null,
    loading: true,
  };
}
