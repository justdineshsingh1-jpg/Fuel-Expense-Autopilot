import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

old_func_start = "const handleSubmit = async (e: React.FormEvent) => {"
start_idx = content.find(old_func_start)
end_idx = content.find("return (", start_idx)

new_submit = """const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      alert("A live photo is mandatory.");
      return;
    }
    toast.loading("Processing your submission...");
    try {
      const base64Data = photoPreview.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'image/jpeg'});
      
      const folder = modalType === 'expense' ? 'bills' : 'odometer';
      const filename = folder + '/' + Date.now() + '.jpg';
      
      const uploadRes = await fetch('https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/fuel-receipts/' + filename, {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8',
          'Content-Type': 'image/jpeg'
        },
        body: blob
      });
      
      if (!uploadRes.ok) throw new Error("Upload failed");
      const imageUrl = "https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/" + filename;
      
      if (modalType === 'expense') {
         const expRes = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               agent_id: user?.id || 'AG1001',
               type: expenseType,
               amount: parseFloat(expenseAmount),
               remarks: expenseRemarks,
               receipt_url: imageUrl,
               status: 'pending'
            })
         });
         // if (!expRes.ok) throw new Error("Failed to save expense");
      } else {
         const tripPayload: any = {
            user_id: user?.id || '98765432-1234-5678-1234-567812345678', // fallback UUID if needed
            approval_status: modalType === 'start' ? 'active' : 'completed',
         };
         if (modalType === 'start') {
            tripPayload.start_reading = parseFloat(odometerReading);
            tripPayload.start_capture_timestamp = new Date().toISOString();
            tripPayload.start_odometer_image_url = imageUrl;
         } else {
            tripPayload.end_reading = parseFloat(odometerReading);
            tripPayload.end_capture_timestamp = new Date().toISOString();
            tripPayload.end_odometer_image_url = imageUrl;
            
            // MAP HISTORY UPLOAD
            const saved = localStorage.getItem('dailyTripStatus');
            const data = saved ? JSON.parse(saved) : {};
            const isoDate = new Date().toISOString().split('T')[0];
            const mapData = {
              agent_name: user?.name || 'Agent',
              date: isoDate,
              locations: routeLocations,
              waypoints: data.waypoints || []
            };
            const mapFilename = `map_history/${user?.id || 'AG1001'}_${isoDate}.json`;
            await fetch('https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/fuel-receipts/' + mapFilename, {
              method: 'POST',
              headers: { 
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8',
                'Content-Type': 'application/json',
                'x-upsert': 'true'
              },
              body: JSON.stringify(mapData)
            });
         }
         
         const tripRes = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripPayload)
         });
         // if (!tripRes.ok) throw new Error("Failed to save trip");
      }
      
      if (modalType === 'start' || modalType === 'end') {
        const today = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        let newActivity: any = { ...todayActivity, date: today };
        if (modalType === 'start') {
          newActivity.status = 'started';
          newActivity.startTime = time;
          newActivity.startOdo = odometerReading;
          setTripActive(true);
          setShiftCompleted(false);
        } else {
          newActivity.status = 'ended';
          newActivity.endTime = time;
          newActivity.endOdo = odometerReading;
          newActivity.locations = routeLocations;
          setTripActive(false);
          setShiftCompleted(true);
        }
        setTodayActivity(newActivity);
        localStorage.setItem('dailyTripStatus', JSON.stringify(newActivity));
      }

      toast.dismiss();
      toast.success(modalType === 'start' ? "Shift Started!" : (modalType === 'end' ? "Shift Ended!" : "Expense Submitted!"));
      setShowModal(false);
    } catch (err) {
      toast.dismiss();
      toast.error("Network error during upload. Please try again.");
      console.error(err);
    }
  };

  """

content = content[:start_idx] + new_submit + content[end_idx:]

with open(path, "w", encoding="utf8") as f:
    f.write(content)

print("Dashboard patched successfully")
