import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
}

interface SupplierDialogProps {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierDialog({ open, onClose, supplier }: SupplierDialogProps) {
  const { tenantId } = useTenant();
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact: supplier.contact || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
      });
    } else {
      setFormData({
        name: "",
        contact: "",
        phone: "",
        email: "",
      });
    }
  }, [supplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tenantId) {
      toast.error("Restaurant context not loaded. Please try again.");
      return;
    }

    const data = {
      name: formData.name,
      contact: formData.contact || null,
      phone: formData.phone || null,
      email: formData.email || null,
    };

    if (supplier) {
      const { error } = await supabase
        .from("suppliers")
        .update(data)
        .eq("id", supplier.id);

      if (error) {
        toast.error("Failed to update supplier");
        return;
      }
      toast.success("Supplier updated");
    } else {
      const { error } = await supabase.from("suppliers").insert({
        ...data,
        tenant_id: tenantId,
      });

      if (error) {
        toast.error("Failed to create supplier");
        return;
      }
      toast.success("Supplier created");
    }

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{supplier ? "Modifier Fournisseur" : "Ajouter Fournisseur"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="contact">Personne Contact</Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" className="w-full sm:w-auto">{supplier ? "Modifier" : "Créer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
