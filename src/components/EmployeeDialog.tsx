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
  pin_enabled: boolean;
  pin_hash: string | null;
}

interface EmployeeDialogProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

interface EmployeePermissions {
  can_make_sales: boolean;
  can_view_products: boolean;
  can_view_reports: boolean;
  can_manage_stock: boolean;
  can_create_demands: boolean;
}

export function EmployeeDialog({ open, employee, onClose }: EmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    employee_number: "",
    position: "",
    phone: "",
    email: "",
    is_active: true,
    pin_enabled: false,
    pin: "",
  });
  const [permissions, setPermissions] = useState<EmployeePermissions>({
    can_make_sales: true,
    can_view_products: true,
    can_view_reports: false,
    can_manage_stock: false,
    can_create_demands: true,
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
        pin_enabled: employee.pin_enabled && !!employee.pin_hash,
        pin: "",
      });

      // Load permissions
      supabase
        .from("employee_permissions")
        .select("*")
        .eq("employee_id", employee.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setPermissions({
              can_make_sales: data.can_make_sales,
              can_view_products: data.can_view_products,
              can_view_reports: data.can_view_reports,
              can_manage_stock: data.can_manage_stock,
              can_create_demands: data.can_create_demands ?? true,
            });
          }
        });
    } else {
      setFormData({
        name: "",
        employee_number: "",
        position: "",
        phone: "",
        email: "",
        is_active: true,
        pin_enabled: false,
        pin: "",
      });
      setPermissions({
        can_make_sales: true,
        can_view_products: true,
        can_view_reports: false,
        can_manage_stock: false,
        can_create_demands: true,
      });
    }
  }, [employee, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    // Determine PIN state transitions
    const effectiveWasEnabled = !!employee?.pin_enabled && !!employee?.pin_hash;
    const effectiveWillBeEnabled = formData.pin_enabled;
    const isDisabling = effectiveWasEnabled && !effectiveWillBeEnabled;
    const isEnabling = !effectiveWasEnabled && effectiveWillBeEnabled;

    // If enabling PIN for first time, require a PIN
    if (isEnabling && !formData.pin.trim()) {
      toast.error("Veuillez saisir un code PIN");
      return;
    }

    // Check PIN format if provided
    if (formData.pin.trim() && formData.pin.trim().length < 4) {
      toast.error("Le code PIN doit contenir au moins 4 chiffres");
      return;
    }

    // Build base data
    const data: any = {
      name: formData.name.trim(),
      employee_number: formData.employee_number.trim() || null,
      position: formData.position.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      is_active: formData.is_active,
      pin_enabled: formData.pin_enabled,
    };

    // Handle pin_hash based on state transitions
    if (isDisabling) {
      // Explicitly disable: clear the hash
      data.pin_hash = null;
    } else if (formData.pin_enabled && formData.pin.trim()) {
      // New PIN provided: encode and save
      data.pin_hash = btoa(formData.pin.trim());
    } else if (!employee) {
      // Creating new employee without PIN: set null
      data.pin_hash = null;
    }
    // If editing and PIN enabled but no new PIN provided: don't include pin_hash (preserve existing)

    let employeeId = employee?.id;

    if (employee) {
      const { error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", employee.id);

      if (error) {
        toast.error("Échec de la mise à jour de l'employé");
        return;
      }
    } else {
      const { data: newEmployee, error } = await supabase
        .from("employees")
        .insert(data)
        .select()
        .single();

      if (error) {
        toast.error("Échec de la création de l'employé");
        return;
      }

      employeeId = newEmployee.id;
    }

    // Update permissions
    if (employeeId) {
    const { error: permError } = await supabase
      .from("employee_permissions")
      .upsert({
        employee_id: employeeId,
        can_make_sales: permissions.can_make_sales,
        can_view_products: permissions.can_view_products,
        can_view_reports: permissions.can_view_reports,
        can_manage_stock: permissions.can_manage_stock,
        can_create_demands: permissions.can_create_demands,
      }, {
        onConflict: 'employee_id'
      });

      if (permError) {
        toast.error("Échec de la mise à jour des permissions");
        return;
      }
    }

    toast.success(employee ? "Employé mis à jour avec succès" : "Employé créé avec succès");

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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

          <div className="flex items-center justify-between">
            <Label htmlFor="pin_enabled">Activer Code PIN</Label>
            <Switch
              id="pin_enabled"
              checked={formData.pin_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, pin_enabled: checked, pin: "" })
              }
            />
          </div>

          {formData.pin_enabled && (
            <div className="space-y-2">
              <Label htmlFor="pin">
                Code PIN (4-6 chiffres) {!employee?.pin_enabled && "*"}
              </Label>
              <Input
                id="pin"
                type="password"
                value={formData.pin}
                onChange={(e) =>
                  setFormData({ ...formData, pin: e.target.value })
                }
                placeholder={employee?.pin_enabled ? "Laisser vide pour garder l'actuel" : "****"}
                maxLength={6}
              />
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Permissions</h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="can_make_sales">Peut faire des ventes</Label>
              <Switch
                id="can_make_sales"
                checked={permissions.can_make_sales}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_make_sales: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="can_view_products">Peut voir les produits</Label>
              <Switch
                id="can_view_products"
                checked={permissions.can_view_products}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_view_products: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="can_view_reports">Peut voir les rapports</Label>
              <Switch
                id="can_view_reports"
                checked={permissions.can_view_reports}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_view_reports: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="can_manage_stock">Peut gérer le stock</Label>
              <Switch
                id="can_manage_stock"
                checked={permissions.can_manage_stock}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_manage_stock: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="can_create_demands">Peut créer des demandes</Label>
              <Switch
                id="can_create_demands"
                checked={permissions.can_create_demands}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_create_demands: checked })
                }
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {employee ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
