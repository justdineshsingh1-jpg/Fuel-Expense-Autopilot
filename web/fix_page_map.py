import sys
with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\[id]\page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

target = '<RouteMap waypoints={waypoints} />'
new_target = '<RouteMap waypoints={waypoints} distanceKm={trip?.osrm_calculated_km || trip?.distance_km} />'

c = c.replace(target, new_target)

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\[id]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
