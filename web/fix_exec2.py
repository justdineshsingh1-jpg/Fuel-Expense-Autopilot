import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\executive-summary\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

content = content.replace("formatCurrency(00000)", "formatCurrency(0)")
content = content.replace("formatCurrency(005000)", "formatCurrency(0)")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
