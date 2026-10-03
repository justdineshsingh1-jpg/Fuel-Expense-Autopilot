import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\executive-summary\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Replace hardcoded text exactly
content = content.replace("Total Pending Approvals</p>\n            <p className=\"mt-2 text-3xl font-bold text-gray-900\">158</p>\n            <p className=\"text-sm text-gray-500 mt-1\">{formatCurrency(485000)} total value</p>", 
"Total Pending Approvals</p>\n            <p className=\"mt-2 text-3xl font-bold text-gray-900\">0</p>\n            <p className=\"text-sm text-gray-500 mt-1\">{formatCurrency(0)} total value</p>")

content = content.replace("Clean Claims</p>\n                <p className=\"mt-2 text-3xl font-bold text-green-900\">145</p>",
"Clean Claims</p>\n                <p className=\"mt-2 text-3xl font-bold text-green-900\">0</p>")

content = content.replace("Flagged Anomalies</p>\n                <p className=\"mt-2 text-3xl font-bold text-orange-900\">13</p>",
"Flagged Anomalies</p>\n                <p className=\"mt-2 text-3xl font-bold text-orange-900\">0</p>")

content = content.replace("YTD Savings</p>\n            <p className=\"mt-2 text-3xl font-bold text-gray-900\">{formatCurrency(124000)}</p>",
"YTD Savings</p>\n            <p className=\"mt-2 text-3xl font-bold text-gray-900\">{formatCurrency(0)}</p>")

content = content.replace("Approve All Clean Claims (145)", "Approve All Clean Claims (0)")
content = content.replace("There are 145 claims that have passed", "There are 0 claims that have passed")

content = content.replace("<td className=\"px-6 py-4 text-right\">85</td>", "<td className=\"px-6 py-4 text-right\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right text-green-600 font-medium\">75</td>", "<td className=\"px-6 py-4 text-right text-green-600 font-medium\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right text-red-600 font-medium\">10</td>", "<td className=\"px-6 py-4 text-right text-red-600 font-medium\">0</td>")
content = content.replace("{formatCurrency(280000)}", "{formatCurrency(0)}")

content = content.replace("<td className=\"px-6 py-4 text-right\">42</td>", "<td className=\"px-6 py-4 text-right\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right text-green-600 font-medium\">40</td>", "<td className=\"px-6 py-4 text-right text-green-600 font-medium\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right text-red-600 font-medium\">2</td>", "<td className=\"px-6 py-4 text-right text-red-600 font-medium\">0</td>")
content = content.replace("{formatCurrency(115000)}", "{formatCurrency(0)}")

content = content.replace("<td className=\"px-6 py-4 text-right\">31</td>", "<td className=\"px-6 py-4 text-right\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right text-green-600 font-medium\">30</td>", "<td className=\"px-6 py-4 text-right text-green-600 font-medium\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right text-red-600 font-medium\">1</td>", "<td className=\"px-6 py-4 text-right text-red-600 font-medium\">0</td>")
content = content.replace("{formatCurrency(90000)}", "{formatCurrency(0)}")
content = content.replace("{formatCurrency(485000)}", "{formatCurrency(0)}")

content = content.replace("<td className=\"px-6 py-4 text-right font-bold text-gray-900\">158</td>", "<td className=\"px-6 py-4 text-right font-bold text-gray-900\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right font-bold text-green-600\">145</td>", "<td className=\"px-6 py-4 text-right font-bold text-green-600\">0</td>")
content = content.replace("<td className=\"px-6 py-4 text-right font-bold text-red-600\">13</td>", "<td className=\"px-6 py-4 text-right font-bold text-red-600\">0</td>")


with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Exec page cleaned safely")
