import sys
with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\ui\RouteMap.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

target1 = 'export default function RouteMap({ waypoints }: { waypoints: {lat: number, lng: number, timestamp: string}[] }) {'
new1 = 'export default function RouteMap({ waypoints, distanceKm }: { waypoints: {lat: number, lng: number, timestamp: string}[], distanceKm?: number }) {'

target2 = '<Polyline positions={positions} color="#0ea5e9" weight={5} opacity={0.8} />'
new2 = """      <Polyline positions={positions} color="#0ea5e9" weight={5} opacity={0.8}>
        {distanceKm !== undefined && <Popup>Total Distance: {distanceKm} KM</Popup>}
      </Polyline>"""

c = c.replace(target1, new1).replace(target2, new2)

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\components\ui\RouteMap.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
