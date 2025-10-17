import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  sales_price: number;
}

interface Employee {
  id: string;
  name: string;
  position: string | null;
}

interface SaleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SaleDialog({ open, onClose }: SaleDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    employee_id: "",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadProducts();
      loadEmployees();
      setFormData({
        product_id: "",
        employee_id: "",
        quantity: 1,
        notes: "",
      });
    }
  }, [open]);

  async function loadProducts() {
const { data } = await supabase
      .from("products")
      .select("id, name, current_stock, sales_price")
      .order("name");
    setProducts(data || []);
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, position")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Échec du chargement des employés");
      return;
    }

    setEmployees(data || []);
  }

  function handleProductChange(productId: string) {
    setFormData({
      ...formData,
      product_id: productId,
    });
    setProductSearchOpen(false);
  }

  const selectedProduct = products.find(p => p.id === formData.product_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const product = products.find((p) => p.id === formData.product_id);
    if (!product) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    if (!formData.employee_id) {
      toast.error("Veuillez sélectionner un employé");
      return;
    }

    if (formData.quantity > product.current_stock) {
      toast.error(`Stock insuffisant. Disponible: ${product.current_stock}`);
      return;
    }

const unitPrice = typeof product.sales_price === "number" ? product.sales_price : 0;
    const { error } = await supabase.from("sales").insert({
      product_id: formData.product_id,
      employee_id: formData.employee_id,
      quantity: formData.quantity,
      unit_price: unitPrice,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Échec d'enregistrement de la vente");
      return;
    }

    toast.success("Sortie enregistrée avec succès");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
<DialogHeader>
          <DialogTitle>Enregistrer Sortie</DialogTitle>
          <DialogDescription>Sélectionnez le produit, l’employé et la quantité. Le prix unitaire utilise le prix de vente du produit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Produit</Label>
            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedProduct ? `${selectedProduct.name} (Stock: ${selectedProduct.current_stock})` : "Rechercher un produit..."}
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
                          onSelect={() => handleProductChange(product.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.product_id === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {product.name} (Stock: {product.current_stock})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="employee">Employé *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) =>
                setFormData({ ...formData, employee_id: value })
              }
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                    {employee.position && ` (${employee.position})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Ajouter des notes sur cette vente..."
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Enregistrer Sortie</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
