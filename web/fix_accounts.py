import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\accounts\export\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

content = content.replace("const mockExportData: any[] = []; // [\n    { id: '1', voucherDate: '2024-02-28', ledgerName: 'Fuel Expenses', empCode: 'EMP842', empName: 'Priya Patel', distance: 850, amount: 8500, dr: 8500, cr: 0 },\n    { id: '2', voucherDate: '2024-02-28', ledgerName: 'Staff Advance - EMP842', empCode: 'EMP842', empName: 'Priya Patel', distance: 0, amount: 8500, dr: 0, cr: 8500 },\n  ];", "const mockExportData: any[] = [];")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Accounts export fixed")
