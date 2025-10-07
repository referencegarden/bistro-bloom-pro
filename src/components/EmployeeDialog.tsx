import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Employee {
  id: string;
  name: string;
  employee_number: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface EmployeeDialogProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

export function EmployeeDialog({ open, employee, onClose }: EmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    employee_number: "",
    position: "",
    phone: "",
    email: "",
    is_active: true,
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        employee_number: employee.employee_number || "",
        position: employee.position || "",
        phone: employee.phone || "",
        email: employee.email || "",
        is_active: employee.is_active,
      });
    } else {
      setFormData({
        name: "",
        employee_number: "",
        position: "",
        phone: "",
        email: "",
        is_active: true,
      });
    }
  }, [employee, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const data = {
      name: formData.name.trim(),
      employee_number: formData.employee_number.trim() || null,
      position: formData.position.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      is_active: formData.is_active,
    };

    if (employee) {
      const { error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", employee.id);

      if (error) {
        toast.error("Échec de la mise à jour de l'employé");
        return;
      }

      toast.success("Employé mis à jour avec succès");
    } else {
      const { error } = await supabase.from("employees").insert(data);

      if (error) {
        toast.error("Échec de la création de l'employé");
        return;
      }

      toast.success("Employé créé avec succès");
    }

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {employee ? "Modifier Employé" : "Ajouter Employé"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom Complet *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Ahmed Benani"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_number">Numéro d'Employé</Label>
            <Input
              id="employee_number"
              value={formData.employee_number}
              onChange={(e) =>
                setFormData({ ...formData, employee_number: e.target.value })
              }
              placeholder="Ex: EMP001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Poste</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
              placeholder="Ex: Serveur"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="Ex: +212 6XX XXX XXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Ex: ahmed@example.com"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Statut Actif</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {employee ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
