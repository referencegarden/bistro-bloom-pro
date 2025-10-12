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
  products: {
    name: string;
  };
  employees: {
    name: string;
  };
}
export default function Demands() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [filteredDemands, setFilteredDemands] = useState<Demand[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [demandDialogOpen, setDemandDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const {
    isAdmin,
    permissions
  } = useEmployeePermissions();
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
    const {
      data
    } = await supabase.from("product_demands").select(`
        *,
        products (name),
        employees (name)
      `).order("requested_at", {
      ascending: false
    });
    if (data) {
      setDemands(data as any);
    }
  }
  async function updateDemandStatus(demandId: string, newStatus: "pending" | "in_stock" | "fulfilled" | "cancelled") {
    const {
      error
    } = await supabase.from("product_demands").update({
      status: newStatus
    }).eq("id", demandId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success("Statut mis à jour");
    loadDemands();
  }
  function getStatusBadge(status: string) {
    const variants: Record<string, any> = {
      pending: {
        variant: "secondary",
        label: "En Attente",
        shortLabel: "Attente"
      },
      in_stock: {
        variant: "default",
        label: "En Stock",
        shortLabel: "Stock"
      },
      fulfilled: {
        variant: "default",
        label: "Complétée",
        shortLabel: "OK",
        className: "bg-green-500"
      },
      cancelled: {
        variant: "destructive",
        label: "Annulée",
        shortLabel: "Annulée"
      }
    };
    const config = variants[status] || {
      variant: "secondary",
      label: status,
      shortLabel: status
    };
    return <Badge variant={config.variant} className={cn("text-xs px-2 py-0.5", config.className)}>
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">{config.shortLabel}</span>
      </Badge>;
  }
  function handleRecordPurchase(demand: Demand) {
    setSelectedDemand(demand);
    setPurchaseDialogOpen(true);
  }
  return <div className="min-h-screen flex flex-col pb-24 sm:pb-0">
      <div className="flex-none px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Commandes de Produits</h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="Filtrer" />
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
      </div>

      <Card className="flex-1 mx-4 sm:mx-6 mb-4">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-background">
              <TableRow>
                <TableHead className="w-16 sm:w-24">Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="w-12 sm:w-16">Qté</TableHead>
                <TableHead className="w-20 sm:w-24">Statut</TableHead>
                {isAdmin && <TableHead className="w-20 sm:w-32">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDemands.map(demand => <TableRow key={demand.id}>
                  <TableCell className="text-xs">
                    {format(new Date(demand.requested_at), "dd/MM")}
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">{demand.products.name}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{demand.quantity}</TableCell>
                  <TableCell>{getStatusBadge(demand.status)}</TableCell>
                  {isAdmin && <TableCell>
                      <div className="flex flex-col gap-1">
                        {demand.status === "pending" && <>
                            <Button size="sm" variant="outline" onClick={() => updateDemandStatus(demand.id, "in_stock")} className="w-full h-8 px-2 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Stock
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => updateDemandStatus(demand.id, "cancelled")} className="w-full h-8 px-2 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Annuler
                            </Button>
                          </>}
                        {demand.status === "in_stock" && <Button size="sm" onClick={() => handleRecordPurchase(demand)} className="w-full h-8 px-2 text-xs">
                            Achat
                          </Button>}
                      </div>
                    </TableCell>}
                </TableRow>)}
              {filteredDemands.length === 0 && <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground text-sm py-8">
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(isAdmin || permissions.can_create_demands) && <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50 sm:static sm:border-0 sm:shadow-none sm:px-6 sm:pb-6 sm:mt-0">
          <Button onClick={() => setDemandDialogOpen(true)} className="w-full sm:w-auto h-12 sm:h-10 text-neutral-100 bg-emerald-800 hover:bg-emerald-700">
            <Plus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
            Nouvelle Commande
          </Button>
        </div>}

      <DemandDialog open={demandDialogOpen} onOpenChange={setDemandDialogOpen} onSuccess={loadDemands} />

      {selectedDemand && <PurchaseDialog open={purchaseDialogOpen} onClose={() => {
      setPurchaseDialogOpen(false);
      loadDemands();
    }} demandId={selectedDemand.id} prefilledProductId={selectedDemand.product_id} prefilledQuantity={selectedDemand.quantity} />}
    </div>;
}