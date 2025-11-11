import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TenantDialog } from "@/components/TenantDialog";

export default function SuperAdminTenants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["super-admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          subscriptions (
            id,
            status,
            plan_type,
            end_date
          ),
          tenant_users!inner(
            user_id,
            user_roles!inner(role)
          )
        `)
        .eq('tenant_users.user_roles.role', 'admin')
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch admin emails for each tenant
      const tenantsWithAdmins = await Promise.all(
        (data || []).map(async (tenant) => {
          const userId = tenant.tenant_users?.[0]?.user_id;
          if (userId) {
            const { data: { user } } = await supabase.auth.admin.getUserById(userId);
            return {
              ...tenant,
              admin_email: user?.email || undefined,
              admin_user_id: userId,
            };
          }
          return {
            ...tenant,
            admin_email: undefined,
            admin_user_id: undefined,
          };
        })
      );

      return tenantsWithAdmins;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (tenantId: string) => {
    setTenantToDelete(tenantId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tenantToDelete) {
      deleteMutation.mutate(tenantToDelete);
    }
  };

  const handleAddTenant = () => {
    setDialogMode("create");
    setSelectedTenant(null);
    setTenantDialogOpen(true);
  };

  const handleEditTenant = (tenant: any) => {
    setDialogMode("edit");
    setSelectedTenant(tenant);
    setTenantDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Restaurants</h2>
          <p className="text-muted-foreground">Manage all restaurant tenants</p>
        </div>
        <Button onClick={handleAddTenant}>
          <Plus className="h-4 w-4 mr-2" />
          Add Restaurant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Restaurants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">/{tenant.slug}</code>
                  </TableCell>
                  <TableCell>{tenant.contact_email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tenant.admin_email || "N/A"}
                  </TableCell>
                  <TableCell>
                    {tenant.is_active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.subscriptions?.[0] && (
                      <Badge
                        variant={
                          tenant.subscriptions[0].status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {tenant.subscriptions[0].status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditTenant(tenant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tenant.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TenantDialog
        open={tenantDialogOpen}
        onOpenChange={setTenantDialogOpen}
        mode={dialogMode}
        tenant={selectedTenant}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the restaurant and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
