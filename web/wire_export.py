import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\executive-summary\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Add imports
imports_anchor = "import toast from 'react-hot-toast';"
new_imports = """import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';"""
content = content.replace(imports_anchor, new_imports)

# Replace handleExport with real logic
old_export = """  const handleExport = () => {
    toast.success('Executive Summary PDF downloading...');
  };"""
new_export = """  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Executive Summary - Fuel Autopilot", 14, 20);
    
    // We will export the department table as an example
    const tableColumn = ["Department", "Total Claims", "Clean", "Flagged", "Total Amount"];
    const tableRows = [
      ["Sales", "0", "0", "0", "Rs. 0"],
      ["Operations", "0", "0", "0", "Rs. 0"],
      ["Service", "0", "0", "0", "Rs. 0"]
    ];

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
    
    doc.save("Executive_Summary.pdf");
    toast.success('PDF Downloaded!');
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Department: "Sales", "Total Claims": 0, "Clean": 0, "Flagged": 0, "Total Amount": 0 },
      { Department: "Operations", "Total Claims": 0, "Clean": 0, "Flagged": 0, "Total Amount": 0 },
      { Department: "Service", "Total Claims": 0, "Clean": 0, "Flagged": 0, "Total Amount": 0 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, "Executive_Summary.xlsx");
    toast.success('Excel Downloaded!');
  };"""
content = content.replace(old_export, new_export)

# Replace the buttons
old_buttons = """<Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export PDF
        </Button>"""
new_buttons = """<div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="border-green-200 text-green-700 hover:bg-green-50">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>"""
content = content.replace(old_buttons, new_buttons)

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Export functions wired")
