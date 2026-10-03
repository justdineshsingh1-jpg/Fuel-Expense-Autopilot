import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Replace mockTrendData
old_trend = """  const mockTrendData = [
    { name: 'Jan', amount: 45000 },
    { name: 'Feb', amount: 52000 },
    { name: 'Mar', amount: 48000 },
    { name: 'Apr', amount: 61000 },
    { name: 'May', amount: 59000 },
    { name: 'Jun', amount: 69000 },
  ];"""
new_trend = "  const mockTrendData = [{ name: 'Today', amount: 0 }];"
content = content.replace(old_trend, new_trend)

# Replace mockDeptData
old_dept = """  const mockDeptData = [
    { name: 'Sales', value: 45 },
    { name: 'Operations', value: 35 },
    { name: 'Support', value: 20 },
  ];"""
new_dept = "  const mockDeptData = [{ name: 'No Data', value: 1 }];"
content = content.replace(old_dept, new_dept)

# Replace StatsCard values
content = content.replace('value="₹2,45,000"', 'value="₹0"')
content = content.replace('value="42"', 'value="0"')
content = content.replace('value="5"', 'value="0"')
content = content.replace('value="128"', 'value="0"')

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Dashboard dummy data wiped")
