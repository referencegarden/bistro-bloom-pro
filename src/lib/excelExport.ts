import ExcelJS from 'exceljs';

export async function createWorkbook(): Promise<ExcelJS.Workbook> {
  return new ExcelJS.Workbook();
}

export function addJsonSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: Record<string, unknown>[],
  columnWidths?: number[]
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return worksheet;

  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map((header, i) => ({
    header,
    key: header,
    width: columnWidths?.[i] ?? 15,
  }));

  data.forEach((row) => worksheet.addRow(row));

  return worksheet;
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function readWorkbookFromFile(file: File): Promise<ExcelJS.Workbook> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

export function sheetToJson<T = Record<string, unknown>>(worksheet: ExcelJS.Worksheet): T[] {
  const rows: T[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(String(cell.value ?? ''));
      });
    } else {
      const obj: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const key = headers[colNumber - 1];
        if (key) obj[key] = cell.value;
      });
      rows.push(obj as T);
    }
  });

  return rows;
}
