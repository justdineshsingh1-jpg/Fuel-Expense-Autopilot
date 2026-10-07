import sys

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\layout\TopBar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="-m-2.5 p-2.5 text-gray-700 lg:hidden"', 'className="-m-2.5 p-2.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"')

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\layout\TopBar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\layout\Sidebar.tsx', 'r', encoding='utf-8') as f:
    s = f.read()

old_classes = '"fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",\n      sidebarOpen ? "translate-x-0" : "-translate-x-full"'
new_classes = '"fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out lg:static flex flex-col overflow-hidden",\n      sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0"'
s = s.replace(old_classes, new_classes)

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\layout\Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(s)
