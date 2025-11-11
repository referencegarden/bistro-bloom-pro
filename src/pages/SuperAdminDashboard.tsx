import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const [tenantsRes, subscriptionsRes, usersRes] = await Promise.all([
        supabase.from("tenants").select("id, is_active"),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("tenant_users").select("id"),
      ]);

      const totalTenants = tenantsRes.data?.length || 0;
      const activeTenants = tenantsRes.data?.filter(t => t.is_active).length || 0;
      const activeSubscriptions = subscriptionsRes.data?.filter(s => s.status === "active").length || 0;
      const totalUsers = usersRes.data?.length || 0;

      return {
        totalTenants,
        activeTenants,
        activeSubscriptions,
        totalUsers,
      };
    },
  });

  const { data: recentTenants } = useQuery({
    queryKey: ["recent-tenants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("*, subscriptions(*)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of all restaurants and subscriptions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Restaurants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeTenants || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Across all restaurants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Restaurants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTenants?.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">{tenant.contact_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {tenant.is_active ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                      Inactive
                    </Badge>
                  )}
                  {tenant.subscriptions?.[0]?.status && (
                    <Badge variant="secondary">
                      {tenant.subscriptions[0].status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
