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
import { cn } from "@/lib/utils";

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
      pending: { variant: "secondary", label: "En Attente", shortLabel: "Attente" },
      in_stock: { variant: "default", label: "En Stock", shortLabel: "Stock" },
      fulfilled: { variant: "default", label: "Complétée", shortLabel: "OK", className: "bg-green-500" },
      cancelled: { variant: "destructive", label: "Annulée", shortLabel: "Annulée" },
    };

    const config = variants[status] || { variant: "secondary", label: status, shortLabel: status };
    return (
      <Badge variant={config.variant} className={cn("text-xs px-2 py-0.5", config.className)}>
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">{config.shortLabel}</span>
      </Badge>
    );
  }

  function handleRecordPurchase(demand: Demand) {
    setSelectedDemand(demand);
    setPurchaseDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Demandes de Produits</h1>
        {(isAdmin || permissions.can_create_demands) && (
          <Button onClick={() => setDemandDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Demande
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">Liste des Demandes</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="hidden sm:table-cell">Demandé par</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDemands.map((demand) => (
                <TableRow key={demand.id}>
                  <TableCell>
                    <span className="hidden sm:inline">{format(new Date(demand.requested_at), "dd/MM/yyyy HH:mm")}</span>
                    <span className="sm:hidden">{format(new Date(demand.requested_at), "dd/MM")}</span>
                  </TableCell>
                  <TableCell className="font-medium">{demand.products.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{demand.employees.name}</TableCell>
                  <TableCell>{demand.quantity}</TableCell>
                  <TableCell>{getStatusBadge(demand.status)}</TableCell>
                  <TableCell className="max-w-xs truncate hidden md:table-cell">{demand.notes || "-"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                        {demand.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDemandStatus(demand.id, "in_stock")}
                            className="w-full sm:w-auto px-2 sm:px-4 min-h-[36px]"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">En Stock</span>
                          </Button>
                        )}
                        {demand.status === "in_stock" && (
                          <Button
                            size="sm"
                            onClick={() => handleRecordPurchase(demand)}
                            className="w-full sm:w-auto text-xs sm:text-sm min-h-[36px]"
                          >
                            <span className="hidden sm:inline">Enregistrer Achat</span>
                            <span className="sm:hidden">Achat</span>
                          </Button>
                        )}
                        {demand.status === "pending" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateDemandStatus(demand.id, "cancelled")}
                            className="w-full sm:w-auto px-2 sm:px-4 min-h-[36px]"
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Annuler</span>
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
