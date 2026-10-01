'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/store';
import { MapPin, Calendar, Camera, Clock, IndianRupee } from 'lucide-react';
import { ImageViewer } from '@/components/ui/ImageViewer';

const mockHistoryData = [
  {
    id: 'TRP-1042',
    date: '2024-03-12',
    status: 'Approved',
    locations: 'Dispur Supermarket, Ganeshguri Flyover Panels, Beltola Tiniali',
    distance: '45.2',
    fuelAmount: 450,
    startTime: '09:15 AM',
    endTime: '06:30 PM',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
    odometerImage: 'https://images.unsplash.com/photo-1599423689404-5154ee0d2023?w=400&q=80'
  },
  {
    id: 'TRP-1038',
    date: '2024-03-11',
    status: 'Pending',
    locations: 'Zoo Road Panels, Commerce College Bylanes, Chandmari',
    distance: '28.5',
    fuelAmount: 0,
    startTime: '10:00 AM',
    endTime: '05:45 PM',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
    odometerImage: 'https://images.unsplash.com/photo-1599423689404-5154ee0d2023?w=400&q=80'
  }
];

export default function HistoryPage() {
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (user?.role !== 'field_agent') {
    return <div className="p-8 text-center text-gray-500">Only field agents can access this specific view.</div>;
  }

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold text-gray-900">My History</h1>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
          March 2024
        </span>
      </div>

      <div className="space-y-4">
        {mockHistoryData.map((trip) => (
          <div 
            key={trip.id} 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div 
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
              onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}
            >
              <div className="flex items-center gap-4">
                <div className={h-12 w-12 rounded-full flex items-center justify-center \}>
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{new Date(trip.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                  <p className="text-sm text-gray-500">{trip.distance} KM Logged</p>
                </div>
              </div>
              <div className="text-right">
                <span className={	ext-xs font-bold uppercase tracking-wider \}>
                  {trip.status}
                </span>
                {trip.fuelAmount > 0 && (
                  <p className="text-sm font-semibold text-gray-700 mt-1 flex items-center justify-end gap-1">
                    <IndianRupee className="h-3 w-3" /> {trip.fuelAmount}
                  </p>
                )}
              </div>
            </div>

            {/* EXPANDED DETAILS */}
            {expandedId === trip.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Shift Times
                  </h4>
                  <p className="text-sm font-medium text-gray-800">{trip.startTime} — {trip.endTime}</p>
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
