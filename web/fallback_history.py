import os
path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\history\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

content = content.replace(
    "<div className=\"space-y-4\">\n        {historyData.map((trip) => (",
    "<div className=\"space-y-4\">\n        {historyData.length === 0 && !isLoading && <div className=\"text-center p-8 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm\">No trips found for this month. Start a trip to see history here!</div>}\n        {isLoading && <div className=\"text-center p-8 text-gray-500\">Loading history...</div>}\n        {historyData.map((trip) => ("
)

with open(path, "w", encoding="utf8") as f:
    f.write(content)
