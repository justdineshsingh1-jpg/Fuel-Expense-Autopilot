const fs = require('fs');
const path = 'c:/Users/MIS/OneDrive/Fuel Expense Autopilot/web/src/app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const sIdx = content.indexOf("const handleSubmit = async (e: React.FormEvent) => {");
const errIdx = content.indexOf('toast.error("Network error during upload. Please try again.");', sIdx);
const endIdx = content.indexOf("}", errIdx);

if (sIdx > -1 && endIdx > -1) {
  let newHandle = `const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      alert("A live photo is mandatory.");
      return;
    }
    toast.loading("Processing your submission...");
    try {
      const base64Data = photoPreview.split(',')[1];
      const folder = modalType === 'expense' ? 'bills' : 'odometer';
      const filename = folder + '/' + Date.now() + '.jpg';
      const imageUrl = "https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/" + filename;
      
      let payload: any = {};
      let mapData: any = null;
      let mapFilename: string | undefined = undefined;

      if (modalType === 'expense') {
         payload = {
           agent_id: user?.id || 'AG1001',
           type: expenseType,
           amount: parseFloat(expenseAmount),
           remarks: expenseRemarks,
           receipt_url: imageUrl,
           status: 'pending'
         };
      } else {
         payload = {
            user_id: user?.id || '98765432-1234-5678-1234-567812345678',
            approval_status: modalType === 'start' ? 'active' : 'completed',
         };
         if (modalType === 'start') {
            payload.start_reading = parseFloat(odometerReading);
            payload.start_capture_timestamp = new Date().toISOString();
            payload.start_odometer_image_url = imageUrl;
         } else {
            payload.end_reading = parseFloat(odometerReading);
            payload.end_capture_timestamp = new Date().toISOString();
            payload.end_odometer_image_url = imageUrl;
            
            const saved = localStorage.getItem('dailyTripStatus');
            const data = saved ? JSON.parse(saved) : {};
            const isoDate = new Date().toISOString().split('T')[0];
            mapData = {
              agent_name: user?.name || 'Agent',
              date: isoDate,
              locations: routeLocations,
              waypoints: data.waypoints || []
            };
            mapFilename = \`map_history/\${user?.id || 'AG1001'}_\${isoDate}.json\`;
         }
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

      const task = {
         id: Date.now().toString(),
         type: modalType as any,
         payload,
         photoBase64: base64Data,
         filename,
         mapData,
         mapFilename,
         timestamp: Date.now()
      };

      if (!navigator.onLine) {
         await saveOfflineTask(task);
         setQueueCount(c => c + 1);
         toast.dismiss();
         toast.success("Saved Offline! Will sync when connected.");
         setShowModal(false);
         return;
      }

      try {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {type: 'image/jpeg'});
          
          const uploadRes = await fetch('https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/fuel-receipts/' + filename, {
            method: 'POST',
            headers: { 
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8',
              'Content-Type': 'image/jpeg'
            },
            body: blob
          });
          if (!uploadRes.ok) throw new Error("Upload failed");

          if (mapData && mapFilename) {
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

          const endpoint = modalType === 'expense' ? '/api/expenses' : '/api/trips';
          const apiRes = await fetch(endpoint, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload)
          });
          if (!apiRes.ok) throw new Error("Database save failed");
          
          toast.dismiss();
          toast.success(modalType === 'start' ? "Shift Started!" : (modalType === 'end' ? "Shift Ended!" : "Expense Submitted!"));
      } catch (err) {
          await saveOfflineTask(task);
          setQueueCount(c => c + 1);
          toast.dismiss();
          toast.success("Network weak. Saved Offline! Will sync soon.");
      }
      setShowModal(false);
    } catch (err) {
        toast.dismiss();
        toast.error("An error occurred processing the photo.");
        console.error(err);
    }`;

  content = content.substring(0, sIdx) + newHandle + content.substring(endIdx + 1);
  
  if (!content.includes('queueCount > 0')) {
    content = content.replace(
      '<div className="flex items-center gap-3 mb-6">',
      `<div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Welcome back,</p>
            <h1 className="text-xl font-bold text-gray-900">{user?.name || 'Agent'}</h1>
          </div>
        </div>
        {queueCount > 0 && (
          <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            {queueCount} Pending Sync
          </div>
        )}
      </div>
      {/*`
    );
    content = content.replace('{/*\n          <div className="bg-primary/10 p-3 rounded-2xl text-primary">', '<div className="hidden">');
  }
  
  fs.writeFileSync(path, content, 'utf8');
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
