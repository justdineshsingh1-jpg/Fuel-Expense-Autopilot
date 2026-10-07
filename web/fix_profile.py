import sys
with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\layout\Sidebar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('<Link href="/profile" className=', '<Link href="/profile" onClick={closeSidebar} className=')

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\layout\Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
