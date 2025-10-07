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
  current_stock: number;
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
      .select("id, name, current_stock")
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
  }

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

    const { error } = await supabase.from("sales").insert({
      product_id: formData.product_id,
      employee_id: formData.employee_id,
      quantity: formData.quantity,
      unit_price: null,
      total_price: null,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer Sortie</DialogTitle>
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
                    {product.name} (Stock: {product.current_stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Ajouter des notes sur cette vente..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer Sortie</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
