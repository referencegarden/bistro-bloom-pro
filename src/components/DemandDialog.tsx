import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

interface Product {
  id: string;
  name: string;
}

interface DemandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DemandDialog({ open, onOpenChange, onSuccess }: DemandDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const { isAdmin, permissions } = useEmployeePermissions();

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .order("name");
    
    if (data) {
      setProducts(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check permission
    if (!isAdmin && !permissions.can_create_demands) {
      toast.error("Vous n'avez pas la permission de créer des demandes");
      return;
    }

    setLoading(true);

    try {
      // Get current employee ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!employee) {
        toast.error("Vous devez avoir un compte employé pour créer une demande");
        return;
      }

      const { error } = await supabase
        .from("product_demands")
        .insert({
          product_id: formData.product_id,
          requested_by: employee.id,
          quantity: formData.quantity,
          notes: formData.notes || null,
        });

      if (error) throw error;

      toast.success("Demande créée avec succès");
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating demand:", error);
      toast.error("Erreur lors de la création de la demande");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      product_id: "",
      quantity: 1,
      notes: "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle Demande de Produit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Produit *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
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

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations supplémentaires..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer la Demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
