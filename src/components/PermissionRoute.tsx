import { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface PermissionRouteProps {
  children: ReactNode;
  permission?: keyof ReturnType<typeof useEmployeePermissions>["permissions"];
}

export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const { slug } = useParams<{ slug: string }>();
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

  // If a specific permission is required, check it
  if (permission && !permissions[permission]) {
    // Redirect to dashboard if permission denied
    return <Navigate to={`/${slug}/dashboard`} replace />;
  }

  return <>{children}</>;
}