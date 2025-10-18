import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
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
  employees: { name: string } | null;
}

const ITEMS_PER_PAGE = 10;

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadSales();
  }, [currentPage]);

  async function loadSales() {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("sales")
      .select("*, products(name), employees(name)", { count: 'exact' })
      .order("sale_date", { ascending: false })
      .range(from, to);

    if (error) {
      toast.error("Failed to load sales");
      return;
    }

    setSales(data || []);
    setTotalCount(count || 0);
  }

  async function handleDelete(saleId: string) {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette sortie?")) return;

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId);

    if (error) {
      toast.error("Échec de l'annulation de la sortie");
      return;
    }

    toast.success("Sortie annulée avec succès");
    loadSales();
  }

  function handleDialogClose() {
    setDialogOpen(false);
    loadSales();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sortie de Stock</h1>
          <p className="text-muted-foreground">Enregistrer les sorties de stock</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
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
            <TableHead className="w-[60px]">Actions</TableHead>
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
                <TableCell className="hidden sm:table-cell">
                  {sale.employees?.name || "-"}
                </TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {sale.notes || "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(sale.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount} sorties
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
              </PaginationItem>
              {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                .filter(page => {
                  const distance = Math.abs(page - currentPage);
                  return distance === 0 || distance === 1 || page === 1 || page === Math.ceil(totalCount / ITEMS_PER_PAGE);
                })
                .map((page, idx, arr) => {
                  if (idx > 0 && page - arr[idx - 1] > 1) {
                    return [
                      <PaginationItem key={`ellipsis-${page}`}>
                        <PaginationEllipsis />
                      </PaginationItem>,
                      <PaginationItem key={page}>
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    ];
                  }
                  return (
                    <PaginationItem key={page}>
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  );
                })}
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                >
                  Suivant
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <SaleDialog open={dialogOpen} onClose={handleDialogClose} />
    </div>
  );
}
