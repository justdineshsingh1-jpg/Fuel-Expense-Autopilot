import os
path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\history\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

content = content.replace("distance > 0 ? distance : '0.0'", "Number(distance) > 0 ? distance : '0.0'")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
