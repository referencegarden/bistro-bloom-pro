import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductDialog } from "@/components/ProductDialog";
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
interface Product {
  id: string;
  name: string;
  current_stock: number;
  sales_price: number;
  cost_price: number;
  low_stock_threshold: number;
  category_id: string | null;
  supplier_id: string | null;
  unit_of_measure?: string;
  categories?: {
    name: string;
  } | null;
  suppliers?: {
    name: string;
  } | null;
}
export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    loadProducts();
  }, []);
  async function loadProducts() {
    const {
      data,
      error
    } = await supabase.from("products").select("*, categories(name), suppliers(name)").order("name");
    if (error) {
      toast.error("Failed to load products");
      return;
    }
    setProducts(data || []);
    setCurrentPage(1);
  }

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query) || product.categories?.name.toLowerCase().includes(query) || product.suppliers?.name.toLowerCase().includes(query);
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  function handleEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }
  async function handleDelete(id: string) {
    const {
      error
    } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete product");
      return;
    }
    toast.success("Product deleted");
    loadProducts();
  }
  function handleDialogClose() {
    setDialogOpen(false);
    setEditingProduct(null);
    loadProducts();
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">Gérer votre inventaire</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter Produit
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, catégorie, fournisseur..." value={searchQuery} onChange={e => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }} className="pl-9" />
        </div>
        {searchQuery && <p className="text-sm text-muted-foreground">
            {filteredProducts.length} résultat{filteredProducts.length !== 1 ? "s" : ""} trouvé{filteredProducts.length !== 1 ? "s" : ""}
          </p>}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Prix Coût</TableHead>
              <TableHead>Prix Vente</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "Aucun produit trouvé" : "Aucun produit"}
                </TableCell>
              </TableRow> : paginatedProducts.map(product => <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.unit_of_measure || "unité"}</TableCell>
                  <TableCell>{product.categories?.name || "N/A"}</TableCell>
                  <TableCell>{product.suppliers?.name || "N/A"}</TableCell>
                  <TableCell>{product.current_stock}</TableCell>
                  <TableCell>{product.cost_price.toFixed(2)} DH</TableCell>
                  <TableCell>{product.sales_price.toFixed(2)} DH</TableCell>
                  <TableCell>
                    {product.current_stock <= product.low_stock_threshold ? <Badge variant="destructive">Stock Faible</Badge> : <Badge variant="secondary" className="bg-yellow-400">En Stock</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                      Modifier
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
              {Array.from({
            length: totalPages
          }, (_, i) => i + 1).map(page => <PaginationItem key={page}>
                  <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                    {page}
                  </PaginationLink>
                </PaginationItem>)}
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>}

      <ProductDialog open={dialogOpen} onClose={handleDialogClose} product={editingProduct} />
    </div>;
}