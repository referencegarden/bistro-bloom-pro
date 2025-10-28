import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wifi, AlertCircle, CheckCircle } from "lucide-react";
import { WifiStatus } from "@/lib/wifiDetection";

interface AttendanceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  wifiStatus: WifiStatus;
  actionType: "check_in" | "check_out";
  loading: boolean;
}

export function AttendanceConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  wifiStatus,
  actionType,
  loading
}: AttendanceConfirmDialogProps) {
  const isValid = wifiStatus.isConnected && wifiStatus.ipAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === "check_in" ? "Confirmer l'Arrivée" : "Confirmer le Départ"}
          </DialogTitle>
          <DialogDescription>
            Vérifiez votre connexion réseau avant de confirmer votre présence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* WiFi Status */}
          <div className="flex items-start gap-3 p-4 rounded-lg border">
            <Wifi className={`h-5 w-5 mt-0.5 ${isValid ? "text-success" : "text-destructive"}`} />
            <div className="flex-1">
              <p className="font-medium mb-1">Réseau Wi-Fi</p>
              {isValid ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <p className="text-sm text-success">Connecté à ReferenceGarden</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adresse IP: {wifiStatus.ipAddress}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    {wifiStatus.error || "Non connecté au Wi-Fi ReferenceGarden"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Question */}
          {isValid && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-2">
                Confirmez-vous que vous êtes connecté au Wi-Fi du restaurant "ReferenceGarden" ?
              </p>
              <p className="text-xs text-muted-foreground">
                Cette information sera enregistrée avec votre pointage.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={!isValid || loading}>
            {loading ? "Confirmation..." : "Confirmer ma présence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
