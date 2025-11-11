import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NumericKeypad } from "@/components/NumericKeypad";

interface POSLockDialogProps {
  open: boolean;
  employeeName: string;
  onUnlock: (employeeData: { id: string; name: string; position: string }) => void;
}

export function POSLockDialog({ open, employeeName, onUnlock }: POSLockDialogProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleDigitPress = (digit: string) => {
    if (pin.length < 6) {
      setError(""); // Clear error when user starts typing
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const handleUnlock = async () => {
    if (pin.length === 0) return;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('employee-pin-login', {
        body: { pin: pin.trim() }
      });

      // Handle HTTP errors or response errors
      if (error) {
        console.error("Edge function error:", error);
        setError("Code PIN incorrect");
        setPin("");
        return;
      }

      if (data?.error) {
        setError("Code PIN incorrect");
        setPin("");
        return;
      }

      // Successful login
      if (!data?.employee) {
        throw new Error("Données employé manquantes");
      }

      const employeeData = {
        id: data.employee.id,
        name: data.employee.name,
        position: data.employee.position || ""
      };

      toast({ 
        title: "POS Déverrouillé", 
        description: `Connecté en tant que ${employeeData.name}` 
      });
      setError("");
      setPin("");
      onUnlock(employeeData);
    } catch (error: any) {
      console.error("Unlock error:", error);
      setError(error.message || "Échec de déverrouillage");
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
            Entrez votre code PIN pour déverrouiller
          </p>
        </DialogHeader>
        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            {error && (
              <div className="text-center text-sm text-destructive font-medium bg-destructive/10 py-2 px-3 rounded-md">
                {error}
              </div>
            )}
            <Label className="text-center block">Code PIN</Label>
            <div className="flex justify-center items-center h-12 bg-muted rounded-md text-3xl tracking-widest font-mono">
              {pin ? '●'.repeat(pin.length) : ''}
              <span className="text-muted-foreground ml-2">
                {pin.length < 6 ? `(${pin.length}/6)` : ''}
              </span>
            </div>
          </div>
          
          <NumericKeypad
            onDigitPress={handleDigitPress}
            onBackspace={handleBackspace}
            onClear={handleClear}
            disabled={loading}
          />
          
          <Button 
            onClick={handleUnlock} 
            disabled={loading || pin.length === 0} 
            className="w-full"
            size="lg"
          >
            {loading ? "Déverrouillage..." : "Déverrouiller POS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
