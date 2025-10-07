import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Permissions {
  can_view_dashboard: boolean;
  can_manage_products: boolean;
  can_manage_sales: boolean;
  can_manage_purchases: boolean;
  can_manage_categories: boolean;
  can_manage_suppliers: boolean;
  can_manage_users: boolean;
  can_view_reports: boolean;
}

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<Permissions>({
    can_view_dashboard: false,
    can_manage_products: false,
    can_manage_sales: false,
    can_manage_purchases: false,
    can_manage_categories: false,
    can_manage_suppliers: false,
    can_manage_users: false,
    can_view_reports: false,
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPermissions();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPermissions({
          can_view_dashboard: false,
          can_manage_products: false,
          can_manage_sales: false,
          can_manage_purchases: false,
          can_manage_categories: false,
          can_manage_suppliers: false,
          can_manage_users: false,
          can_view_reports: false,
        });
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Get user's role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        setLoading(false);
        return;
      }

      setUserRole(roleData?.role || null);

      // Get permissions for this role using RPC to bypass type issues
      const { data: permData, error: permError } = await supabase.rpc(
        'user_has_permission' as any,
        { _user_id: user.id, _permission: 'can_view_dashboard' }
      );

      // Fetch all permissions manually via queries
      const perms = {
        can_view_dashboard: false,
        can_manage_products: false,
        can_manage_sales: false,
        can_manage_purchases: false,
        can_manage_categories: false,
        can_manage_suppliers: false,
        can_manage_users: false,
        can_view_reports: false,
      };

      // Determine permissions based on role
      const role = roleData.role as string;
      if (role === 'admin') {
        Object.keys(perms).forEach(key => (perms as any)[key] = true);
      } else if (role === 'manager') {
        perms.can_view_dashboard = true;
        perms.can_manage_products = true;
        perms.can_manage_sales = true;
        perms.can_manage_purchases = true;
        perms.can_manage_categories = true;
        perms.can_manage_suppliers = true;
        perms.can_view_reports = true;
      } else if (role === 'cashier') {
        perms.can_view_dashboard = true;
        perms.can_manage_sales = true;
      } else if (role === 'viewer') {
        perms.can_view_dashboard = true;
        perms.can_view_reports = true;
      }

      setPermissions(perms);
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, userRole };
}
