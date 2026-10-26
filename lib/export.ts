export type ExportRow = Record<string, string | number>;

export async function exportExcel(filename: string, sheetName: string, rows: ExportRow[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(book, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function exportPdf(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Taleem-o-Hunar Medical Center  ·  Medicine Store", 40, 52);
  autoTable(doc, {
    startY: 68,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 77, 51], textColor: 255 },
    alternateRowStyles: { fillColor: [232, 243, 237] },
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
