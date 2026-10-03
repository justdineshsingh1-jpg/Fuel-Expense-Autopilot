import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\history\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# Replace mockHistoryData with real fetch logic
old_mock = "const mockHistoryData = ["
end_mock = "];"
start_idx = content.find(old_mock)
end_idx = content.find(end_mock, start_idx) + 2

comp_start = "export default function HistoryPage() {"
new_comp_start = """export default function HistoryPage() {
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!user) return;
    fetch('/api/trips')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter trips for this agent
          const myTrips = data.filter(t => t.user_id === user.id || t.agent_id === user.id);
          
          // Map DB structure to UI structure
          const formatted = myTrips.map(t => {
            const distance = ((t.end_reading || 0) - (t.start_reading || 0)).toFixed(1);
            return {
              id: t.id,
              date: t.created_at || t.start_capture_timestamp || new Date().toISOString(),
              status: t.approval_status || 'pending',
              locations: t.locations_visited || 'Route tracking completed.',
              distance: distance > 0 ? distance : '0.0',
              fuelAmount: t.fuel_amount || 0,
              startTime: t.start_capture_timestamp ? new Date(t.start_capture_timestamp).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : 'N/A',
              endTime: t.created_at ? new Date(t.created_at).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : 'N/A',
              mapImage: t.map_history_url || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
              odometerImage: t.end_odometer_url || t.start_odometer_url || 'https://images.unsplash.com/photo-1599423689404-5154ee0d2023?w=400&q=80'
            };
          });
          setHistoryData(formatted);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);"""

content = content[:start_idx] + content[end_idx:]
content = content.replace("export default function HistoryPage() {\n  const { user } = useAuthStore();\n  const [expandedId, setExpandedId] = useState<string | null>(null);", new_comp_start)

content = content.replace("mockHistoryData.map", "historyData.map")
content = content.replace("March 2024", "{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}")
content = content.replace("trip.status === 'Approved'", "trip.status?.toLowerCase() === 'approved'")
content = content.replace("{trip.status}", "{trip.status?.toUpperCase()}")

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("History wired")
