import { ReactNode } from "react";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface RoleGuardProps {
  children: ReactNode;
  permission: keyof ReturnType<typeof useUserPermissions>["permissions"];
  fallback?: ReactNode;
}

export function RoleGuard({ children, permission, fallback = null }: RoleGuardProps) {
  const { permissions, loading } = useUserPermissions();

  if (loading) {
    return null;
  }

  if (!permissions[permission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
