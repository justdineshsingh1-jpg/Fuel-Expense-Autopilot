'use client';

import React, { useState, useRef, useEffect } from 'react';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  IndianRupee,
  MapPin,
  Camera,
  Play,
  Square,
  X,
  Loader2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';

function FieldAgentDashboard({ user }: { user: any }) {
  const [tripActive, setTripActive] = useState(false);
  const [shiftCompleted, setShiftCompleted] = useState(false);
  
  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'start' | 'end' | 'expense'>('start');
  
  // Odometer State
  const [odometerReading, setOdometerReading] = useState('');
  const [routeLocations, setRouteLocations] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  // Expense State
  const [expenseType, setExpenseType] = useState('Fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseRemarks, setExpenseRemarks] = useState('');
  
  // UI State
  const [todayActivity, setTodayActivity] = useState<any>({
    status: 'pending',
    startTime: null,
    endTime: null,
    startOdo: null,
    endOdo: null,
    date: new Date().toLocaleDateString()
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDailyStatus = async () => {
      try {
        const saved = localStorage.getItem('dailyTripStatus');
        if (saved) {
          const data = JSON.parse(saved);
          const today = new Date().toLocaleDateString();
          if (data.date === today) {
            setTodayActivity(data);
            if (data.status === 'started') setTripActive(true);
            if (data.status === 'ended') setShiftCompleted(true);
          } else {
            localStorage.removeItem('dailyTripStatus');
          }
        }
      } catch(e) {}
    };
    loadDailyStatus();
  }, []);

  // BACKGROUND GPS TRACKER
  useEffect(() => {
    let intervalId: any;
    if (tripActive) {
      intervalId = setInterval(async () => {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
          const wp = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: new Date().toLocaleTimeString()
          };
          const saved = localStorage.getItem('dailyTripStatus');
          if (saved) {
            const data = JSON.parse(saved);
            if (!data.waypoints) data.waypoints = [];
            data.waypoints.push(wp);
            localStorage.setItem('dailyTripStatus', JSON.stringify(data));
          }
        } catch(e) {
          console.error("Tracker failed to get position", e);
        }
      }, 5 * 60 * 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [tripActive]);

  // Aggressive GPS Guard
  useEffect(() => {
    const checkGps = async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          // In real app we block UI here until granted
        }
      } catch(e) {}
    };
    checkGps();
  }, []);

  const handleTripClick = () => {
    if (shiftCompleted) {
      toast.error("You have already completed your shift today!");
      return;
    }
    setModalType(tripActive ? 'end' : 'start');
    setOdometerReading('');
    setRouteLocations('');
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handleExpenseClick = () => {
    setModalType('expense');
    setExpenseAmount('');
    setExpenseRemarks('');
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        let position: any = null;
        try {
          position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        } catch(e) {
          console.error("GPS Error", e);
        }

        // Reverse Geocode
        let address = "Location unavailable";
        let cityState = "Unknown Location";
        if (position) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await res.json();
            address = data.display_name || address;
            cityState = data.address?.state_district || data.address?.city || data.address?.state || cityState;
          } catch(e) {
            console.error("Geocode Error", e);
          }
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context missing");

        ctx.drawImage(img, 0, 0);

        // Watermark Box Design (Inspired by GPS Map Camera)
        const margin = Math.max(10, img.width * 0.02);
        const boxHeight = Math.max(100, img.height * 0.15);
        const boxY = img.height - boxHeight - margin;
        const boxWidth = img.width - (margin * 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        // Draw rounded rectangle if supported, else fallback to standard rect
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(margin, boxY, boxWidth, boxHeight, 15);
            ctx.fill();
        } else {
            ctx.fillRect(margin, boxY, boxWidth, boxHeight);
        }

        const textX = margin + 15;
        let textY = boxY + (boxHeight * 0.25);
        
        ctx.textAlign = 'left';
        
        // 1. City / State (Bold white with Indian Flag emoji)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(20, img.height * 0.025)}px sans-serif`;
        ctx.fillText(`🇮🇳 ${cityState}`, textX, textY);
        
        // 2. Full Address (Smaller gray/white)
        textY += (boxHeight * 0.25);
        ctx.font = `normal ${Math.max(14, img.height * 0.018)}px sans-serif`;
        ctx.fillStyle = '#e5e7eb';
        const maxChars = Math.floor(boxWidth / (img.height * 0.012));
        const shortAddr = address.length > maxChars ? address.substring(0, maxChars) + '...' : address;
        ctx.fillText(shortAddr, textX, textY);
        
        // 3. Lat/Long & Accuracy (Blue / Green)
        textY += (boxHeight * 0.28);
        ctx.font = `normal ${Math.max(14, img.height * 0.018)}px sans-serif`;
        
        if (position) {
            const latLng = `Lat ${position.coords.latitude.toFixed(6)}° Long ${position.coords.longitude.toFixed(6)}°`;
            const acc = position.coords.accuracy ? `  •  Acc: ±${Math.round(position.coords.accuracy)}m` : '';
            const time = `  •  ${new Date().toLocaleString()}`;
            
            ctx.fillStyle = '#60a5fa'; // Blue
            ctx.fillText(latLng, textX, textY);
            
            const latLngWidth = ctx.measureText(latLng).width;
            ctx.fillStyle = '#4ade80'; // Green
            ctx.fillText(acc, textX + latLngWidth, textY);
            
            const accWidth = ctx.measureText(acc).width;
            ctx.fillStyle = '#9ca3af'; // Gray
            ctx.fillText(time, textX + latLngWidth + accWidth, textY);
        } else {
            ctx.fillStyle = '#f87171'; // Red
            ctx.fillText(`GPS SIGNAL NOT FOUND  •  ${new Date().toLocaleString()}`, textX, textY);
        }

        const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoPreview(watermarkedUrl);
      } catch (error) {
        setPhotoPreview(URL.createObjectURL(file)); console.error(error);
      } finally {
        setIsProcessingPhoto(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
         if (!expRes.ok) { const errData = await expRes.json(); throw new Error(errData.error || "Failed to save expense"); }
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
         if (!tripRes.ok) { const errData = await tripRes.json(); throw new Error(errData.error || "Failed to save trip to database"); }
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

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      <div className="bg-primary text-white p-6 rounded-2xl shadow-lg text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Hi, {user?.name.split(' ')[0] || 'Agent'}</h2>
          <p className="opacity-90 mb-6">
            {shiftCompleted ? "Your shift is completed for today." : (tripActive ? "Your trip is currently active." : "Ready to start your day?")}
          </p>
          
          <button 
            onClick={handleTripClick}
            disabled={shiftCompleted}
            className={`w-full font-bold py-4 rounded-xl shadow uppercase tracking-wide text-lg flex items-center justify-center gap-2 ${shiftCompleted ? 'bg-gray-400 text-white cursor-not-allowed' : (tripActive ? 'bg-red-500 text-white' : 'bg-white text-primary')}`}
          >
            {shiftCompleted ? "Shift Completed" : (tripActive ? <><Square className="h-5 w-5" fill="currentColor" /> End Trip</> : <><Play className="h-5 w-5" fill="currentColor" /> Start Trip</>)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          disabled={!tripActive}
          className={`p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 transition-transform ${tripActive ? 'bg-white active:scale-95' : 'bg-gray-50 opacity-50'}`}
          onClick={handleExpenseClick}
        >
          <div className="bg-orange-100 p-3 rounded-full text-orange-600">
            <IndianRupee className="h-6 w-6" />
          </div>
          <span className="font-semibold text-gray-700">Add Expense</span>
        </button>

        <button 
          disabled={!tripActive}
          className={`p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 transition-transform ${tripActive ? 'bg-white active:scale-95' : 'bg-gray-50 opacity-50'}`}
        >
          <div className="bg-blue-100 p-3 rounded-full text-blue-600">
            <MapPin className="h-6 w-6" />
          </div>
          <span className="font-semibold text-gray-700">Check In</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Today's Activity
        </h3>
        {todayActivity.status === 'pending' ? (
          <div className="text-center py-6 text-gray-400">
            <p>No activity yet.</p>
            <p className="text-sm">Start your trip to track progress.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-500">Shift Started</span>
              <span className="font-semibold text-gray-900">{todayActivity.startTime || '--:--'}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-500">Starting Odometer</span>
              <span className="font-semibold text-gray-900">{todayActivity.startOdo || '0'} KM</span>
            </div>
            {todayActivity.status === 'ended' && (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-gray-500">Shift Ended</span>
                  <span className="font-semibold text-gray-900">{todayActivity.endTime}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-gray-500">Ending Odometer</span>
                  <span className="font-semibold text-gray-900">{todayActivity.endOdo} KM</span>
                </div>
                <div className="pt-2">
                  <span className="text-gray-500 block mb-2">Locations Visited</span>
                  <p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">{todayActivity.locations}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg">
                {modalType === 'start' ? 'Start Shift' : modalType === 'end' ? 'End Shift' : 'Add Expense Bill'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {(modalType === 'start' || modalType === 'end') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {modalType === 'start' ? 'Start' : 'End'} Odometer Reading (KM) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 45201"
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-primary focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}

              {modalType === 'end' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Route / Locations Visited <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    required
                    placeholder="e.g. GS Road Hengrabari, Panbazar, Jhalukbari..."
                    value={routeLocations}
                    onChange={(e) => setRouteLocations(e.target.value)}
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-primary focus:ring-primary outline-none transition-colors resize-none"
                  />
                </div>
              )}

              {modalType === 'expense' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expense Type <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-primary focus:ring-primary outline-none transition-colors bg-white"
                    >
                      <option value="Fuel">Fuel / Petrol</option>
                      <option value="Servicing">Bike Servicing</option>
                      <option value="Spare Parts">Spare Parts</option>
                      <option value="Toll/Parking">Toll / Parking</option>
                      <option value="Other">Other (Specify below)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 450"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-primary focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks / Details
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Changed engine oil"
                      value={expenseRemarks}
                      onChange={(e) => setExpenseRemarks(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-primary focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {modalType === 'expense' ? 'Live Bill Photo' : 'Live Dashboard Photo'} <span className="text-red-500">*</span>
                </label>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden" 
                />
                
                {isProcessingPhoto ? (
                  <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
                    <Loader2 className="h-8 w-8 mb-2 text-primary animate-spin" />
                    <span className="font-medium">Stamping GPS & Time...</span>
                    <span className="text-xs mt-1 text-gray-400">Please wait</span>
                  </div>
                ) : !photoPreview ? (
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-primary transition-colors"
                  >
                    <Camera className="h-8 w-8 mb-2 text-gray-400" />
                    <span className="font-medium">Tap to open Camera</span>
                    <span className="text-xs mt-1 text-gray-400">Will auto-stamp GPS location</span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border-2 border-primary">
                    <img src={photoPreview} alt="Preview" className="w-full h-auto object-cover" />
                    <button 
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow transition-colors"
              >
                Confirm & Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

  if (user?.role === 'field_agent') {
    return <FieldAgentDashboard user={user} />;
  }

  const mockTrendData = [{ name: 'Today', amount: 0 }];
  
  const mockDeptData = [{ name: 'No Data', value: 1 }];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Expense (MTD)" value="₹0" trend={{ value: 12, isPositive: false }} icon={IndianRupee} />
        <StatsCard title="Pending Approvals" value="0" icon={FileText} />
        <StatsCard title="Fraud Flags" value="0" trend={{ value: 2, isPositive: false }} icon={AlertTriangle} />
        <StatsCard title="Reconciled" value="0" trend={{ value: 8, isPositive: true }} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense Trend</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mockDeptData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                    {mockDeptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
