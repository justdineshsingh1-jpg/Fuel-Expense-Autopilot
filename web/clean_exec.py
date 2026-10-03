import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\executive-summary\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Replace hardcoded numbers
content = content.replace("158", "0")
content = content.replace("145", "0")
content = content.replace("13", "0")
content = content.replace("1,24,000", "0")
content = content.replace("485000", "0")

# Department numbers
content = content.replace("85", "0")
content = content.replace("75", "0")
content = content.replace("10", "0")
content = content.replace("2,80,000", "0")

content = content.replace("42", "0")
content = content.replace("40", "0")
content = content.replace("2", "0")
content = content.replace("1,15,000", "0")

content = content.replace("31", "0")
content = content.replace("30", "0")
content = content.replace("1", "0")
content = content.replace("90,000", "0")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Executive Summary wiped")
