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
  products: { name: string } | null;
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    const { data, error } = await supabase
      .from("sales")
      .select("*, products(name)")
      .order("sale_date", { ascending: false });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">Record product sales</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Sale
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  {format(new Date(sale.sale_date), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">
                  {sale.products?.name || "N/A"}
                </TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell>{sale.unit_price.toFixed(2)} DH</TableCell>
                <TableCell className="font-semibold">
                  {sale.total_price.toFixed(2)} DH
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {sale.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SaleDialog open={dialogOpen} onClose={handleDialogClose} />
    </div>
  );
}
