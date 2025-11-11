import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function SuperAdminSubscriptions() {
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["super-admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          tenants (
            id,
            name,
            contact_email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: "default", className: "bg-green-50 text-green-700 border-green-200" },
      trial: { variant: "secondary", className: "bg-blue-50 text-blue-700 border-blue-200" },
      expired: { variant: "destructive", className: "bg-red-50 text-red-700 border-red-200" },
      suspended: { variant: "outline", className: "bg-gray-50 text-gray-700" },
    };
    
    return variants[status] || variants.active;
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      basic: "bg-gray-100 text-gray-800",
      pro: "bg-purple-100 text-purple-800",
      enterprise: "bg-orange-100 text-orange-800",
    };
    
    return colors[plan] || colors.basic;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-muted-foreground">Manage all restaurant subscriptions</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.filter(s => s.status === "active").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.filter(s => s.status === "trial").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.filter(s => s.status === "expired").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Auto Renew</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{subscription.tenants?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.tenants?.contact_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPlanBadge(subscription.plan_type)}>
                      {subscription.plan_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadge(subscription.status).className}
                    >
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscription.start_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscription.end_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {subscription.auto_renew ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Extend
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
