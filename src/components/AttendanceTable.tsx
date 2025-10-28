import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading: boolean;
  onUpdate: () => void;
}

export function AttendanceTable({ records, loading, onUpdate }: AttendanceTableProps) {
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const calculateWorkHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return "-";
    const hours = differenceInHours(new Date(checkOut), new Date(checkIn));
    return `${hours}h`;
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setNotes(record.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!editingRecord) return;

    const { error } = await supabase
      .from("attendance")
      .update({ notes })
      .eq("id", editingRecord.id);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succès",
        description: "Note enregistrée avec succès"
      });
      setEditingRecord(null);
      onUpdate();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet enregistrement ?")) return;

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succès",
        description: "Enregistrement supprimé"
      });
      onUpdate();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registre de Présence</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead>Heures</TableHead>
                <TableHead>Wi-Fi</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Aucun enregistrement trouvé
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employees.name}</TableCell>
                    <TableCell>{record.employees.position || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(record.date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {record.check_in_time 
                        ? format(new Date(record.check_in_time), "HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {record.check_out_time 
                        ? format(new Date(record.check_out_time), "HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {calculateWorkHours(record.check_in_time, record.check_out_time)}
                    </TableCell>
                    <TableCell>
                      {record.wifi_ssid === "ReferenceGarden" ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "present"
                            ? "default"
                            : record.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {record.status === "present"
                          ? "Présent"
                          : record.status === "pending"
                          ? "En cours"
                          : "Absent"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {editingRecord?.employees.name} - {editingRecord?.date && format(new Date(editingRecord.date), "dd/MM/yyyy")}
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez une note..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveNotes}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
