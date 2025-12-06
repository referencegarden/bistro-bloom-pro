import { ReactNode, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface PermissionRouteProps {
  children: ReactNode;
  permission?: keyof ReturnType<typeof useEmployeePermissions>["permissions"];
}

export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin, permissions, loading } = useEmployeePermissions();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    
    // Admins have all permissions - no redirect needed
    if (isAdmin) {
      setRedirectPath(null);
      return;
    }

    // If no specific permission required, allow access
    if (!permission) {
      setRedirectPath(null);
      return;
    }

    // Check if user has the required permission
    if (!permissions[permission]) {
      // Find the best route based on what permissions they DO have
      const bestRoute = findBestRouteForPermissions(permissions, slug || '');
      setRedirectPath(bestRoute);
    } else {
      setRedirectPath(null);
    }
  }, [loading, isAdmin, permissions, permission, slug]);

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

  // If a specific permission is required and user doesn't have it, redirect
  if (permission && !permissions[permission] && redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

// Helper function to find the best route based on user's permissions
function findBestRouteForPermissions(
  permissions: ReturnType<typeof useEmployeePermissions>["permissions"],
  slug: string
): string {
  // Priority order for redirects based on permissions
  if (permissions.can_view_kitchen_display) {
    return `/${slug}/pos/kitchen`;
  }
  if (permissions.can_use_pos) {
    return `/${slug}/pos`;
  }
  if (permissions.can_access_pos_reports) {
    return `/${slug}/pos/reports`;
  }
  if (permissions.can_make_sales) {
    return `/${slug}/sales`;
  }
  if (permissions.can_view_products) {
    return `/${slug}/products`;
  }
  if (permissions.can_manage_stock) {
    return `/${slug}/products`;
  }
  if (permissions.can_manage_suppliers) {
    return `/${slug}/suppliers`;
  }
  if (permissions.can_manage_attendance) {
    return `/${slug}/attendance`;
  }
  if (permissions.can_view_reports) {
    return `/${slug}/dashboard`;
  }
  if (permissions.can_create_demands) {
    return `/${slug}/demands`;
  }
  if (permissions.can_manage_orders) {
    return `/${slug}/pos/orders`;
  }
  if (permissions.can_process_payments) {
    return `/${slug}/pos`;
  }
  
  // Last resort - this shouldn't normally happen
  return `/${slug}/pos/kitchen`;
}
