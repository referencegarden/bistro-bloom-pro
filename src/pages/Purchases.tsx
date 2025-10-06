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
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Purchase {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
  notes: string | null;
  products: { name: string } | null;
  suppliers: { name: string } | null;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    const { data, error } = await supabase
      .from("purchases")
      .select("*, products(name), suppliers(name)")
      .order("purchase_date", { ascending: false });

    if (error) {
      toast.error("Failed to load purchases");
      return;
    }

    setPurchases(data || []);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    loadPurchases();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achats</h1>
          <p className="text-muted-foreground">Enregistrer les achats</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Enregistrer Achat
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Coût Unitaire</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell>
                  {format(new Date(purchase.purchase_date), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">
                  {purchase.products?.name || "N/A"}
                </TableCell>
                <TableCell>{purchase.suppliers?.name || "N/A"}</TableCell>
                <TableCell>{purchase.quantity}</TableCell>
                <TableCell>{purchase.unit_cost.toFixed(2)} DH</TableCell>
                <TableCell className="font-semibold">
                  {purchase.total_cost.toFixed(2)} DH
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {purchase.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PurchaseDialog open={dialogOpen} onClose={handleDialogClose} />
    </div>
  );
}
