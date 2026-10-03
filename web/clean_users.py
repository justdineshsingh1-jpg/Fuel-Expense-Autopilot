import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\admin\users\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Replace mockUsers with empty array and fetch logic
old_mock = """const mockUsers = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul.s@company.com', code: 'EMP101', role: 'team_leader', dept: 'Sales', status: 'active' },
  { id: '2', name: 'Priya Patel', email: 'priya.p@company.com', code: 'EMP842', role: 'manager', dept: 'Sales', status: 'active' },
  { id: '3', name: 'Amit Kumar', email: 'amit.k@company.com', code: 'EMP205', role: 'accounts', dept: 'Finance', status: 'active' },
  { id: '4', name: 'Vikram Singh', email: 'vikram.s@company.com', code: 'EMP001', role: 'managing_director', dept: 'Executive', status: 'active' },
  { id: '5', name: 'Neha Gupta', email: 'neha.g@company.com', code: 'EMP412', role: 'team_leader', dept: 'Operations', status: 'inactive' },
];"""
content = content.replace(old_mock, "const mockUsers: any[] = [];")

# We need to add useEffect to fetch users, and change handleSubmit to POST to /api/users
# To do this safely via script, let's just write the whole file since it's a critical page.
