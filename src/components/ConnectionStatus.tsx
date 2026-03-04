import { useState, useEffect } from "react";
import { WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { getQueueCount, syncQueue } from "@/lib/offlineQueue";
import { useToast } from "@/hooks/use-toast";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const checkQueue = async () => {
      const count = await getQueueCount();
      setPendingCount(count);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncQueue();
      setPendingCount(await getQueueCount());
      toast({
        title: "Synchronisation terminée",
        description: `${result.synced} action(s) synchronisée(s)${result.failed > 0 ? `, ${result.failed} échouée(s)` : ""}`,
      });
    } catch {
      toast({ title: "Erreur de synchronisation", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
      isOnline ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
    }`}>
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Hors ligne — les actions sont enregistrées localement</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>{pendingCount} action(s) en attente de synchronisation</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-2 inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            Synchroniser
          </button>
        </>
      ) : null}
    </div>
  );
}
