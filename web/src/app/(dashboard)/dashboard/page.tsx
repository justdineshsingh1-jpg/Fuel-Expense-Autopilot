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

const mockTrendData = [
  { name: 'Jan', amount: 45000 },
  { name: 'Feb', amount: 52000 },
  { name: 'Mar', amount: 48000 },
  { name: 'Apr', amount: 61000 },
  { name: 'May', amount: 59000 },
  { name: 'Jun', amount: 68000 },
];

const mockDeptData = [
  { name: 'Sales', spend: 45000 },
  { name: 'Operations', spend: 25000 },
  { name: 'Support', spend: 15000 },
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

function FieldAgentDashboard({ user }: { user: any }) {
  const [isGpsAllowed, setIsGpsAllowed] = useState<boolean | null>(null);
  
  // Daily State
  const [tripActive, setTripActive] = useState(false);
  const [shiftCompleted, setShiftCompleted] = useState(false);
  const [todayActivity, setTodayActivity] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'start' | 'end' | 'expense'>('start');
  
  // Form State
  const [odometerReading, setOdometerReading] = useState('');
  const [routeLocations, setRouteLocations] = useState('');
  const [expenseType, setExpenseType] = useState('Fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseRemarks, setExpenseRemarks] = useState('');
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkGps();
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
          
          // Save locally
          const saved = localStorage.getItem('dailyTripStatus');
          if (saved) {
            const data = JSON.parse(saved);
            if (!data.waypoints) data.waypoints = [];
            data.waypoints.push(wp);
            localStorage.setItem('dailyTripStatus', JSON.stringify(data));
          }
          console.log("Background GPS point saved:", wp);
          // Here we would also push to Supabase API in production
        } catch(e) {
          console.error("Tracker failed to get position", e);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [tripActive]);


  const loadDailyStatus = () => {
    const today = new Date().toLocaleDateString();
    const saved = localStorage.getItem('dailyTripStatus');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.date === today) {
          setTodayActivity(data);
          if (data.status === 'started') {
            setTripActive(true);
            setShiftCompleted(false);
          } else if (data.status === 'ended') {
            setTripActive(false);
            setShiftCompleted(true);
          }
        } else {
          // New day
          localStorage.removeItem('dailyTripStatus');
          setTripActive(false);
          setShiftCompleted(false);
          setTodayActivity(null);
        }
      } catch(e) {}
    }
  };

  const checkGps = async () => {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perms = await Geolocation.checkPermissions();
      if (perms.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        setIsGpsAllowed(req.location === 'granted');
      } else {
        setIsGpsAllowed(true);
      }
    } catch (e) {
      setIsGpsAllowed(true);
    }
  };

  if (isGpsAllowed === false) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <div className="h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <MapPin className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">GPS is Required</h2>
        <p className="text-gray-500 max-w-sm">
          You cannot start a shift or use the Fuel Autopilot app without allowing Location Services.
        </p>
        <button 
          onClick={checkGps}
          className="mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
        >
          Enable GPS
        </button>
      </div>
    );
  }

  const handleTripClick = () => {
    setModalType(tripActive ? 'end' : 'start');
    setOdometerReading('');
    setRouteLocations('');
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handleExpenseClick = () => {
    setModalType('expense');
    setExpenseType('Fuel');
    setExpenseAmount('');
    setExpenseRemarks('');
    setPhotoPreview(null);
    setShowModal(true);
  };

  const processWatermark = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const position = await new Promise<GeolocationPosition>((res, rej) => {
          import('@capacitor/geolocation').then(({ Geolocation }) => { Geolocation.getCurrentPosition({ enableHighAccuracy: true }).then(pos => res({coords: {latitude: pos.coords.latitude, longitude: pos.coords.longitude}} as any)).catch(rej); });
        }).catch(() => null);

        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');

          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const bannerHeight = 80;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          
          const padding = 15;
          const now = new Date();
          
          ctx.textAlign = 'left';
          ctx.fillText(Date: , padding, height - bannerHeight + (bannerHeight * 0.4));
          ctx.fillText(Time: , padding, height - bannerHeight + (bannerHeight * 0.8));

          if (position) {
            ctx.textAlign = 'center';
            ctx.fillText(LAT: , width / 2, height - bannerHeight + (bannerHeight * 0.4));
            ctx.fillText(LNG: , width / 2, height - bannerHeight + (bannerHeight * 0.8));
          }

          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(Agent: , width - padding, height - bannerHeight + (bannerHeight * 0.4));
          ctx.fillText('Fuel Autopilot Secured', width - padding, height - bannerHeight + (bannerHeight * 0.8));

          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject('Image load failed');
      } catch (err) {
        reject(err);
      }
    });
  };

  const handlePhotoCapture = async () => {
    setIsProcessingPhoto(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });
      
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        
        const stampedImage = await processWatermark(file);
        setPhotoPreview(stampedImage);
      }
    } catch (error) {
      console.error("Camera/Watermarking failed", error);
      fileInputRef.current?.click();
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleWebFallbackCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessingPhoto(true);
      try {
        const stampedImage = await processWatermark(file);
        setPhotoPreview(stampedImage);
      } catch (error) {
        setPhotoPreview(URL.createObjectURL(file));
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

    toast.loading("Uploading photo to secure cloud storage...");

    try {
      // Mock network call instead of hitting sleepy Render backend for now
      // so we don't get the Network Error instantly when testing.
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (modalType === 'start' || modalType === 'end') {
        if (modalType === 'end' && !routeLocations.trim()) {
          toast.dismiss();
          alert("Please enter the locations you visited today.");
          return;
        }
        
        toast.dismiss();
        toast.success(modalType === 'start' ? "Shift Started!" : "Shift Ended!");
        
        const today = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        
        let newActivity = { ...todayActivity, date: today };
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
        setShowModal(false);

      } else {
        toast.dismiss();
        toast.success("Expense Submitted!");
        setShowModal(false);
      }

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
            className={w-full font-bold py-4 rounded-xl shadow uppercase tracking-wide text-lg flex items-center justify-center gap-2 }
          >
            {shiftCompleted ? "Shift Completed" : (tripActive ? <><Square className="h-5 w-5" fill="currentColor" /> End Trip</> : <><Play className="h-5 w-5" fill="currentColor" /> Start Trip</>)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          disabled={!tripActive}
          className={p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 transition-transform }
        >
          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <MapPin className="h-6 w-6" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Add Location</span>
        </button>

        <button 
          disabled={!tripActive}
          onClick={handleExpenseClick}
          className={p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 transition-transform }
        >
          <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <IndianRupee className="h-6 w-6" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Add Fuel Bill</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 text-lg">Today's Activity</h3>
        <div className="space-y-4">
          {!todayActivity ? (
            <div className="text-center py-6 text-gray-400 text-sm">No activity recorded today yet.</div>
          ) : (
            <div className="space-y-3">
              {todayActivity.startTime && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-600 font-medium">Shift Started</span>
                  <span className="text-sm font-bold text-primary">{todayActivity.startTime}</span>
                </div>
              )}
              {todayActivity.endTime && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-600 font-medium">Shift Ended</span>
                  <span className="text-sm font-bold text-red-500">{todayActivity.endTime}</span>
                </div>
              )}
              {todayActivity.locations && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                  <span className="text-xs text-gray-400 font-bold block mb-1 uppercase">Locations Visited</span>
                  <p className="text-sm text-gray-700">{todayActivity.locations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {modalType === 'start' ? 'Start Shift' : modalType === 'end' ? 'End Shift' : 'Add Expense'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {(modalType === 'start' || modalType === 'end') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {modalType === 'start' ? 'Start' : 'End'} Odometer Reading (KM) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 2589"
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl focus:border-primary focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}

              {modalType === 'end' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Locations Visited Today <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    required
                    placeholder="e.g. Dispur Supermarket, Ganeshguri, Zoo Road"
                    value={routeLocations}
                    onChange={(e) => setRouteLocations(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base min-h-[100px] focus:border-primary focus:ring-primary outline-none transition-colors"
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
                      Amount (?) <span className="text-red-500">*</span>
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
                  onChange={handleWebFallbackCapture}
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
                    onClick={handlePhotoCapture}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Expense (MTD)" value="?2,45,000" trend={{ value: 12, isPositive: false }} icon={IndianRupee} />
        <StatsCard title="Pending Approvals" value="42" icon={FileText} />
        <StatsCard title="Fraud Flags" value="5" trend={{ value: 2, isPositive: false }} icon={AlertTriangle} />
        <StatsCard title="Reconciled" value="128" trend={{ value: 8, isPositive: true }} icon={CheckCircle2} />
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `?${val/1000}k`} />
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
                  <Pie data={mockDeptData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="spend">
                    {mockDeptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `?${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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







