import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface PermissionRouteProps {
  children: ReactNode;
  permission?: keyof ReturnType<typeof useEmployeePermissions>["permissions"];
}

export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const { isAdmin, permissions, loading } = useEmployeePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Admins have all permissions
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check specific permission and redirect to appropriate page
  if (permission && !permissions[permission]) {
    const fallback = isAdmin
      ? '/dashboard'
      : permissions.can_make_sales
        ? '/sales'
        : permissions.can_view_products
          ? '/products'
          : permissions.can_view_reports
            ? '/dashboard'
            : '/';
    
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
