import sys
with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\[id]\page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('// 2. Fetch waypoints from Supabase Storage', '// 2. Fetch waypoints (Prefer DB, fallback to Storage)\n        if (data && data.waypoints && data.waypoints.length > 0) {\n          setWaypoints(data.waypoints);\n        } else ')

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\[id]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
