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
  cost_price: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Purchase {
  id: string;
  product_id: string;
  supplier_id: string | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
}

interface PurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  demandId?: string;
  prefilledProductId?: string;
  prefilledQuantity?: number;
  purchase?: Purchase;
}



export function PurchaseDialog({ open, onClose, demandId, prefilledProductId, prefilledQuantity, purchase }: PurchaseDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    supplier_id: "",
    quantity: 1,
    unit_cost: 0,
    notes: "",
  });

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (purchase) {
      // Editing existing purchase
      setFormData({
        product_id: purchase.product_id,
        supplier_id: purchase.supplier_id || "",
        quantity: purchase.quantity,
        unit_cost: purchase.unit_cost,
        notes: purchase.notes || "",
      });
    } else if (prefilledProductId) {
      // New purchase with prefilled product
      const product = products.find(p => p.id === prefilledProductId);
      setFormData(prev => ({
        ...prev,
        product_id: prefilledProductId,
        quantity: prefilledQuantity || 1,
        unit_cost: product?.cost_price || 0,
      }));
    }
  }, [purchase, prefilledProductId, prefilledQuantity, products]);

  async function loadProducts() {
    const { data } = await supabase.from("products").select("id, name, cost_price").order("name");
    setProducts(data || []);
  }

  async function loadSuppliers() {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  }

  function handleProductChange(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        product_id: productId,
        unit_cost: product.cost_price,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.product_id) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    if (purchase) {
      // Update existing purchase
      const { error: purchaseError } = await supabase
        .from("purchases")
        .update({
          product_id: formData.product_id,
          supplier_id: formData.supplier_id || null,
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          notes: formData.notes || null,
        })
        .eq("id", purchase.id);

      if (purchaseError) {
        toast.error("Échec de modification de l'achat");
        return;
      }

      toast.success("Achat modifié avec succès");
    } else {
      // Insert new purchase
      const { error: purchaseError } = await supabase.from("purchases").insert({
        product_id: formData.product_id,
        supplier_id: formData.supplier_id || null,
        quantity: formData.quantity,
        unit_cost: formData.unit_cost,
        notes: formData.notes || null,
        demand_id: demandId || null,
      });

      if (purchaseError) {
        toast.error("Échec d'enregistrement de l'achat");
        return;
      }

      toast.success("Achat enregistré avec succès");
    }

    // Update product's cost_price and supplier_id
    const { error: updateError } = await supabase
      .from("products")
      .update({
        cost_price: formData.unit_cost,
        supplier_id: formData.supplier_id || null,
      })
      .eq("id", formData.product_id);

    if (updateError) {
      toast.error("Échec de mise à jour du produit");
      return;
    }

    resetForm();
    onClose();
  }

  function resetForm() {
    setFormData({ product_id: "", supplier_id: "", quantity: 1, unit_cost: 0, notes: "" });
  }

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{purchase ? "Modifier Achat" : "Enregistrer Achat"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Produit</Label>
            <Select
              value={formData.product_id}
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner produit" />
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
            <Label htmlFor="supplier">Fournisseur</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) =>
                setFormData({ ...formData, supplier_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner fournisseur (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unit_cost">Coût Unitaire (DH)</Label>
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
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ajouter des notes sur cet achat..."
            />
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {purchase ? "Modifier Achat" : "Enregistrer Achat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}