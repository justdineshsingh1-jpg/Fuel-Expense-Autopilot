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
  const [tripActive, setTripActive] = useState(false);
  
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // 1. Get GPS Location
        const position = await new Promise<GeolocationPosition>((res, rej) => {
          import('@capacitor/geolocation').then(({ Geolocation }) => { Geolocation.getCurrentPosition({ enableHighAccuracy: true }).then(pos => res({coords: {latitude: pos.coords.latitude, longitude: pos.coords.longitude}})).catch(rej); }); /*
            enableHighAccuracy: true,
            timeout: 7000,
            */ }).catch(() => null);

        // 2. Load Image
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
          // 3. Setup Canvas (Scale down if too huge to save memory)
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

          // Draw Original Image
          ctx.drawImage(img, 0, 0, width, height);

          // 4. Draw Watermark Background Banner
          const bannerHeight = Math.max(80, height * 0.12);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

          // 5. Draw Text
          const fontSize = Math.max(16, width * 0.025);
          ctx.font = `${fontSize}px Arial`;
          ctx.fillStyle = 'white';
          ctx.textAlign = 'left';
          
          const padding = width * 0.03;
          const now = new Date();
          const timeStr = now.toLocaleString('en-IN');
          
          let geoStr = 'GPS: Location Unavailable';
          if (position) {
            geoStr = `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`;
          }

          // Top line: Date/Time
          ctx.fillText(`Date: ${timeStr}`, padding, height - bannerHeight + (bannerHeight * 0.4));
          
          // Bottom line: GPS
          ctx.fillStyle = position ? '#4ade80' : '#f87171'; // green if success, red if failed
          ctx.fillText(geoStr, padding, height - bannerHeight + (bannerHeight * 0.8));
          
          // Right side: User/App Info
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(`Agent: ${user?.name || 'Unknown'}`, width - padding, height - bannerHeight + (bannerHeight * 0.4));
          ctx.fillText('Fuel Autopilot Secured', width - padding, height - bannerHeight + (bannerHeight * 0.8));

          // 6. Export
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
        // fetch the blob
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        
        const stampedImage = await processWatermark(file);
        setPhotoPreview(stampedImage);
      }
    } catch (error) {
      console.error("Camera/Watermarking failed", error);
      // Fallback for desktop browsers testing
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

    // Indicate loading state (you could add a loading spinner state here)
    toast.loading("Uploading photo to secure cloud storage...");

    try {
      // Upload the compressed photo to the new backend base64 endpoint
      const uploadRes = await fetch('https://fuel-expense-autopilot-1.onrender.com/api/upload/base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_base64: photoPreview,
          folder: modalType === 'expense' ? 'bills' : 'odometer'
        })
      });

      if (!uploadRes.ok) throw new Error("Image upload failed");
      const { url } = await uploadRes.json();
      
      toast.dismiss();
      toast.success("Image safely stored in Cloud!");

      // Here is where we will soon add the POST /api/trips submission logic
      console.log("Uploaded Cloud URL:", url);

      if (modalType === 'expense') {
        if (!expenseAmount) {
          alert("Amount is mandatory.");
          return;
        }
        toast.success("Expense submitted successfully!");
        setShowModal(false);
        return;
      }

      if (!odometerReading) {
        alert("Odometer reading is mandatory.");
        return;
      }

      if (modalType === 'end' && !routeLocations) {
        alert("Please enter the locations you visited today.");
        return;
      }
      
      toast.success(modalType === 'start' ? "Shift Started!" : "Shift Ended!");
      setTripActive(modalType === 'start');
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
          <p className="opacity-90 mb-6">{tripActive ? "Your trip is currently active." : "Ready to start your day?"}</p>
          
          <button 
            onClick={handleTripClick}
            className={`w-full font-bold py-4 rounded-xl shadow uppercase tracking-wide text-lg flex items-center justify-center gap-2 ${tripActive ? 'bg-red-500 text-white' : 'bg-white text-primary'}`}
          >
            {tripActive ? <><Square className="h-5 w-5" fill="currentColor" /> End Trip</> : <><Play className="h-5 w-5" fill="currentColor" /> Start Trip</>}
          </button>
        </div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          disabled={!tripActive}
          className={`p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 transition-transform ${tripActive ? 'bg-white active:scale-95' : 'bg-gray-50 opacity-50'}`}
        >
          <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <MapPin className="h-7 w-7" />
          </div>
          <span className="font-semibold text-gray-700">Check-in GPS</span>
        </button>
        <button 
          onClick={handleExpenseClick}
          disabled={!tripActive}
          className={`p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 transition-transform ${tripActive ? 'bg-white active:scale-95' : 'bg-gray-50 opacity-50'}`}
        >
          <div className="h-14 w-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <Camera className="h-7 w-7" />
          </div>
          <span className="font-semibold text-gray-700">Add Bill</span>
        </button>
      </div>
      
      <div className="mt-8">
        <h3 className="font-semibold text-gray-800 mb-4 px-1">Today's Activity</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center justify-center text-gray-400">
          <MapPin className="h-10 w-10 mb-3 opacity-20" />
          <p>No activity logged yet.</p>
          <p className="text-sm mt-1">Start your trip to begin tracking.</p>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {modalType === 'start' ? 'Start Shift' : modalType === 'end' ? 'End Shift' : 'Add Expense Bill'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* ODOMETER FIELDS */}
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

              {/* LOCATIONS FIELD (ONLY ON END SHIFT) */}
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

              {/* EXPENSE FIELDS */}
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

              {/* SHARED PHOTO UPLOAD */}
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






