import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductImportProps {
  open: boolean;
  onClose: () => void;
}

interface ImportProduct {
  name: string;
  unit_of_measure?: string;
  cost: number;
  category_name?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

export const ProductImport = ({ open, onClose }: ProductImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportProduct[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      // Normalize column names (case-insensitive matching)
      const products: ImportProduct[] = jsonData.map((row: any) => {
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        const rawCategory = normalizedRow['category name'] || 
                            normalizedRow.category || 
                            normalizedRow.catégorie || 
                            normalizedRow.categorie ||
                            normalizedRow.categ_id ||
                            normalizedRow['categ id'] ||
                            normalizedRow.categ ||
                            '';
        
        // Extract last part if it's a path like "MATERIEL / MATERIEL BAR"
        const category_name = rawCategory.includes('/') 
          ? rawCategory.split('/').pop()?.trim() 
          : rawCategory;

        return {
          name: normalizedRow.name || normalizedRow.nom || '',
          unit_of_measure: normalizedRow['unit of measure'] || normalizedRow['unité de mesure'] || normalizedRow.unit || '',
          cost: parseFloat(
            normalizedRow.cost || 
            normalizedRow.coût || 
            normalizedRow.prix || 
            normalizedRow['sales price'] ||
            normalizedRow['prix de vente'] ||
            normalizedRow['sale price'] ||
            0
          ),
          category_name,
        };
      });

      setPreview(products.slice(0, 5)); // Show first 5 rows as preview
      toast.success(`Fichier chargé: ${products.length} produits trouvés`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error("Erreur lors de la lecture du fichier");
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      // Normalize data
      const products: ImportProduct[] = jsonData.map((row: any) => {
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        const rawCategory = normalizedRow['category name'] || 
                            normalizedRow.category || 
                            normalizedRow.catégorie || 
                            normalizedRow.categorie ||
                            normalizedRow.categ_id ||
                            normalizedRow['categ id'] ||
                            normalizedRow.categ ||
                            '';
        
        // Extract last part if it's a path like "MATERIEL / MATERIEL BAR"
        const category_name = rawCategory.includes('/') 
          ? rawCategory.split('/').pop()?.trim() 
          : rawCategory;

        return {
          name: normalizedRow.name || normalizedRow.nom || '',
          unit_of_measure: normalizedRow['unit of measure'] || normalizedRow['unité de mesure'] || normalizedRow.unit || '',
          cost: parseFloat(
            normalizedRow.cost || 
            normalizedRow.coût || 
            normalizedRow.prix || 
            normalizedRow['sales price'] ||
            normalizedRow['prix de vente'] ||
            normalizedRow['sale price'] ||
            0
          ),
          category_name,
        };
      });

      const { data: importResult, error } = await supabase.functions.invoke('import-products', {
        body: { products },
      });

      if (error) throw error;

      setResult(importResult);
      
      if (importResult.failed === 0) {
        toast.success(`${importResult.success} produits importés avec succès!`);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        toast.warning(`${importResult.success} réussis, ${importResult.failed} échoués`);
      }
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error("Erreur lors de l'importation");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des produits</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Format requis: Excel (.xlsx, .xls) ou CSV avec les colonnes: <strong>name</strong>, <strong>unit of measure</strong>, <strong>cost</strong>, <strong>category name</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file">Fichier Excel/CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={importing}
            />
          </div>

          {preview.length > 0 && !result && (
            <div className="space-y-2">
              <Label>Aperçu (5 premières lignes)</Label>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Nom</th>
                      <th className="p-2 text-left">Unité</th>
                      <th className="p-2 text-left">Coût</th>
                      <th className="p-2 text-left">Catégorie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((product, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{product.name}</td>
                        <td className="p-2">{product.unit_of_measure || '-'}</td>
                        <td className="p-2">{product.cost}</td>
                        <td className="p-2">{product.category_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">{result.success} produits importés avec succès</span>
              </div>

              {result.failed > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">{result.failed} erreurs</span>
                  </div>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/50">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm py-1">
                        <strong>Ligne {error.row}</strong> ({error.name}): {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              Annuler
            </Button>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? (
                "Importation en cours..."
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
