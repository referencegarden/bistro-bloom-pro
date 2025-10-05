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
import { Badge } from "@/components/ui/badge";
import { ProductDialog } from "@/components/ProductDialog";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  unit_price: number;
  low_stock_threshold: number;
  category_id: string | null;
  categories?: { name: string } | null;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("name");

    if (error) {
      toast.error("Failed to load products");
      return;
    }

    setProducts(data || []);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your inventory</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.categories?.name || "N/A"}</TableCell>
                <TableCell>{product.current_stock}</TableCell>
                <TableCell>${product.unit_price.toFixed(2)}</TableCell>
                <TableCell>
                  {product.current_stock <= product.low_stock_threshold ? (
                    <Badge variant="destructive">Low Stock</Badge>
                  ) : (
                    <Badge variant="secondary">In Stock</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        product={editingProduct}
      />
    </div>
  );
}
