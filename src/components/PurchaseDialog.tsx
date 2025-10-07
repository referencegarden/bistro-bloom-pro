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
import { Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  cost_price: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseDialogProps {
  open: boolean;
  onClose: () => void;
}

const UNIT_OPTIONS = ["kg", "litre", "pièce", "unité", "gramme", "ml", "boîte", "paquet"];

export function PurchaseDialog({ open, onClose }: PurchaseDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    supplier_id: "",
    quantity: 1,
    unit_cost: 0,
    notes: "",
  });
  const [newProductData, setNewProductData] = useState({
    name: "",
    unit_of_measure: "unité",
    supplier_id: "",
    cost_price: 0,
  });

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

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

  async function createProductAndPurchase() {
    if (!newProductData.name) {
      toast.error("Veuillez entrer le nom du produit");
      return;
    }

    // Create the product first
    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert({
        name: newProductData.name,
        unit_of_measure: newProductData.unit_of_measure,
        supplier_id: newProductData.supplier_id || null,
        cost_price: newProductData.cost_price,
        sales_price: 0,
        current_stock: 0,
        low_stock_threshold: 10,
      })
      .select()
      .single();

    if (productError) {
      toast.error("Échec de création du produit");
      return;
    }

    // Create the purchase with the new product
    const { error: purchaseError } = await supabase.from("purchases").insert({
      product_id: newProduct.id,
      supplier_id: newProductData.supplier_id || null,
      quantity: formData.quantity,
      unit_cost: newProductData.cost_price,
      notes: formData.notes || null,
    });

    if (purchaseError) {
      toast.error("Échec d'enregistrement de l'achat");
      return;
    }

    toast.success("Produit créé et achat enregistré avec succès");
    resetForm();
    onClose();
    loadProducts();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isCreatingProduct) {
      await createProductAndPurchase();
      return;
    }

    if (!formData.product_id) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    const { error } = await supabase.from("purchases").insert({
      product_id: formData.product_id,
      supplier_id: formData.supplier_id || null,
      quantity: formData.quantity,
      unit_cost: formData.unit_cost,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Échec d'enregistrement de l'achat");
      return;
    }

    toast.success("Achat enregistré avec succès");
    resetForm();
    onClose();
  }

  function resetForm() {
    setFormData({ product_id: "", supplier_id: "", quantity: 1, unit_cost: 0, notes: "" });
    setNewProductData({ name: "", unit_of_measure: "unité", supplier_id: "", cost_price: 0 });
    setIsCreatingProduct(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer Achat</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={!isCreatingProduct ? "default" : "outline"}
            onClick={() => setIsCreatingProduct(false)}
            className="flex-1"
          >
            Produit Existant
          </Button>
          <Button
            type="button"
            variant={isCreatingProduct ? "default" : "outline"}
            onClick={() => setIsCreatingProduct(true)}
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Produit
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isCreatingProduct ? (
            <>
              <div>
                <Label htmlFor="new-product-name">Nom du Produit</Label>
                <Input
                  id="new-product-name"
                  value={newProductData.name}
                  onChange={(e) =>
                    setNewProductData({ ...newProductData, name: e.target.value })
                  }
                  required
                  placeholder="Ex: Tomate"
                />
              </div>
              <div>
                <Label htmlFor="unit-of-measure">Unité de Mesure</Label>
                <Select
                  value={newProductData.unit_of_measure}
                  onValueChange={(value) =>
                    setNewProductData({ ...newProductData, unit_of_measure: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-supplier">Fournisseur</Label>
                <Select
                  value={newProductData.supplier_id}
                  onValueChange={(value) =>
                    setNewProductData({ ...newProductData, supplier_id: value })
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
                <Label htmlFor="new-cost-price">Prix de Revient (DH)</Label>
                <Input
                  id="new-cost-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProductData.cost_price}
                  onChange={(e) =>
                    setNewProductData({ ...newProductData, cost_price: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
          
          <div>
            <Label htmlFor="quantity">Quantité</Label>
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
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ajouter des notes sur cet achat..."
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Annuler
            </Button>
            <Button type="submit">
              {isCreatingProduct ? "Créer et Enregistrer" : "Enregistrer Achat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}