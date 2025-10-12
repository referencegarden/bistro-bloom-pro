import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SaleDialog } from "@/components/SaleDialog";
import { toast } from "sonner";
import { format } from "date-fns";
interface Sale {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  notes: string | null;
  products: {
    name: string;
  } | null;
  employees: {
    name: string;
  } | null;
}
export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    loadSales();
  }, []);
  async function loadSales() {
    const {
      data,
      error
    } = await supabase.from("sales").select("*, products(name), employees(name)").order("sale_date", {
      ascending: false
    });
    if (error) {
      toast.error("Failed to load sales");
      return;
    }
    setSales(data || []);
  }
  function handleDialogClose() {
    setDialogOpen(false);
    loadSales();
  }
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sortie de Stock</h1>
          <p className="text-muted-foreground">Enregistrer les sorties de stock</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto bg-green-900 hover:bg-green-800 font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          Enregistrer Sortie
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead className="hidden sm:table-cell">Employé</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map(sale => <TableRow key={sale.id}>
                <TableCell>
                  {format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">
                  {sale.products?.name || "N/A"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {sale.employees?.name || "-"}
                </TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {sale.notes || "-"}
                </TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </div>

      <SaleDialog open={dialogOpen} onClose={handleDialogClose} />
    </div>;
}