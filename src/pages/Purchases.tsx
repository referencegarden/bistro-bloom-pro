import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ShoppingCart } from "lucide-react";
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
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { PurchaseMultiDialog } from "@/components/PurchaseMultiDialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Purchase {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
  notes: string | null;
  product_id: string;
  supplier_id: string | null;
  employee_id: string | null;
  products: { name: string } | null;
  suppliers: { name: string } | null;
}

const ITEMS_PER_PAGE = 10;

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [multiDialogOpen, setMultiDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadPurchases();
  }, [currentPage]);

  async function loadPurchases() {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("purchases")
      .select("*, products(name), suppliers(name)", { count: 'exact' })
      .order("purchase_date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      toast.error("Failed to load purchases");
      return;
    }

    setPurchases(data || []);
    setTotalCount(count || 0);
  }

  async function handleDelete(purchaseId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet achat?")) return;

    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchaseId);

    if (error) {
      toast.error("Échec de la suppression de l'achat");
      return;
    }

    toast.success("Achat supprimé avec succès");
    loadPurchases();
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingPurchase(undefined);
    loadPurchases();
  }

  function handleMultiDialogClose() {
    setMultiDialogOpen(false);
    loadPurchases();
  }

  function handleEdit(purchase: Purchase) {
    setEditingPurchase(purchase);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Achats</h1>
          <p className="text-muted-foreground">Enregistrer les achats</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Enregistrer Achat
          </Button>
          <Button onClick={() => setMultiDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Achats Multiples
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead className="hidden sm:table-cell">Fournisseur</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead className="hidden sm:table-cell">Coût Unitaire</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden md:table-cell">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="hidden sm:table-cell">{purchase.suppliers?.name || "N/A"}</TableCell>
                <TableCell>{purchase.quantity}</TableCell>
                <TableCell className="hidden sm:table-cell">{purchase.unit_cost.toFixed(2)} DH</TableCell>
                <TableCell className="font-semibold">
                  {Number(purchase.total_cost ?? (purchase.unit_cost * purchase.quantity)).toFixed(2)} DH
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {purchase.notes || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(purchase)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(purchase.id)}
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

      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount} achats
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

      <PurchaseDialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
        purchase={editingPurchase}
      />

      <PurchaseMultiDialog
        open={multiDialogOpen}
        onClose={handleMultiDialogClose}
      />
    </div>
  );
}
