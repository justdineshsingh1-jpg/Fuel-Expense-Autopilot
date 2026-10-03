import os
import re

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# 1. Remove mockData
content = content.replace("const mockData: any[] = [];\n", "")

# 2. Add useState and useEffect inside the component
comp_start = "export default function ApprovalsPage() {"
new_comp_start = """export default function ApprovalsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/trips').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTrips(data);
    }).catch(e => console.error(e));
  }, []);
"""
content = content.replace(comp_start, new_comp_start)

# 3. Replace all mockData references with trips
content = content.replace("mockData.length", "trips.length")
content = content.replace("mockData.map", "trips.map")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Approvals page wired to API")
