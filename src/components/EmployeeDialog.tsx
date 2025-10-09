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
import { Separator } from "@/components/ui/separator";
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

  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  
  const [permissions, setPermissions] = useState({
    can_make_sales: true,
    can_view_products: true,
    can_view_reports: false,
    can_manage_stock: false,
  });

  useEffect(() => {
    if (employee && open) {
      setFormData({
        name: employee.name,
        employee_number: employee.employee_number || "",
        position: employee.position || "",
        phone: employee.phone || "",
        email: employee.email || "",
        is_active: employee.is_active,
      });
      setPinEnabled((employee as any).pin_enabled || false);
      
      // Load existing permissions
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
      });
      setPinEnabled(false);
      setPermissions({
        can_make_sales: true,
        can_view_products: true,
        can_view_reports: false,
        can_manage_stock: false,
      });
    }
    setPin("");
    setPinConfirm("");
  }, [employee, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (pinEnabled) {
      if (!pin || pin.length < 4 || pin.length > 6) {
        toast.error("Le PIN doit contenir entre 4 et 6 chiffres");
        return;
      }
      if (pin !== pinConfirm) {
        toast.error("Les codes PIN ne correspondent pas");
        return;
      }
    }

    try {
      let employeeId = employee?.id;
      const data: any = {
        name: formData.name.trim(),
        employee_number: formData.employee_number.trim() || null,
        position: formData.position.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        is_active: formData.is_active,
      };

      // Handle PIN hashing if enabled
      if (pinEnabled && pin) {
        // Simple hash for PIN (in production, use proper bcrypt via edge function)
        data.pin_hash = btoa(pin); // Base64 encoding as simple hash
        data.pin_enabled = true;
      } else if (!pinEnabled) {
        data.pin_enabled = false;
      }

      if (employee) {
        const { error } = await supabase
          .from("employees")
          .update(data)
          .eq("id", employee.id);

        if (error) throw error;
        
        // Update permissions
        await supabase
          .from("employee_permissions")
          .update(permissions)
          .eq("employee_id", employee.id);
        
        toast.success("Employé mis à jour avec succès");
      } else {
        const { data: newEmployee, error } = await supabase
          .from("employees")
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        employeeId = newEmployee.id;

        // Create permissions with selected values
        await supabase.from("employee_permissions").insert({
          employee_id: employeeId,
          ...permissions,
        });

        if (pinEnabled) {
          toast.success("Employé créé avec succès. L'employé peut maintenant se connecter avec son PIN.");
        } else {
          toast.success("Employé créé avec succès");
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error("Échec de la sauvegarde de l'employé");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pin_enabled" className="text-base">Accès PIN</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre à l'employé de se connecter avec un code PIN
                </p>
              </div>
              <Switch
                id="pin_enabled"
                checked={pinEnabled}
                onCheckedChange={setPinEnabled}
              />
            </div>

            {pinEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pin">Code PIN (4-6 chiffres)</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin_confirm">Confirmer le PIN</Label>
                  <Input
                    id="pin_confirm"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
              </>
            )}
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <Label className="text-base">Permissions d'Accès</Label>
            <p className="text-sm text-muted-foreground">
              Sélectionnez les fonctionnalités auxquelles cet employé peut accéder
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="can_make_sales">Sortie de Stock</Label>
                  <p className="text-xs text-muted-foreground">
                    Peut enregistrer des ventes
                  </p>
                </div>
                <Switch
                  id="can_make_sales"
                  checked={permissions.can_make_sales}
                  onCheckedChange={(checked) => 
                    setPermissions({...permissions, can_make_sales: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="can_view_products">Consulter Produits</Label>
                  <p className="text-xs text-muted-foreground">
                    Peut voir la liste des produits
                  </p>
                </div>
                <Switch
                  id="can_view_products"
                  checked={permissions.can_view_products}
                  onCheckedChange={(checked) => 
                    setPermissions({...permissions, can_view_products: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="can_view_reports">Voir Rapports</Label>
                  <p className="text-xs text-muted-foreground">
                    Peut accéder au tableau de bord
                  </p>
                </div>
                <Switch
                  id="can_view_reports"
                  checked={permissions.can_view_reports}
                  onCheckedChange={(checked) => 
                    setPermissions({...permissions, can_view_reports: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="can_manage_stock">Gérer Stock</Label>
                  <p className="text-xs text-muted-foreground">
                    Peut gérer achats et stock
                  </p>
                </div>
                <Switch
                  id="can_manage_stock"
                  checked={permissions.can_manage_stock}
                  onCheckedChange={(checked) => 
                    setPermissions({...permissions, can_manage_stock: checked})
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

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

          <div className="flex justify-end gap-2 pt-4">
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
