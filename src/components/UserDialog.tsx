import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: { id: string; email: string; role?: string } | null;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setRole(user.role || "viewer");
      setPassword("");
    } else {
      setEmail("");
      setPassword(generatePassword());
      setRole("viewer");
    }
  }, [user, open]);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Update existing user's role
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: role as any });

        if (insertError) throw insertError;

        toast.success("User role updated successfully");
      } else {
        // Create new user
        const redirectUrl = `${window.location.origin}/`;
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            created_by_admin: true
          }
        });

        if (authError) throw authError;

        // Assign role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: role as any });

        if (roleError) throw roleError;

        // Show the generated password to admin
        toast.success(`User created! Password: ${password}`, {
          duration: 10000,
          description: "Please share this password with the user. It will not be shown again."
        });

        // Copy password to clipboard
        navigator.clipboard.writeText(password);
        toast.info("Password copied to clipboard");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error managing user:", error);
      toast.error(error.message || "Failed to manage user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit User Role" : "Create New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user}
              required
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">Password (Auto-generated)</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={password}
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                >
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This password will be shown once after creation. Make sure to copy it.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full Access</SelectItem>
                <SelectItem value="manager">Manager - Manage Products, Sales, Purchases</SelectItem>
                <SelectItem value="cashier">Cashier - Sales Only</SelectItem>
                <SelectItem value="viewer">Viewer - Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : user ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
