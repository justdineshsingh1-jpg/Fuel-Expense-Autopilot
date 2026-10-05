'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { MapPin, Calendar, Clock, IndianRupee } from 'lucide-react';
import { ImageViewer } from '@/components/ui/ImageViewer';



export default function HistoryPage() {
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!user) return;
    fetch('https://fuel-expense-autopilot.vercel.app/api/trips')
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
              distance: Number(distance) > 0 ? distance : '0.0',
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
  }, [user]);

  if (user?.role !== 'field_agent') {
    return <div className="p-8 text-center text-gray-500">Only field agents can access this specific view.</div>;
  }

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold text-gray-900">My History</h1>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="space-y-4">
        {historyData.length === 0 && !isLoading && <div className="text-center p-8 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">No trips found for this month. Start a trip to see history here!</div>}
        {isLoading && <div className="text-center p-8 text-gray-500">Loading history...</div>}
        {historyData.map((trip) => (
          <div 
            key={trip.id} 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div 
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
              onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${trip.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{new Date(trip.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                  <p className="text-sm text-gray-500">{trip.distance} KM Logged</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold uppercase tracking-wider ${trip.status?.toLowerCase() === 'approved' ? 'text-green-600' : 'text-orange-500'}`}>
                  {trip.status?.toUpperCase()}
                </span>
                {trip.fuelAmount > 0 && (
                  <p className="text-sm font-semibold text-gray-700 mt-1 flex items-center justify-end gap-1">
                    <IndianRupee className="h-3 w-3" /> {trip.fuelAmount}
                  </p>
                )}
              </div>
            </div>

            {expandedId === trip.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Shift Times
                  </h4>
                  <p className="text-sm font-medium text-gray-800">{trip.startTime} - {trip.endTime}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Locations Visited
                  </h4>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100 leading-relaxed">
                    {trip.locations}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Final Odometer</h4>
                    <div className="h-24 w-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
                      <ImageViewer src={trip.odometerImage} alt="Odometer" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">GPS Route Map</h4>
                    <div className="h-24 w-full rounded-xl overflow-hidden shadow-sm border border-gray-200 relative">
                      <ImageViewer src={trip.mapImage} alt="Map Route" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
