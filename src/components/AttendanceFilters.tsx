import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  wifi_ssid: string | null;
  ip_address: string | null;
  status: string;
  confirmed: boolean;
  notes: string | null;
  employees: {
    name: string;
    position: string | null;
  };
}

interface AttendanceFiltersProps {
  records: AttendanceRecord[];
  onFilter: (filtered: AttendanceRecord[]) => void;
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
}

export function AttendanceFilters({
  records,
  onFilter,
  dateRange,
  onDateRangeChange
}: AttendanceFiltersProps) {
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wifiFilter, setWifiFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  // Get unique values for filters
  const employees = Array.from(new Set(records.map(r => r.employees.name))).sort();
  const positions = Array.from(new Set(records.map(r => r.employees.position).filter(Boolean))).sort();

  useEffect(() => {
    applyFilters();
  }, [employeeFilter, statusFilter, wifiFilter, positionFilter, records]);

  const applyFilters = () => {
    let filtered = [...records];

    if (employeeFilter !== "all") {
      filtered = filtered.filter(r => r.employees.name === employeeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (wifiFilter !== "all") {
      if (wifiFilter === "valid") {
        filtered = filtered.filter(r => r.wifi_ssid === "ReferenceGarden");
      } else {
        filtered = filtered.filter(r => !r.wifi_ssid || r.wifi_ssid !== "ReferenceGarden");
      }
    }

    if (positionFilter !== "all") {
      filtered = filtered.filter(r => r.employees.position === positionFilter);
    }

    onFilter(filtered);
  };

  const clearFilters = () => {
    setEmployeeFilter("all");
    setStatusFilter("all");
    setWifiFilter("all");
    setPositionFilter("all");
  };

  const hasActiveFilters = employeeFilter !== "all" || statusFilter !== "all" || 
                          wifiFilter !== "all" || positionFilter !== "all";

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filtres</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="date-from">Date de début</Label>
            <Input
              id="date-from"
              type="date"
              value={dateRange.from}
              onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">Date de fin</Label>
            <Input
              id="date-to"
              type="date"
              value={dateRange.to}
              onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Employé</Label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les employés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Poste</Label>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les postes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les postes</SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos} value={pos!}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="present">Présent</SelectItem>
                <SelectItem value="pending">En cours</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Validation Wi-Fi</Label>
            <Select value={wifiFilter} onValueChange={setWifiFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="valid">✅ Validé</SelectItem>
                <SelectItem value="invalid">❌ Non validé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
