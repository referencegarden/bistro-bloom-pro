import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierDialog } from "@/components/SupplierDialog";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load suppliers");
      return;
    }

    setSuppliers(data || []);
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete supplier");
      return;
    }

    toast.success("Supplier deleted");
    loadSuppliers();
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingSupplier(null);
    loadSuppliers();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">Gérer vos fournisseurs</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter Fournisseur
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden sm:table-cell">Personne Contact</TableHead>
              <TableHead className="hidden md:table-cell">Téléphone</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{supplier.contact || "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell">{supplier.phone || "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell">{supplier.email || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(supplier.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SupplierDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        supplier={editingSupplier}
      />
    </div>
  );
}
