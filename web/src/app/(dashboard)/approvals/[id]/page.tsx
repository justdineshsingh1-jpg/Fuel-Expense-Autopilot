'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { STATUS_LABELS, DELEGATION_LIMITS, VALIDATION_RULES } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';
import { 
  ArrowLeft, CheckCircle, XCircle, CornerUpLeft, Flag, 
  MapPin, Camera, AlertTriangle, FileText, User, Clock, Info,
  ShieldCheck, ArrowUpRight, Check, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { calculateHaversineDistance } from '@/components/ui/RouteMap';

const RouteMap = dynamic(() => import('@/components/ui/RouteMap'), { ssr: false });

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const currentRole = user?.role || 'team_leader';

  const [comment, setComment] = useState('');
  const [trip, setTrip] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await fetch(`/api/trips?id=${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch trip');
        const data = await res.json();
        setTrip(data);
        
        // Fetch waypoints (Prefer trip-specific file, fallback to date file)
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

  const handleAction = async (action: 'Approve' | 'Reject' | 'Return' | 'Escalate') => {
    if (!trip) return;

    let finalComment = comment.trim();
    if (action === 'Reject' || action === 'Return') {
      if (!finalComment) {
        const promptComment = window.prompt(`Please provide a mandatory reason for ${action.toLowerCase()}ing this claim:`);
        if (promptComment === null) return;
        if (!promptComment.trim()) {
          toast.error("Reason is required.");
          return;
        }
        finalComment = promptComment.trim();
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trip_ids: [trip.id], 
          action, 
          comment: finalComment,
          actor_role: currentRole,
          actor_name: user?.name || 'Approver'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update claim');

      toast.success(data.message || `Claim ${action}d successfully`);
      router.push('/approvals');
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
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

  // Ground truth GPS polyline
  const mapPolylineKm = waypoints && waypoints.length >= 2 ? calculateHaversineDistance(waypoints) : 0;
  
  const mapTruthKm = (trip.osrm_calculated_km && Number(trip.osrm_calculated_km) > 0)
    ? Number(trip.osrm_calculated_km)
    : (trip.osrm_distance_km && Number(trip.osrm_distance_km) > 0)
      ? Number(trip.osrm_distance_km)
      : mapPolylineKm;

  const variance = mapTruthKm > 0
    ? Number((((claimedKm - mapTruthKm) / mapTruthKm) * 100).toFixed(1))
    : Number((trip.variance_percent || 0).toFixed(1));

  const flags = trip.fraud_flags || [];

  // Determine delegation level required
  let requiredTier: 'supervisor' | 'manager' | 'md' = 'supervisor';
  if (totalAmountClaimed > DELEGATION_LIMITS.manager || Math.abs(variance) > VALIDATION_RULES.CRITICAL_ROUTE_VARIANCE_PERCENT) {
    requiredTier = 'md';
  } else if (totalAmountClaimed > DELEGATION_LIMITS.supervisor || Math.abs(variance) > VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT) {
    requiredTier = 'manager';
  }

  // Approval Lifecycle Stepper status index
  const stages = [
    { key: 'submitted', label: '1. Submitted' },
    { key: 'supervisor', label: '2. Supervisor' },
    { key: 'manager', label: '3. Manager' },
    { key: 'md', label: '4. MD Review' },
    { key: 'settled', label: '5. Finance Settled' },
  ];

  let currentStageIndex = 0;
  const currentStatus = trip.approval_status;
  if (currentStatus === 'supervisor_approved') currentStageIndex = 2;
  else if (currentStatus === 'manager_approved') currentStageIndex = 3;
  else if (currentStatus === 'md_approved' || currentStatus === 'approved') currentStageIndex = 4;
  else if (currentStatus === 'finance_settled') currentStageIndex = 5;
  else if (currentStatus === 'pending' || currentStatus === 'submitted') currentStageIndex = 1;

  const isActionable = ['pending', 'submitted', 'supervisor_approved', 'manager_approved', 'auto_validated', 'flagged'].includes(currentStatus);

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Claim {trip.id.substring(0, 8).toUpperCase()}
              </h2>
              <Badge variant={isTripActive ? 'active' : currentStatus as any}>
                {isTripActive ? 'Active Shift' : (STATUS_LABELS[currentStatus] || currentStatus)}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Shift Date: {formatDate(trip.created_at || trip.log_date)}
              {trip.submitted_at && ` • Submitted: ${formatDate(trip.submitted_at)}`}
            </p>
          </div>
        </div>

        {/* Delegation Badge */}
        <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs">
          <span className="text-gray-500">Authority Required:</span>
          <span className="font-bold text-gray-900 uppercase">{requiredTier}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">Your Role:</span>
          <span className="font-bold text-primary uppercase">{currentRole.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Multi-Tier Approval Stepper */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto scrollbar-none py-1">
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <React.Fragment key={stage.key}>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    isCompleted ? "bg-emerald-600 text-white" :
                    isCurrent ? "bg-primary text-white ring-4 ring-primary/20" :
                    "bg-gray-100 text-gray-400"
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-semibold",
                    isCompleted ? "text-emerald-700" :
                    isCurrent ? "text-primary font-bold" :
                    "text-gray-400"
                  )}>
                    {stage.label}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mx-2" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Shift Notice */}
      {isTripActive && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 font-bold">Shift Currently In Progress</h4>
              <p className="text-sm text-blue-700 mt-1">
                Executive {trip.users?.full_name || 'Agent'} checked in with starting reading <strong>{startReading} KM</strong>. 
                GPS pings are syncing live. Final distance and end odometer photo will lock when the executive ends shift.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Metrics Strip */}
          <Card>
            <CardBody className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Employee</p>
                  <p className="font-bold text-gray-900">{trip.users?.full_name || 'Field Executive'}</p>
                  <p className="text-xs text-gray-500">{trip.users?.employee_code || trip.user_id.substring(0, 6)} • {trip.users?.department || 'Operations'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Odometer Distance</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {isTripActive ? 'Tracking Live...' : `${claimedKm.toFixed(1)} KM`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Start: {startReading} → End: {endReading}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Route Variance</p>
                  <p className={cn("font-bold text-lg", Math.abs(variance) > 18 ? "text-rose-600" : "text-emerald-600")}>
                    {isTripActive ? 'Calculating...' : `${variance > 0 ? '+' : ''}${variance}%`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {mapTruthKm > 0 ? `Map: ${mapTruthKm.toFixed(1)} KM` : 'Awaiting GPS route'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Expense</p>
                  <p className="font-bold text-gray-900 text-xl text-emerald-700">
                    {formatCurrency(totalAmountClaimed)}
                  </p>
                  {trip.misc_amount > 0 && (
                    <p className="text-[11px] text-gray-500">
                      Fuel: ₹{trip.fuel_amount || 0} + Misc: ₹{trip.misc_amount}
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Audit Flags Section */}
          {flags.length > 0 && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-rose-900 font-bold mb-1">Audit Flags Detected ({flags.length})</h4>
                  <ul className="list-disc ml-5 text-sm text-rose-800 space-y-1">
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
                <Camera className="h-5 w-5 text-gray-500" /> Evidence Photos & Receipts
              </CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Odometer Start & End */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Odometer Comparison</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-[11px] text-gray-500 mb-1">Start ({startReading} KM)</p>
                      {trip.start_odometer_image_url ? (
                        <ImageViewer src={trip.start_odometer_image_url} alt="Start Odometer" className="h-28 object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <div className="h-28 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-gray-400">No photo</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-gray-500 mb-1">End ({endReading} KM)</p>
                      {isTripActive ? (
                        <div className="h-28 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center p-2 text-center">
                          <Clock className="h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-[11px] text-gray-500">Pending End Check-in</span>
                        </div>
                      ) : trip.end_odometer_image_url ? (
                        <ImageViewer src={trip.end_odometer_image_url} alt="End Odometer" className="h-28 object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <div className="h-28 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-gray-400">No photo</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fuel Bill */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Fuel Bill (₹{trip.fuel_amount || 0})</p>
                  {trip.fuel_bill_url ? (
                    <div>
                      <ImageViewer src={trip.fuel_bill_url} alt="Fuel Bill" className="h-28 w-full object-cover rounded-lg border border-gray-200" />
                      {trip.ocr_data?.detected_amount && (
                        <p className="text-xs text-emerald-700 mt-1 font-medium">OCR Scanned: ₹{trip.ocr_data.detected_amount}</p>
                      )}
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                      No fuel bill attached
                    </div>
                  )}
                </div>

                {/* Misc Expense Bill */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Misc Bill (₹{trip.misc_amount || 0})</p>
                  {trip.misc_bill_url ? (
                    <div>
                      <ImageViewer src={trip.misc_bill_url} alt="Misc Bill" className="h-28 w-full object-cover rounded-lg border border-gray-200" />
                      <p className="text-xs text-gray-500 mt-1 truncate">Particulars: {trip.misc_particulars || 'Field Misc'}</p>
                    </div>
                  ) : (
                    <div className="h-28 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                      No misc bill attached
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: GPS Map & Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-500" /> GPS Route Map
                </span>
                {mapPolylineKm > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    {mapPolylineKm.toFixed(1)} KM Track
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4">
              <div className="bg-gray-100 rounded-md h-64 mb-3 border border-gray-200 overflow-hidden relative z-0">
                {waypoints.length > 0 ? (
                  <RouteMap 
                    waypoints={waypoints} 
                    claimedDistanceKm={claimedKm} 
                    osrmDistanceKm={trip?.osrm_calculated_km || trip?.osrm_distance_km} 
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                    <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                    {isTripActive ? 'Recording GPS pings in background...' : 'No GPS coordinates saved for this trip.'}
                  </div>
                )}
              </div>

              {waypoints.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Map Route (Polyline)</span>
                      <strong className="text-sky-600 text-sm">{mapPolylineKm > 0 ? `${mapPolylineKm.toFixed(1)} KM` : 'Calculating...'}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">Odometer Claimed</span>
                      <strong className="text-slate-800 text-sm">{claimedKm.toFixed(1)} KM</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">Discrepancy</span>
                      <strong className={Math.abs(claimedKm - mapPolylineKm) > (mapPolylineKm * 0.18) ? "text-rose-600 text-sm" : "text-emerald-600 text-sm"}>
                        {claimedKm > mapPolylineKm ? '+' : ''}{(claimedKm - mapPolylineKm).toFixed(1)} KM
                      </strong>
                    </div>
                  </div>
                  <div className="border-t border-slate-200/60 pt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{waypoints.length} GPS coordinates verified</span>
                    <span className="text-sky-600 font-medium">Click line on map for popup</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      {isActionable && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.08)] z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between">
            <input 
              type="text" 
              placeholder="Add audit comments / reason before taking decision..." 
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="danger" 
                size="sm"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none whitespace-nowrap" 
                onClick={() => handleAction('Reject')}
              >
                <XCircle className="h-4 w-4 mr-1.5" /> Reject
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none whitespace-nowrap text-amber-700 border-amber-300 hover:bg-amber-50" 
                onClick={() => handleAction('Return')}
              >
                <CornerUpLeft className="h-4 w-4 mr-1.5" /> Return to Agent
              </Button>
              {requiredTier !== 'supervisor' && currentRole === 'team_leader' && (
                <Button 
                  size="sm"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white" 
                  onClick={() => handleAction('Escalate')}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1.5" /> Escalate to Manager
                </Button>
              )}
              <Button 
                size="sm"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" 
                onClick={() => handleAction('Approve')}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" /> Approve Claim
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
