import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Grid3X3 } from "lucide-react";

interface Table {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: string;
  tenant_id: string;
}

export default function Tables() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [seatingCapacity, setSeatingCapacity] = useState("4");
  const [status, setStatus] = useState("available");
  const [bulkPrefix, setBulkPrefix] = useState("T");
  const [bulkStart, setBulkStart] = useState("1");
  const [bulkEnd, setBulkEnd] = useState("10");

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("table_number");
      if (error) throw error;
      return data as Table[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (tableData: { table_number: string; seating_capacity: number; status: string }) => {
      const { error } = await supabase.from("tables").insert({
        table_number: tableData.table_number,
        seating_capacity: tableData.seating_capacity,
        status: tableData.status,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast.success("Table créée avec succès");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...tableData }: Partial<Table> & { id: string }) => {
      const { error } = await supabase.from("tables").update(tableData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast.success("Table modifiée avec succès");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast.success("Table supprimée avec succès");
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (tables: { table_number: string; seating_capacity: number; status: string; tenant_id: string | null }[]) => {
      const { error } = await supabase.from("tables").insert(tables);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast.success("Tables créées avec succès");
      setBulkDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTable(null);
    setTableNumber("");
    setSeatingCapacity("4");
    setStatus("available");
  };

  const handleOpenEdit = (table: Table) => {
    setEditingTable(table);
    setTableNumber(table.table_number);
    setSeatingCapacity(table.seating_capacity.toString());
    setStatus(table.status);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!tableNumber.trim()) {
      toast.error("Le numéro de table est requis");
      return;
    }

    const tableData = {
      table_number: tableNumber.trim(),
      seating_capacity: parseInt(seatingCapacity),
      status,
    };

    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, ...tableData });
    } else {
      createMutation.mutate(tableData);
    }
  };

  const handleBulkCreate = () => {
    const start = parseInt(bulkStart);
    const end = parseInt(bulkEnd);
    
    if (isNaN(start) || isNaN(end) || start > end) {
      toast.error("Plage de numéros invalide");
      return;
    }

    const tablesToCreate = [];
    for (let i = start; i <= end; i++) {
      tablesToCreate.push({
        table_number: `${bulkPrefix}${i}`,
        seating_capacity: 4,
        status: "available",
        tenant_id: tenantId,
      });
    }

    bulkCreateMutation.mutate(tablesToCreate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "occupied":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "reserved":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "occupied":
        return "Occupée";
      case "reserved":
        return "Réservée";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestion des Tables</h1>
          <p className="text-muted-foreground">Gérez les tables de votre restaurant</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Grid3X3 className="mr-2 h-4 w-4" />
            Création rapide
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une table
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3X3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune table configurée</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter des tables pour votre restaurant
            </p>
            <Button onClick={() => setBulkDialogOpen(true)}>
              <Grid3X3 className="mr-2 h-4 w-4" />
              Créer plusieurs tables
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tables.map((table) => (
            <Card key={table.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Table {table.table_number}</CardTitle>
                  <Badge variant="outline" className={getStatusColor(table.status)}>
                    {getStatusLabel(table.status)}
                  </Badge>
                </div>
                <CardDescription>{table.seating_capacity} places</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(table)}
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Êtes-vous sûr de vouloir supprimer cette table?")) {
                        deleteMutation.mutate(table.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Table Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Modifier la table" : "Ajouter une table"}
            </DialogTitle>
            <DialogDescription>
              {editingTable
                ? "Modifiez les informations de la table"
                : "Créez une nouvelle table pour votre restaurant"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Numéro de table</Label>
              <Input
                id="tableNumber"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ex: 1, A1, T01..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seatingCapacity">Capacité (places)</Label>
              <Input
                id="seatingCapacity"
                type="number"
                min="1"
                value={seatingCapacity}
                onChange={(e) => setSeatingCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="occupied">Occupée</SelectItem>
                  <SelectItem value="reserved">Réservée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTable ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Création rapide de tables</DialogTitle>
            <DialogDescription>
              Créez plusieurs tables en une fois
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkPrefix">Préfixe</Label>
              <Input
                id="bulkPrefix"
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                placeholder="Ex: T, Table, A..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulkStart">Numéro de départ</Label>
                <Input
                  id="bulkStart"
                  type="number"
                  min="1"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkEnd">Numéro de fin</Label>
                <Input
                  id="bulkEnd"
                  type="number"
                  min="1"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Cela créera les tables: {bulkPrefix}{bulkStart} à {bulkPrefix}{bulkEnd} (
              {Math.max(0, parseInt(bulkEnd) - parseInt(bulkStart) + 1) || 0} tables)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={bulkCreateMutation.isPending}
            >
              Créer les tables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
