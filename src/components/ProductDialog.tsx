import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string | null;
  supplier_id: string | null;
  current_stock: number;
  sales_price: number;
  cost_price: number;
  low_stock_threshold: number;
}

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    supplier_id: "",
    current_stock: 0,
    sales_price: 0,
    cost_price: 0,
    low_stock_threshold: 10,
  });

  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category_id: product.category_id || "",
        supplier_id: product.supplier_id || "",
        current_stock: product.current_stock,
        sales_price: product.sales_price,
        cost_price: product.cost_price,
        low_stock_threshold: product.low_stock_threshold,
      });
    } else {
      setFormData({
        name: "",
        category_id: "",
        supplier_id: "",
        current_stock: 0,
        sales_price: 0,
        cost_price: 0,
        low_stock_threshold: 10,
      });
    }
  }, [product]);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  }

  async function loadSuppliers() {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      ...formData,
      category_id: formData.category_id || null,
      supplier_id: formData.supplier_id || null,
    };

    if (product) {
      const { error } = await supabase
        .from("products")
        .update(data)
        .eq("id", product.id);

      if (error) {
        toast.error("Failed to update product");
        return;
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(data);

      if (error) {
        toast.error("Failed to create product");
        return;
      }
      toast.success("Product created");
    }

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) =>
                setFormData({ ...formData, supplier_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={sup.id}>
                    {sup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="stock">Current Stock</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.current_stock}
              onChange={(e) =>
                setFormData({ ...formData, current_stock: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="cost_price">Cost Price (DH)</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price}
              onChange={(e) =>
                setFormData({ ...formData, cost_price: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="sales_price">Sales Price (DH)</Label>
            <Input
              id="sales_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.sales_price}
              onChange={(e) =>
                setFormData({ ...formData, sales_price: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="threshold">Low Stock Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              value={formData.low_stock_threshold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  low_stock_threshold: Number(e.target.value),
                })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
