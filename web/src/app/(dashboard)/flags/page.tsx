'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { 
  AlertTriangle, User, Calendar, MapPin, CheckCircle, 
  ArrowRight, ShieldAlert, Sparkles, RefreshCw, FileText, CornerUpLeft, ArrowUpRight
} from 'lucide-react';
import { FLAG_TYPE_LABELS, VALIDATION_RULES } from '@/lib/constants';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export default function FlagsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'route' | 'ocr' | 'distance' | 'missing'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const fetchFlaggedTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trips');
      if (!res.ok) throw new Error('Failed to fetch trips');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrips(data);
      }
    } catch (e: any) {
      toast.error('Failed to load audit flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedTrips();
  }, []);

  // Extract all flagged records
  const flaggedItems = useMemo(() => {
    const list: any[] = [];

    trips.forEach(t => {
      const startR = Number(t.start_reading || 0);
      const endR = Number(t.end_reading || startR);
      const claimedDist = t.distance_km !== null ? Number(t.distance_km) : (endR - startR);
      const variance = Math.abs(Number(t.variance_percent || 0));
      const flags = t.fraud_flags || [];

      // Check for route variance exception
      if (variance > VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT) {
        list.push({
          id: `${t.id}-route`,
          tripId: t.id,
          type: 'HIGH_ROUTE_VARIANCE',
          category: 'route',
          severity: variance > VALIDATION_RULES.CRITICAL_ROUTE_VARIANCE_PERCENT ? 'critical' : 'high',
          description: `Claimed odometer distance (${claimedDist} KM) exceeds GPS map route (${t.osrm_calculated_km || t.osrm_distance_km || 0} KM) by ${variance.toFixed(1)}%.`,
          employeeName: t.users?.full_name || `Agent ${t.user_id.substring(0, 4)}`,
          employeeCode: t.users?.employee_code || t.user_id.substring(0, 6),
          tripDate: t.created_at || t.log_date,
          amount: (Number(t.fuel_amount) || 0) + (Number(t.misc_amount) || 0),
          status: t.approval_status,
          rawTrip: t
        });
      }

      // Check for excessive distance
      if (claimedDist > VALIDATION_RULES.MAX_DAILY_KM) {
        list.push({
          id: `${t.id}-dist`,
          tripId: t.id,
          type: 'EXCESSIVE_DISTANCE',
          category: 'distance',
          severity: 'high',
          description: `Single day travel of ${claimedDist} KM exceeds normal daily threshold limit of ${VALIDATION_RULES.MAX_DAILY_KM} KM.`,
          employeeName: t.users?.full_name || `Agent ${t.user_id.substring(0, 4)}`,
          employeeCode: t.users?.employee_code || t.user_id.substring(0, 6),
          tripDate: t.created_at || t.log_date,
          amount: (Number(t.fuel_amount) || 0) + (Number(t.misc_amount) || 0),
          status: t.approval_status,
          rawTrip: t
        });
      }

      // Check for missing fuel slip
      if (Number(t.fuel_amount) > 0 && !t.fuel_bill_url) {
        list.push({
          id: `${t.id}-fuelbill`,
          tripId: t.id,
          type: 'MISSING_RECEIPT',
          category: 'missing',
          severity: 'medium',
          description: `Fuel expense of ₹${t.fuel_amount} claimed without uploading petrol pump tax invoice / slip receipt.`,
          employeeName: t.users?.full_name || `Agent ${t.user_id.substring(0, 4)}`,
          employeeCode: t.users?.employee_code || t.user_id.substring(0, 6),
          tripDate: t.created_at || t.log_date,
          amount: (Number(t.fuel_amount) || 0) + (Number(t.misc_amount) || 0),
          status: t.approval_status,
          rawTrip: t
        });
      }

      // Existing fraud_flags array in trip_logs
      if (Array.isArray(flags)) {
        flags.forEach((f: any, idx: number) => {
          // Avoid duplicate entry if high route variance already recorded
          if (f.type === 'HIGH_ROUTE_VARIANCE' && variance > VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT) return;

          let cat = 'ocr';
          if (f.type?.includes('ROUTE')) cat = 'route';
          else if (f.type?.includes('BILL') || f.type?.includes('RECEIPT')) cat = 'missing';

          list.push({
            id: `${t.id}-flag-${idx}`,
            tripId: t.id,
            type: f.type || 'AI_FLAG',
            category: cat,
            severity: (f.severity?.toLowerCase() === 'critical' ? 'critical' : f.severity?.toLowerCase() === 'high' ? 'high' : 'medium'),
            description: f.description || 'Discrepancy detected during shift log audit.',
            employeeName: t.users?.full_name || `Agent ${t.user_id.substring(0, 4)}`,
            employeeCode: t.users?.employee_code || t.user_id.substring(0, 6),
            tripDate: t.created_at || t.log_date,
            amount: (Number(t.fuel_amount) || 0) + (Number(t.misc_amount) || 0),
            status: t.approval_status,
            rawTrip: t
          });
        });
      }
    });

    return list;
  }, [trips]);

  // Filter by category & severity
  const filteredFlags = useMemo(() => {
    return flaggedItems.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      return true;
    });
  }, [flaggedItems, categoryFilter, severityFilter]);

  const handleResolve = async (tripId: string) => {
    toast.loading('Resolving exception...');
    try {
      const { error } = await supabase
        .from('trip_logs')
        .update({ 
          fraud_flags: [], 
          has_anomalies: false,
          approval_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      toast.dismiss();
      if (error) throw error;
      toast.success('Exception cleared and reset to clean pending queue');
      fetchFlaggedTrips();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || 'Failed to resolve flag');
    }
  };

  const handleReturnToAgent = async (tripId: string) => {
    const reason = window.prompt('Specify required clarification or missing proof for the executive:');
    if (!reason || !reason.trim()) return;

    toast.loading('Returning claim to executive...');
    try {
      const res = await fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_ids: [tripId],
          action: 'Return',
          comment: reason.trim()
        })
      });
      toast.dismiss();
      if (res.ok) {
        toast.success('Claim returned to executive for correction');
        fetchFlaggedTrips();
      } else {
        toast.error('Failed to return claim');
      }
    } catch (e) {
      toast.dismiss();
      toast.error('Failed to return claim');
    }
  };

  const handleEscalateToMD = async (tripId: string) => {
    toast.loading('Escalating to MD...');
    try {
      const { error } = await supabase
        .from('trip_logs')
        .update({ 
          approval_status: 'manager_approved', // Advances to MD queue
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      toast.dismiss();
      if (error) throw error;
      toast.success('Escalated to Managing Director approval queue');
      fetchFlaggedTrips();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || 'Failed to escalate');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Flagged Exceptions & Fraud Review</h2>
            <Badge variant="exception" className="text-xs">
              {flaggedItems.length} Active Exceptions
            </Badge>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Real-time anomaly detection identifying route discrepancies, slip OCR mismatches, and policy limit breaches.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFlaggedTrips} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Refresh Flags
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Category:</span>
          <div className="flex gap-1">
            {[
              { label: 'All Exceptions', value: 'all' },
              { label: 'Route Variance', value: 'route' },
              { label: 'Fuel & OCR Mismatch', value: 'ocr' },
              { label: 'Distance Spikes', value: 'distance' },
              { label: 'Missing Proof', value: 'missing' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setCategoryFilter(tab.value as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  categoryFilter === tab.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Severity:</span>
          <Select 
            value={severityFilter}
            onChange={(e: any) => setSeverityFilter(e.target.value)}
            options={[
              { label: 'All Severities', value: 'all' },
              { label: 'Critical Only', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
            ]}
            className="w-36 text-xs h-9"
          />
        </div>
      </div>

      {/* Flags List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            Auditing claims and extracting exceptions...
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-gray-900">Zero Active Exceptions</p>
            <p className="text-xs text-gray-400 mt-1">All trip logs currently meet clean validation guidelines.</p>
          </div>
        ) : (
          filteredFlags.map((flag) => (
            <Card key={flag.id} className="border-l-4 border-l-rose-500 shadow-sm hover:shadow transition-shadow">
              <CardBody className="p-5">
                <div className="flex flex-col lg:flex-row gap-6">
                  
                  {/* Status & Severity */}
                  <div className="flex-shrink-0 flex flex-col items-start gap-2 w-full lg:w-48">
                    <span className={cn(
                      "text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider",
                      flag.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                      flag.severity === 'high' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    )}>
                      {flag.severity} SEVERITY
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm">
                      {FLAG_TYPE_LABELS[flag.type] || flag.type}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono">ID: {flag.tripId.substring(0, 8).toUpperCase()}</p>
                  </div>

                  {/* Description & Employee Details */}
                  <div className="flex-grow space-y-3">
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg">
                      <p className="text-xs font-medium text-rose-900 leading-relaxed">{flag.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Employee</span>
                        <p className="font-bold text-gray-900">{flag.employeeName}</p>
                        <p className="text-[11px] text-gray-500">{flag.employeeCode}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Shift Date</span>
                        <p className="font-medium text-gray-900">{formatDate(flag.tripDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Total Claimed</span>
                        <p className="font-bold text-emerald-700">{formatCurrency(flag.amount)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Current Status</span>
                        <Badge variant={flag.status as any} className="text-[11px]">
                          {flag.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-row lg:flex-col justify-end lg:justify-center gap-2 border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4 flex-shrink-0">
                    <Link href={`/approvals/${flag.tripId}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        Inspect Map & Proof <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full text-xs text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleResolve(flag.tripId)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve Exception
                    </Button>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full text-xs text-amber-700 hover:bg-amber-50"
                      onClick={() => handleReturnToAgent(flag.tripId)}
                    >
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1" /> Return for Proof
                    </Button>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full text-xs text-purple-700 hover:bg-purple-50"
                      onClick={() => handleEscalateToMD(flag.tripId)}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Escalate to MD
                    </Button>
                  </div>

                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
