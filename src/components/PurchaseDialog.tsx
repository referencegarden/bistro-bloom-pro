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
}

interface PurchaseDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PurchaseDialog({ open, onClose }: PurchaseDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    unit_cost: 0,
    notes: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data } = await supabase.from("products").select("id, name").order("name");
    setProducts(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.product_id) {
      toast.error("Please select a product");
      return;
    }

    const { error } = await supabase.from("purchases").insert({
      product_id: formData.product_id,
      quantity: formData.quantity,
      unit_cost: formData.unit_cost,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Failed to record purchase");
      return;
    }

    toast.success("Purchase recorded successfully");
    setFormData({ product_id: "", quantity: 1, unit_cost: 0, notes: "" });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Product</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) =>
                setFormData({ ...formData, product_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
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
            <Label htmlFor="unit_cost">Unit Cost ($)</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_cost}
              onChange={(e) =>
                setFormData({ ...formData, unit_cost: Number(e.target.value) })
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
              placeholder="Add notes about this purchase..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Record Purchase</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
