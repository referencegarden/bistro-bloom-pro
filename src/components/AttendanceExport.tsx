import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/excelExport";

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  wifi_ssid: string | null;
  ip_address: string | null;
  status: string;
  notes: string | null;
  employees: {
    name: string;
    position: string | null;
  };
}

interface AttendanceExportProps {
  records: AttendanceRecord[];
}

function mapRecords(records: AttendanceRecord[]) {
  return records.map(record => ({
    "Employé": record.employees.name,
    "Poste": record.employees.position || "-",
    "Date": format(new Date(record.date), "dd/MM/yyyy"),
    "Arrivée": record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "-",
    "Départ": record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "-",
    "Wi-Fi": record.wifi_ssid === "ReferenceGarden" ? "✓ Validé" : "✗ Non validé",
    "Adresse IP": record.ip_address || "-",
    "Statut": record.status === "present" ? "Présent" : record.status === "pending" ? "En cours" : "Absent",
    "Notes": record.notes || "-"
  }));
}

export function AttendanceExport({ records }: AttendanceExportProps) {
  const exportToExcel = async () => {
    const exportData = mapRecords(records);
    const wb = await createWorkbook();
    addJsonSheet(wb, "Présences", exportData, [20, 15, 12, 10, 10, 15, 15, 12, 30]);
    const fileName = `presences_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    await downloadWorkbook(wb, fileName);
  };

  const exportToCSV = () => {
    const headers = [
      "Employé", "Poste", "Date", "Arrivée", "Départ",
      "Wi-Fi", "Adresse IP", "Statut", "Notes"
    ];

    const csvData = records.map(record => [
      record.employees.name,
      record.employees.position || "-",
      format(new Date(record.date), "dd/MM/yyyy"),
      record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "-",
      record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "-",
      record.wifi_ssid === "ReferenceGarden" ? "Validé" : "Non validé",
      record.ip_address || "-",
      record.status === "present" ? "Présent" : record.status === "pending" ? "En cours" : "Absent",
      record.notes || "-"
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `presences_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <Button onClick={exportToCSV} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        CSV
      </Button>
      <Button onClick={exportToExcel} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
