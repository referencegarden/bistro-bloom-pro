import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface PermissionRouteProps {
  children: ReactNode;
  permission?: keyof ReturnType<typeof useEmployeePermissions>["permissions"];
}

export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const { loading } = useEmployeePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // All restaurants have unrestricted access to all features
  return <>{children}</>;
}
