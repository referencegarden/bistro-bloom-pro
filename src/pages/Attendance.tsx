import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Clock, LogIn, LogOut, Wifi, WifiOff } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { detectWifiConnection, WifiStatus } from "@/lib/wifiDetection";
import { AttendanceConfirmDialog } from "@/components/AttendanceConfirmDialog";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { useTenant } from "@/contexts/TenantContext";
interface TodayAttendance {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  wifi_ssid: string | null;
  confirmed: boolean;
  status: string;
}
interface WeeklyAttendance {
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
}
export default function Attendance() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { tenantId } = useTenant();
  const { isAdmin, loading: permissionsLoading } = useEmployeePermissions();
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendance[]>([]);
  const [wifiStatus, setWifiStatus] = useState<WifiStatus>({
    isConnected: false,
    ssid: null,
    ipAddress: null
  });
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<"check_in" | "check_out">("check_in");
  const [wifiSettings, setWifiSettings] = useState<{
    requireWifi: boolean;
    ssidName: string | null;
  }>({ requireWifi: false, ssidName: null });
  const { toast } = useToast();

  // Redirect admins to admin view
  useEffect(() => {
    if (!permissionsLoading && isAdmin) {
      navigate(`/${slug}/attendance-admin`, { replace: true });
    }
  }, [isAdmin, permissionsLoading, navigate, slug]);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (tenantId) {
      checkWifiStatus();
      const interval = setInterval(checkWifiStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [tenantId]);
  useEffect(() => {
    if (employeeId) {
      loadTodayAttendance();
      loadWeeklyAttendance();
    }
  }, [employeeId]);
  const loadEmployeeData = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data: employee
    } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
    if (employee) {
      setEmployeeId(employee.id);
    }
  };
  const checkWifiStatus = async () => {
    const status = await detectWifiConnection();

    // Validate IP address with server
    if (status.ipAddress && tenantId) {
      try {
        const { data, error } = await supabase.functions.invoke('wifi-validation', {
          body: {
            ipAddress: status.ipAddress,
            tenantId: tenantId
          }
        });
        
        if (error) {
          console.error('Wi-Fi validation error:', error);
          setWifiStatus({
            ...status,
            isConnected: false,
            error: "Erreur de validation du réseau"
          });
          return;
        }

        // Store Wi-Fi settings from response
        setWifiSettings({
          requireWifi: data.requireWifi ?? false,
          ssidName: data.ssidName || null
        });

        // If Wi-Fi is not required, always show as connected
        if (!data.requireWifi) {
          setWifiStatus({
            ...status,
            isConnected: true,
            ssid: data.ssidName || null,
            error: undefined
          });
          return;
        }

        // Update status based on server validation
        const wifiName = data.ssidName || "Wi-Fi du restaurant";
        setWifiStatus({
          ...status,
          isConnected: data.valid,
          ssid: data.ssidName || null,
          error: data.valid ? undefined : `Vous devez être connecté au ${wifiName}`
        });
      } catch (err) {
        console.error('Wi-Fi validation exception:', err);
        setWifiStatus({
          ...status,
          isConnected: false,
          error: "Erreur de validation du réseau"
        });
      }
    } else {
      setWifiStatus(status);
    }
  };
  const loadTodayAttendance = async () => {
    if (!employeeId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const {
      data
    } = await supabase.from("attendance").select("*").eq("employee_id", employeeId).eq("date", today).single();
    setTodayAttendance(data);
  };
  const loadWeeklyAttendance = async () => {
    if (!employeeId) return;
    const weekStart = format(startOfWeek(new Date(), {
      locale: fr
    }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), {
      locale: fr
    }), "yyyy-MM-dd");
    const {
      data
    } = await supabase.from("attendance").select("date, check_in_time, check_out_time, status").eq("employee_id", employeeId).gte("date", weekStart).lte("date", weekEnd).order("date", {
      ascending: false
    });
    setWeeklyAttendance(data || []);
  };
  const handleCheckIn = () => {
    setActionType("check_in");
    setShowConfirmDialog(true);
  };
  const handleCheckOut = () => {
    setActionType("check_out");
    setShowConfirmDialog(true);
  };
  const confirmAction = async () => {
    if (!employeeId || !wifiStatus.ipAddress) {
      toast({
        title: "Erreur",
        description: "Impossible de détecter votre connexion réseau",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      if (actionType === "check_in") {
        const {
          error
        } = await supabase.from("attendance").upsert({
          employee_id: employeeId,
          date: today,
          check_in_time: new Date().toISOString(),
          wifi_ssid: wifiSettings.ssidName || wifiStatus.ssid || null,
          ip_address: wifiStatus.ipAddress,
          confirmed: true,
          tenant_id: tenantId,
        }, {
          onConflict: 'employee_id,date'
        });
        if (error) throw error;
        toast({
          title: "✅ Arrivée enregistrée",
          description: `Vous avez pointé à ${format(new Date(), "HH:mm", {
            locale: fr
          })}`
        });
      } else {
        const {
          error
        } = await supabase.from("attendance").update({
          check_out_time: new Date().toISOString(),
          confirmed: true
        }).eq("employee_id", employeeId).eq("date", today);
        if (error) throw error;
        toast({
          title: "✅ Départ enregistré",
          description: `Départ enregistré à ${format(new Date(), "HH:mm", {
            locale: fr
          })}`
        });
      }
      await loadTodayAttendance();
      await loadWeeklyAttendance();
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const canCheckIn = !todayAttendance || !todayAttendance.check_in_time;
  const canCheckOut = todayAttendance && todayAttendance.check_in_time && !todayAttendance.check_out_time;
  return <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Gestion de Présence</h1>
      </div>

      {/* WiFi Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {wifiStatus.isConnected ? <Wifi className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-destructive" />}
            Statut de Connexion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!wifiSettings.requireWifi ? (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              <p className="text-success font-medium">Validation Wi-Fi non requise</p>
            </div>
          ) : wifiStatus.isConnected ? (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              <p className="text-success font-medium">
                Connecté au {wifiSettings.ssidName || "réseau du restaurant"}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <p className="text-destructive font-medium">
                  Non connecté au {wifiSettings.ssidName || "Wi-Fi du restaurant"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous devez être connecté au {wifiSettings.ssidName || "Wi-Fi du restaurant"} pour confirmer votre présence.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aujourd'hui
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance?.check_in_time ? <div className="space-y-4">
              <div className="flex items-center gap-4">
                <LogIn className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Arrivée</p>
                  <p className="text-2xl font-bold text-success">
                    {format(new Date(todayAttendance.check_in_time), "HH:mm", {
                  locale: fr
                })}
                  </p>
                </div>
              </div>
              {todayAttendance.check_out_time && <div className="flex items-center gap-4">
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Départ</p>
                    <p className="text-2xl font-bold">
                      {format(new Date(todayAttendance.check_out_time), "HH:mm", {
                  locale: fr
                })}
                    </p>
                  </div>
                </div>}
            </div> : <p className="text-muted-foreground">Aucun pointage aujourd'hui</p>}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Button size="lg" onClick={handleCheckIn} disabled={!canCheckIn || !wifiStatus.isConnected || loading} className="h-20 text-lg bg-green-900 hover:bg-green-800 text-slate-50">
          <LogIn className="mr-2 h-6 w-6" />
          Pointer l'Arrivée
        </Button>
        <Button size="lg" onClick={handleCheckOut} disabled={!canCheckOut || !wifiStatus.isConnected || loading} variant="outline" className="h-20 text-lg text-slate-50 bg-red-600 hover:bg-red-500">
          <LogOut className="mr-2 h-6 w-6" />
          Pointer le Départ
        </Button>
      </div>

      {/* Weekly History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique de la Semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {weeklyAttendance.length > 0 ? weeklyAttendance.map(record => <div key={record.date} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">
                      {format(new Date(record.date), "EEEE d MMMM", {
                  locale: fr
                })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.check_in_time && format(new Date(record.check_in_time), "HH:mm")}
                      {" - "}
                      {record.check_out_time && format(new Date(record.check_out_time), "HH:mm")}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${record.status === "present" ? "bg-success/10 text-success" : record.status === "pending" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                    {record.status === "present" ? "Présent" : record.status === "pending" ? "En cours" : "Absent"}
                  </div>
                </div>) : <p className="text-center text-muted-foreground py-4">Aucun historique cette semaine</p>}
          </div>
        </CardContent>
      </Card>

      <AttendanceConfirmDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} onConfirm={confirmAction} wifiStatus={wifiStatus} actionType={actionType} loading={loading} />
    </div>;
}