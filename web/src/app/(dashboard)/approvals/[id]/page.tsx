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
  MapPin, Camera, AlertTriangle, FileText, User, Clock, Info
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
        
        // 2. Fetch waypoints (Prefer trip-specific file, fallback to date file)
        if (data && data.waypoints && data.waypoints.length > 0) {
          setWaypoints(data.waypoints);
        } else if (data && data.id) {
          const tripMapUrl = `https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/map_history/${data.id}.json`;
          const mapRes = await fetch(tripMapUrl);
          if (mapRes.ok) {
            const mapData = await mapRes.json();
            if (mapData && mapData.waypoints) {
              setWaypoints(mapData.waypoints);
              return;
            }
          }
          
          // Fallback to user_date map
          if (data.user_id && data.log_date) {
            const fallbackUrl = `https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/map_history/${data.user_id}_${data.log_date}.json`;
            const fbRes = await fetch(fallbackUrl);
            if (fbRes.ok) {
              const fbData = await fbRes.json();
              if (fbData && fbData.waypoints) {
                setWaypoints(fbData.waypoints);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load claim data");
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
        body: JSON.stringify({ trip_ids: [trip.id], action, comment })
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
    return (
      <div className="p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading claim details...</p>
      </div>
    );
  }
  
  if (!trip) {
    return (
      <div className="p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="mt-4 text-xl font-bold">Claim Not Found</h2>
        <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const isTripActive = trip.approval_status === 'active';
  const startReading = Number(trip.start_reading || 0);
  const endReading = Number(trip.end_reading || startReading);
  const claimedKm = trip.distance_km !== null && trip.distance_km !== undefined 
    ? Number(trip.distance_km) 
    : (endReading >= startReading ? (endReading - startReading) : 0);
  const totalAmountClaimed = (Number(trip.fuel_amount) || 0) + (Number(trip.misc_amount) || 0);
  const variance = trip.variance_percent || 0;
  const flags = trip.fraud_flags || [];

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            Claim {trip.id.substring(0, 8).toUpperCase()}
            <Badge variant={isTripActive ? 'warning' : trip.approval_status === 'approved' ? 'approved' : trip.approval_status === 'rejected' ? 'rejected' : 'pending'}>
              {isTripActive ? 'Active Shift' : (trip.approval_status || 'Pending')}
            </Badge>
          </h2>
          <p className="text-gray-500 text-sm">
            Started on {formatDate(trip.created_at || trip.log_date)}
            {trip.submitted_at && ` • Submitted on ${formatDate(trip.submitted_at)}`}
          </p>
        </div>
      </div>

      {/* Active Shift Notice */}
      {isTripActive && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 font-bold">Shift In Progress</h4>
              <p className="text-sm text-blue-700 mt-1">
                Executive {trip.users?.full_name || 'Agent'} started this shift with reading <strong>{startReading} KM</strong>. 
                Final distance, end odometer photo, and route validation will be finalized once the executive ends their shift via the mobile app.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card>
            <CardBody className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1.5"><User className="h-4 w-4" /> Employee</p>
                  <p className="font-bold text-gray-900">{trip.users?.full_name || 'ISLLP Executive'}</p>
                  <p className="text-xs text-gray-500">{trip.users?.employee_code || trip.user_id.substring(0, 6)} • {trip.users?.department || 'Operations'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Distance</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {isTripActive ? 'Tracking Live...' : `${claimedKm.toFixed(1)} KM`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isTripActive ? `Start: ${startReading} KM` : `OSRM: ${(trip.osrm_calculated_km || trip.osrm_distance_km || 0).toFixed(1)} KM`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Route Variance</p>
                  <p className={cn("font-bold text-lg", variance > 15 ? "text-red-600" : "text-green-600")}>
                    {isTripActive ? 'Calculating...' : `${variance.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isTripActive ? 'Pending End Leg' : (variance <= 15 ? 'Within limits' : 'Needs review')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Amount Claimed</p>
                  <p className="font-bold text-gray-900 text-xl text-green-700">
                    {formatCurrency(totalAmountClaimed)}
                  </p>
                  {trip.misc_amount > 0 && (
                    <p className="text-xs text-gray-500">
                      Fuel: ₹{trip.fuel_amount || 0} + Misc: ₹{trip.misc_amount}
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Flags Section */}
          {flags.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-red-800 font-bold mb-1">Audit Flags Detected</h4>
                  <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
                    {flags.map((flag: any, i: number) => (
                      <li key={i}>
                        <span className="font-bold uppercase">{flag.type || 'FLAG'}:</span> {flag.description || JSON.stringify(flag)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Photos */}
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
                      <p className="text-xs text-gray-500 mb-1">Start ({startReading} KM)</p>
                      <ImageViewer src={trip.start_odometer_image_url} alt="Start Odometer" className="h-32 object-cover rounded-lg border border-gray-200" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">End ({endReading} KM)</p>
                      {isTripActive ? (
                        <div className="h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center p-3 text-center">
                          <Clock className="h-6 w-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">Awaiting End Shift Photo</span>
                        </div>
                      ) : (
                        <ImageViewer src={trip.end_odometer_image_url} alt="End Odometer" className="h-32 object-cover rounded-lg border border-gray-200" />
                      )}
                    </div>
                  </div>
                </div>

                {trip.fuel_bill_url ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Fuel Bill (₹{trip.fuel_amount || 0})</p>
                    <ImageViewer src={trip.fuel_bill_url} alt="Fuel Bill" className="h-32 w-full object-cover rounded-lg border border-gray-200" />
                    {trip.ocr_data?.detected_amount && (
                      <p className="text-xs text-green-700 mt-1">OCR Scanned: ₹{trip.ocr_data.detected_amount}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-400 mb-2">Fuel Bill</p>
                    <div className="h-32 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                      No fuel bill attached
                    </div>
                  </div>
                )}

                {trip.misc_bill_url ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Misc Bill (₹{trip.misc_amount || 0})</p>
                    <ImageViewer src={trip.misc_bill_url} alt="Misc Bill" className="h-32 w-full object-cover rounded-lg border border-gray-200" />
                    <p className="text-xs text-gray-500 mt-1">Remarks: {trip.misc_particulars || 'N/A'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-400 mb-2">Misc Expense</p>
                    <div className="h-32 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                      No misc bill attached
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: GPS Map & Status */}
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
                  <RouteMap waypoints={waypoints} distanceKm={claimedKm > 0 ? claimedKm : (trip?.osrm_calculated_km ?? undefined)} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                    <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                    {isTripActive ? 'Recording GPS pings in background...' : 'No GPS coordinates saved for this trip.'}
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
              placeholder="Add audit comments before decision..." 
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="danger" className="flex-1 sm:flex-none" onClick={() => handleAction('Reject')}>
                <XCircle className="h-4 w-4 mr-2" /> Reject Claim
              </Button>
              <Button className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" onClick={() => handleAction('Approve')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve Claim
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
