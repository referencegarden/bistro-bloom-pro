import { Navigate } from "react-router-dom";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission?: "can_make_sales" | "can_view_products" | "can_view_reports" | "can_manage_stock";
  adminOnly?: boolean;
}

export function PermissionRoute({ 
  children, 
  requiredPermission,
  adminOnly = false 
}: PermissionRouteProps) {
  const { isAdmin, permissions, loading } = useEmployeePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/sales" replace />;
  }

  if (requiredPermission && !isAdmin) {
    if (!permissions || !permissions[requiredPermission]) {
      return <Navigate to="/sales" replace />;
    }
  }

  return <>{children}</>;
}
