import { useState, useEffect } from "react";
import { ClipboardCheck } from "lucide-react";
import { AttendanceFilters } from "@/components/AttendanceFilters";
import { AttendanceStats } from "@/components/AttendanceStats";
import { AttendanceTable } from "@/components/AttendanceTable";
import { AttendanceExport } from "@/components/AttendanceExport";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

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

export default function AttendanceAdmin() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  useEffect(() => {
    loadAttendance();
  }, [dateRange]);

  const loadAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        employees (
          name,
          position
        )
      `)
      .gte("date", dateRange.from)
      .lte("date", dateRange.to)
      .order("date", { ascending: false })
      .order("check_in_time", { ascending: false });

    if (!error && data) {
      setRecords(data as AttendanceRecord[]);
      setFilteredRecords(data as AttendanceRecord[]);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gestion de Présence - Administration</h1>
        </div>
        <AttendanceExport records={filteredRecords} />
      </div>

      <AttendanceStats records={filteredRecords} />

      <AttendanceFilters
        records={records}
        onFilter={setFilteredRecords}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <AttendanceTable
        records={filteredRecords}
        loading={loading}
        onUpdate={loadAttendance}
      />
    </div>
  );
}
