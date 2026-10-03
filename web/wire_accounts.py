import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\accounts\export\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Add XLSX import
imports_anchor = "import toast from 'react-hot-toast';"
new_imports = "import toast from 'react-hot-toast';\nimport * as XLSX from 'xlsx';"
content = content.replace(imports_anchor, new_imports)

# Replace handleExport with real logic
old_export = """  const handleExport = () => {
    toast.success(`Data exported in ${format} format successfully`);
  };"""
new_export = """  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(mockExportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    
    if (format === 'tally-csv') {
      XLSX.writeFile(wb, "Tally_Export.csv");
    } else {
      XLSX.writeFile(wb, "Accounting_Export.xlsx");
    }
    toast.success(`Data exported as ${format} successfully`);
  };"""
content = content.replace(old_export, new_export)

# Clean up mockExportData distances if they want them to be empty for testing
content = content.replace("mockExportData = [", "mockExportData: any[] = []; // [")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Accounts export wired")
