'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Search, Map as MapIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const RouteMap = dynamic(() => import('@/components/ui/RouteMap'), { ssr: false });

export default function TrackingHistoryPage() {
  const [agentId, setAgentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !date) return;
    
    setLoading(true);
    setMapData(null);
    try {
      const filename = `map_history/${agentId}_${date}.json`;
      const url = `https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/${filename}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('No GPS history found for this agent on this date.');
      }
      
      const data = await res.json();
      setMapData(data);
      toast.success('Map history loaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-primary" /> GPS Tracking History
        </h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Agent ID</label>
              <input 
                type="text" 
                placeholder="e.g. AG1001 or UUID"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="w-full md:w-auto">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Search Route
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {mapData && (
        <Card>
          <CardHeader>
            <CardTitle>Route Map: {mapData.agent_name || 'Agent'} ({mapData.date})</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700">Locations Visited</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 mt-1">
                {mapData.locations || 'No locations recorded.'}
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '500px' }}>
              {mapData.waypoints && mapData.waypoints.length > 0 ? (
                <RouteMap waypoints={mapData.waypoints} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                  No GPS coordinates were captured for this trip.
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
