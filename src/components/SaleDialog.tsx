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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sales_price: number;
  current_stock: number;
}

interface SaleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SaleDialog({ open, onClose }: SaleDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    unit_price: 0,
    notes: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }

  function handleProductChange(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        product_id: productId,
        unit_price: product.sales_price,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const product = products.find((p) => p.id === formData.product_id);
    if (!product) {
      toast.error("Please select a product");
      return;
    }

    if (formData.quantity > product.current_stock) {
      toast.error(`Not enough stock. Available: ${product.current_stock}`);
      return;
    }

    const { error } = await supabase.from("sales").insert({
      product_id: formData.product_id,
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Failed to record sale");
      return;
    }

    toast.success("Sale recorded successfully");
    setFormData({ product_id: "", quantity: 1, unit_price: 0, notes: "" });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Product</Label>
            <Select
              value={formData.product_id}
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stock: {product.current_stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="unit_price">Unit Price (DH)</Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_price}
              onChange={(e) =>
                setFormData({ ...formData, unit_price: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this sale..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Record Sale</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
