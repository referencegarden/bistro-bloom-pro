import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
}

interface DemandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledProductId?: string;
}

export function DemandDialog({ open, onOpenChange, onSuccess, prefilledProductId }: DemandDialogProps) {
  const { tenantId } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isAdmin, permissions } = useEmployeePermissions();

  useEffect(() => {
    if (open) {
      loadProducts();
      if (prefilledProductId) {
        setFormData(prev => ({ ...prev, product_id: prefilledProductId }));
      }
    }
  }, [open, prefilledProductId]);

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

    if (!tenantId) {
      toast.error("Restaurant context not loaded. Please try again.");
      return;
    }

    // Check permission
    if (!isAdmin && !permissions.can_create_demands) {
      toast.error("Vous n'avez pas la permission de créer des commandes");
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
        toast.error("Vous devez avoir un compte employé pour créer une commande");
        return;
      }

      const { error } = await supabase
        .from("product_demands")
        .insert({
          product_id: formData.product_id,
          requested_by: employee.id,
          quantity: formData.quantity,
          notes: formData.notes || null,
          tenant_id: tenantId,
        });

      if (error) throw error;

      toast.success("Commande créée avec succès");
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating demand:", error);
      toast.error("Erreur lors de la création de la commande");
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
    setSearchOpen(false);
  }

  const selectedProduct = products.find(p => p.id === formData.product_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 mx-2">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Nouvelle Commande de Produit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {!prefilledProductId && (
              <div className="space-y-2">
                <Label>Produit *</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between"
                    >
                      {selectedProduct ? selectedProduct.name : "Rechercher un produit..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher un produit..." />
                      <CommandList>
                        <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setFormData({ ...formData, product_id: product.id });
                                setSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.product_id === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {prefilledProductId && (
              <div className="space-y-2">
                <Label>Produit</Label>
                <Input value={selectedProduct?.name || ""} disabled />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
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

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Création..." : "Commander"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
