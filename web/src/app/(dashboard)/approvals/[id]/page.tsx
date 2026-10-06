'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { 
  ArrowLeft, CheckCircle, XCircle, CornerUpLeft, Flag, 
  MapPin, Camera, AlertTriangle, FileText, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/ui/RouteMap'), { ssr: false });

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [comment, setComment] = useState('');
  
  const [trip, setTrip] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        // 1. Fetch real trip data from DB
        const res = await fetch(`/api/trips?id=${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch trip');
        const data = await res.json();
        setTrip(data);
        
        // 2. Fetch waypoints from Supabase Storage
        if (data && data.user_id && data.log_date) {
          const mapUrl = `https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/map_history/${data.user_id}_${data.log_date}.json`;
          const mapRes = await fetch(mapUrl);
          if (mapRes.ok) {
            const mapData = await mapRes.json();
            if (mapData && mapData.waypoints) {
              setWaypoints(mapData.waypoints);
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load real claim data");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchTrip();
  }, [params.id]);

  const handleAction = async (action: string) => {
    if (!trip) return;
    try {
      const promise = fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: [trip.id], action })
      }).then(async (res) => {
        if (!res.ok) throw new Error('Failed to update');
        return res.json();
      });

      await toast.promise(promise, {
        loading: 'Processing...',
        success: `Claim ${action}ed successfully`,
        error: 'Failed to update claim'
      });
      router.push('/approvals');
    } catch (e) {}
  };

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div><p className="mt-4 text-gray-500">Loading claim data...</p></div>;
  }
  
  if (!trip) {
    return <div className="p-8 text-center"><AlertTriangle className="h-12 w-12 text-red-500 mx-auto" /><h2 className="mt-4 text-xl font-bold">Claim Not Found</h2><Button className="mt-4" onClick={() => router.back()}>Go Back</Button></div>;
  }

  const claimedKm = (trip.end_reading && trip.start_reading) ? (trip.end_reading - trip.start_reading) : 0;
  const variance = trip.variance_percent || 0;
  const flags = trip.fraud_flags || [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            Claim {trip.id.substring(0,8).toUpperCase()}
            <Badge variant={trip.approval_status === 'approved' ? 'approved' : trip.approval_status === 'rejected' ? 'rejected' : 'pending'}>
              {trip.approval_status || 'pending'}
            </Badge>
          </h2>
          <p className="text-gray-500">Submitted on {formatDate(trip.created_at || trip.log_date)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card>
            <CardBody className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2"><User className="h-4 w-4" /> Employee</p>
                  <p className="font-bold text-gray-900">{trip.users?.full_name || 'Agent'}</p>
                  <p className="text-xs text-gray-500">{trip.users?.employee_code || trip.user_id.substring(0,6)} • {trip.users?.department || 'Operations'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Distance</p>
                  <p className="font-bold text-gray-900">{claimedKm.toFixed(1)} KM</p>
                  <p className="text-xs text-gray-500">OSRM: {(trip.osrm_calculated_km || 0).toFixed(1)} KM</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Variance</p>
                  <p className={cn("font-bold text-lg", variance > 10 ? "text-red-600" : "text-green-600")}>
                    {variance.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Amount Claimed</p>
                  <p className="font-bold text-gray-900 text-xl">{formatCurrency(trip.fuel_amount || 0)}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {flags.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-red-800 font-bold mb-1">Fraud Flags Detected</h4>
                  <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
                    {flags.map((flag: any, i: number) => (
                      <li key={i}><span className="font-bold uppercase">{flag.type || 'Warning'}:</span> {flag.description || JSON.stringify(flag)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-gray-500" /> Evidence Photos
              </CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Odometer Comparison</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Start ({trip.start_reading || 0} KM)</p>
                      <ImageViewer src={trip.start_odometer_image_url} alt="Start Odometer" className="h-32 object-cover rounded-lg border border-gray-200" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">End ({trip.end_reading || 0} KM)</p>
                      <ImageViewer src={trip.end_odometer_image_url} alt="End Odometer" className="h-32 object-cover rounded-lg border border-gray-200" />
                    </div>
                  </div>
                </div>
                {trip.fuel_bill_url && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Fuel Bill</p>
                    <ImageViewer src={trip.fuel_bill_url} alt="Fuel Bill" className="h-32 w-full object-cover rounded-lg border border-gray-200" />
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Map & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" /> GPS Route Map
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4">
              <div className="bg-gray-100 rounded-md h-64 mb-4 border border-gray-200 overflow-hidden relative z-0">
                {waypoints.length > 0 ? (
                  <RouteMap waypoints={waypoints} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                    No GPS data available for this trip.
                  </div>
                )}
              </div>
              {waypoints.length > 0 && (
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Showing {waypoints.length} GPS pings recorded during the trip.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      {trip.approval_status === 'pending' && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
            <input 
              type="text" 
              placeholder="Add comments before action..." 
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="danger" className="flex-1 sm:flex-none" onClick={() => handleAction('Reject')}>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
              <Button className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" onClick={() => handleAction('Approve')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
