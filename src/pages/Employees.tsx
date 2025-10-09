import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { toast } from "sonner";

interface Employee {
  id: string;
  name: string;
  employee_number: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        employee_permissions (
          can_make_sales,
          can_view_products,
          can_view_reports,
          can_manage_stock
        )
      `)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Échec du chargement des employés");
      return;
    }

    setEmployees(data || []);
  }

  function handleAdd() {
    setSelectedEmployee(null);
    setDialogOpen(true);
  }

  function handleEdit(employee: Employee) {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) return;

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      toast.error("Échec de la suppression de l'employé");
      return;
    }

    toast.success("Employé supprimé avec succès");
    loadEmployees();
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setSelectedEmployee(null);
    loadEmployees();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
          <p className="text-muted-foreground">Gérer les employés</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter Employé
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Numéro</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Accès PIN</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.employee_number || "-"}</TableCell>
                <TableCell>{employee.position || "-"}</TableCell>
                <TableCell>{employee.phone || "-"}</TableCell>
                <TableCell>{employee.email || "-"}</TableCell>
                <TableCell>
                  <Badge variant={(employee as any).pin_enabled ? "default" : "outline"}>
                    {(employee as any).pin_enabled ? "Activé" : "Désactivé"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(employee as any).employee_permissions?.[0]?.can_make_sales && (
                      <Badge variant="outline" className="text-xs">Ventes</Badge>
                    )}
                    {(employee as any).employee_permissions?.[0]?.can_view_products && (
                      <Badge variant="outline" className="text-xs">Produits</Badge>
                    )}
                    {(employee as any).employee_permissions?.[0]?.can_view_reports && (
                      <Badge variant="outline" className="text-xs">Rapports</Badge>
                    )}
                    {(employee as any).employee_permissions?.[0]?.can_manage_stock && (
                      <Badge variant="outline" className="text-xs">Stock</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmployeeDialog
        open={dialogOpen}
        employee={selectedEmployee}
        onClose={handleDialogClose}
      />
    </div>
  );
}
