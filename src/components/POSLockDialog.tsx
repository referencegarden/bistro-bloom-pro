import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface POSLockDialogProps {
  open: boolean;
  employeeName: string;
  onUnlock: () => void;
}

export function POSLockDialog({ open, employeeName, onUnlock }: POSLockDialogProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('employee-pin-login', {
        body: { pin: pin.trim() }
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: "Erreur", description: "Code PIN incorrect", variant: "destructive" });
        setPin("");
        setLoading(false);
        return;
      }

      toast({ title: "Succès", description: "POS déverrouillé" });
      setPin("");
      onUnlock();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Échec de déverrouillage", variant: "destructive" });
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <LockKeyhole className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">POS Verrouillé</DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            {employeeName}, entrez votre code PIN pour continuer
          </p>
        </DialogHeader>
        <form onSubmit={handleUnlock} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-pin">Code PIN</Label>
            <Input
              id="unlock-pin"
              type="password"
              placeholder="Entrez votre code PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
              autoFocus
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Déverrouillage..." : "Déverrouiller POS"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
