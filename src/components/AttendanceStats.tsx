import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format, differenceInHours } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  wifi_ssid: string | null;
}

interface AttendanceStatsProps {
  records: AttendanceRecord[];
}

export function AttendanceStats({ records }: AttendanceStatsProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const todayRecords = records.filter(r => r.date === today);
  const presentToday = todayRecords.filter(r => r.status === "present").length;
  const pendingToday = todayRecords.filter(r => r.status === "pending").length;
  
  const completedRecords = records.filter(r => 
    r.check_in_time && r.check_out_time && r.status === "present"
  );
  
  const totalHours = completedRecords.reduce((sum, r) => {
    if (r.check_in_time && r.check_out_time) {
      return sum + differenceInHours(new Date(r.check_out_time), new Date(r.check_in_time));
    }
    return sum;
  }, 0);
  
  const avgHours = completedRecords.length > 0 
    ? (totalHours / completedRecords.length).toFixed(1)
    : "0";
  
  const validWifi = records.filter(r => r.wifi_ssid === "ReferenceGarden").length;
  const wifiValidationRate = records.length > 0
    ? ((validWifi / records.length) * 100).toFixed(0)
    : "0";

  const stats = [
    {
      title: "Employés Présents Aujourd'hui",
      value: presentToday,
      icon: Users,
      description: `${pendingToday} en cours`,
      color: "text-success"
    },
    {
      title: "Heures Moyennes",
      value: `${avgHours}h`,
      icon: Clock,
      description: `Sur ${completedRecords.length} jours`,
      color: "text-primary"
    },
    {
      title: "En Attente de Départ",
      value: pendingToday,
      icon: AlertCircle,
      description: "Aujourd'hui",
      color: "text-warning"
    },
    {
      title: "Validation Wi-Fi",
      value: `${wifiValidationRate}%`,
      icon: CheckCircle,
      description: `${validWifi}/${records.length} validés`,
      color: "text-success"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
