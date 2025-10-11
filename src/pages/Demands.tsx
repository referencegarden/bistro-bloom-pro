import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemandDialog } from "@/components/DemandDialog";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Demand {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  notes: string | null;
  requested_at: string;
  products: { name: string };
  employees: { name: string };
}

export default function Demands() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [filteredDemands, setFilteredDemands] = useState<Demand[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [demandDialogOpen, setDemandDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const { isAdmin, permissions } = useEmployeePermissions();

  useEffect(() => {
    loadDemands();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredDemands(demands);
    } else {
      setFilteredDemands(demands.filter(d => d.status === statusFilter));
    }
  }, [statusFilter, demands]);

  async function loadDemands() {
    const { data } = await supabase
      .from("product_demands")
      .select(`
        *,
        products (name),
        employees (name)
      `)
      .order("requested_at", { ascending: false });

    if (data) {
      setDemands(data as any);
    }
  }

  async function updateDemandStatus(demandId: string, newStatus: "pending" | "in_stock" | "fulfilled" | "cancelled") {
    const { error } = await supabase
      .from("product_demands")
      .update({ status: newStatus })
      .eq("id", demandId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    toast.success("Statut mis à jour");
    loadDemands();
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "En Attente" },
      in_stock: { variant: "default", label: "En Stock" },
      fulfilled: { variant: "default", label: "Complétée", className: "bg-green-500" },
      cancelled: { variant: "destructive", label: "Annulée" },
    };

    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  }

  function handleRecordPurchase(demand: Demand) {
    setSelectedDemand(demand);
    setPurchaseDialogOpen(true);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Demandes de Produits</h1>
        {(isAdmin || permissions.can_create_demands) && (
          <Button onClick={() => setDemandDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Demande
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Liste des Demandes</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En Attente</SelectItem>
                <SelectItem value="in_stock">En Stock</SelectItem>
                <SelectItem value="fulfilled">Complétées</SelectItem>
                <SelectItem value="cancelled">Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Demandé par</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Notes</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDemands.map((demand) => (
                <TableRow key={demand.id}>
                  <TableCell>{format(new Date(demand.requested_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{demand.products.name}</TableCell>
                  <TableCell>{demand.employees.name}</TableCell>
                  <TableCell>{demand.quantity}</TableCell>
                  <TableCell>{getStatusBadge(demand.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">{demand.notes || "-"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-2">
                        {demand.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDemandStatus(demand.id, "in_stock")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            En Stock
                          </Button>
                        )}
                        {demand.status === "in_stock" && (
                          <Button
                            size="sm"
                            onClick={() => handleRecordPurchase(demand)}
                          >
                            Enregistrer Achat
                          </Button>
                        )}
                        {demand.status === "pending" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateDemandStatus(demand.id, "cancelled")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Annuler
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredDemands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                    Aucune demande trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DemandDialog
        open={demandDialogOpen}
        onOpenChange={setDemandDialogOpen}
        onSuccess={loadDemands}
      />

      {selectedDemand && (
        <PurchaseDialog
          open={purchaseDialogOpen}
          onClose={() => {
            setPurchaseDialogOpen(false);
            loadDemands();
          }}
          demandId={selectedDemand.id}
          prefilledProductId={selectedDemand.product_id}
          prefilledQuantity={selectedDemand.quantity}
        />
      )}
    </div>
  );
}
