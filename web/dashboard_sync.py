import os
import re

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

# 1. Add Imports
if "import { saveOfflineTask" not in content:
    content = content.replace(
        "import { ImageViewer } from '@/components/ui/ImageViewer';", 
        "import { ImageViewer } from '@/components/ui/ImageViewer';\nimport { saveOfflineTask, getOfflineQueue, removeOfflineTask, getQueueCount, OfflineTask } from '@/lib/offlineSync';"
    )

# 2. Add queue state
if "const [queueCount, setQueueCount] = useState(0);" not in content:
    content = content.replace(
        "const [todayActivity, setTodayActivity] = useState<any>(null);",
        "const [todayActivity, setTodayActivity] = useState<any>(null);\n  const [queueCount, setQueueCount] = useState(0);\n  const [isSyncing, setIsSyncing] = useState(false);"
    )

# 3. Add Sync Logic (Background Worker)
sync_logic = """
  // BACKGROUND SYNC WORKER
  const processSyncQueue = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const queue = await getOfflineQueue();
      setQueueCount(queue.length);
      
      for (const task of queue) {
        try {
          // 1. Upload Photo
          const byteCharacters = atob(task.photoBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {type: 'image/jpeg'});
          
          const uploadRes = await fetch('https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/fuel-receipts/' + task.filename, {
            method: 'POST',
            headers: { 
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8',
              'Content-Type': 'image/jpeg'
            },
            body: blob
          });
          if (!uploadRes.ok) throw new Error("Sync photo upload failed");

          // 2. Upload Map Data if End Shift
          if (task.type === 'end' && task.mapData && task.mapFilename) {
            await fetch('https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/fuel-receipts/' + task.mapFilename, {
              method: 'POST',
              headers: { 
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8',
                'Content-Type': 'application/json',
                'x-upsert': 'true'
              },
              body: JSON.stringify(task.mapData)
            });
          }

          // 3. Hit Database API
          const endpoint = task.type === 'expense' ? '/api/expenses' : '/api/trips';
          const apiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task.payload)
          });
          if (!apiRes.ok) throw new Error("Sync database failed");

          // Success! Remove from queue
          await removeOfflineTask(task.id);
        } catch (e) {
          console.error("Task failed to sync, keeping in queue", e);
        }
      }
      
      const remaining = await getQueueCount();
      setQueueCount(remaining);
      if (queue.length > 0 && remaining === 0) {
         toast.success("Offline data synchronized successfully!");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initial check
    getQueueCount().then(setQueueCount);
    // Listen for network reconnect
    window.addEventListener('online', processSyncQueue);
    // Interval check every 30s
    const interval = setInterval(processSyncQueue, 30000);
    // Run once on boot
    if (navigator.onLine) processSyncQueue();
    
    return () => {
      window.removeEventListener('online', processSyncQueue);
      clearInterval(interval);
    };
  }, []);
"""
if "processSyncQueue" not in content:
    content = content.replace(
        "// BACKGROUND GPS TRACKER",
        sync_logic + "\n  // BACKGROUND GPS TRACKER"
    )

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Added Sync logic to Dashboard")
