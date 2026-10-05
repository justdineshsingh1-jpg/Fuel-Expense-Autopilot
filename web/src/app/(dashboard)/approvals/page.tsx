'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { ImageViewer } from '@/components/ui/ImageViewer';
import dynamic from 'next/dynamic';
const RouteMap = dynamic(() => import('@/components/ui/RouteMap'), { ssr: false });


import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/constants';
import { 
  ChevronDown, ChevronUp, Search, CheckCircle, XCircle, 
  CornerUpLeft, Flag, MapPin, Camera, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock data


const RouteLoader = ({ userId, logDate, status }: { userId: string, logDate: string, status: string }) => {
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'active') {
      setLoading(false);
      return;
    }
    const fetchMap = async () => {
      try {
        const url = `https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/map_history/${userId}_${logDate}.json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.waypoints) {
            setWaypoints(data.waypoints.map((w: any) => `${w.timestamp}: ${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}`));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
  }, [userId, logDate, status]);

  if (status === 'active') {
    return <div className="text-sm text-gray-500 italic p-4 text-center">Shift is currently active. Route will be generated upon check-out.</div>;
  }
  
  if (loading) return <div className="text-sm text-gray-400 p-4">Loading route data...</div>;
  if (waypoints.length === 0) return <div className="text-sm text-gray-400 p-4">No route data saved for this trip.</div>;

  return (
    <div className="relative border-l-2 border-primary ml-3 space-y-4 py-2">
      {waypoints.map((wp: string, idx: number) => (
        <div key={idx} className="relative pl-4">
          <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-white"></span>
          <p className="text-sm font-medium text-gray-800">{wp}</p>
        </div>
      ))}
    </div>
  );
};

export default function ApprovalsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('https://fuel-expense-autopilot.vercel.app/api/trips').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const mapped = data.map(d => ({
          id: d.id,
          date: d.created_at,
          employeeName: 'Agent ' + d.user_id.substring(0,4),
          userId: d.user_id,
          logDate: d.log_date,
          claimedKm: (d.end_reading && d.start_reading) ? (d.end_reading - d.start_reading) : 0,
          osrmKm: d.osrm_calculated_km || 0,
          variancePercentage: d.variance_percent || 0,
          fuelAmount: d.fuel_amount || 0,
          status: d.approval_status || 'pending',
          startOdometerPhotoUrl: d.start_odometer_image_url,
          endOdometerPhotoUrl: d.end_odometer_image_url,
          fuelBillPhotoUrl: d.fuel_bill_url || null,
          waypoints: [],
          fraudFlags: d.fraud_flags || []
        }));
        setTrips(mapped);
      }
    }).catch(e => console.error(e));
  }, []);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === trips.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(trips.map(d => d.id)));
    }
  };

  const handleAction = (id: string, action: string) => {
    toast.success(`Action '${action}' applied to ${id}`);
  };

  
  const downloadMonthlyReport = () => {
    // Pick the first agent as an example or default to current month
    const userId = trips.length > 0 ? trips[0].userId : 'AGENT123';
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    window.open(`/api/reports/monthly-conveyance?userId=${userId}&month=${month}`, '_blank');
  };

  const handleBatchAction = () => {
    toast.success(`Approved ${selectedRows.size} claims`);
    setSelectedRows(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pending Approvals</h2>
            <Button variant="outline" size="sm" onClick={downloadMonthlyReport} className="ml-4">
              <Download className="h-4 w-4 mr-2" /> Monthly Conveyance Export
            </Button>
          </div>
          <p className="text-gray-500">Review and approve employee fuel claims.</p>
        </div>
        {selectedRows.size > 0 && (
          <Button onClick={handleBatchAction} className="whitespace-nowrap">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Selected ({selectedRows.size})
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-end bg-gray-50/50">
          <div className="flex-1 min-w-[200px]">
            <div className="relative"><Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" /><Input placeholder="Search employee or ID..." className="pl-10" /></div>
          </div>
          <DateRangePicker 
            startDate="" 
            endDate="" 
            onChange={() => {}} 
          />
          <Select 
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Flagged', value: 'flagged' }
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedRows.size === trips.length && trips.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Distance (KM)</th>
                <th className="px-4 py-3 font-medium">Variance</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {trips.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className={cn("hover:bg-gray-50 transition-colors", expandedRows.has(row.id) && "bg-gray-50")}>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/approvals/${row.id}`} className="hover:text-primary hover:underline">
                        {row.employeeName}
                      </Link>
                      <div className="text-xs text-gray-500 font-normal">{row.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>Claimed: <span className="font-medium">{row.claimedKm}</span></div>
                      <div className="text-xs text-gray-500">OSRM: {row.osrmKm}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-medium",
                        row.variancePercentage > 10 ? "text-red-600" : "text-green-600"
                      )}>
                        {row.variancePercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(row.fuelAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status as any}>{STATUS_LABELS[row.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleAction(row.id, 'Approve')} title="Approve">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleAction(row.id, 'Reject')} title="Reject">
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => handleAction(row.id, 'Return')} title="Return">
                          <CornerUpLeft className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => handleAction(row.id, 'Flag')} title="Flag">
                          <Flag className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleRow(row.id)} className="text-gray-400 hover:text-gray-600">
                        {expandedRows.has(row.id) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Content */}
                  {expandedRows.has(row.id) && (
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <td colSpan={9} className="px-6 py-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Photos Section */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                              <Camera className="h-4 w-4" /> Evidence Photos
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-gray-500 mb-1 block">Start Odometer</span>
                                <ImageViewer src={row.startOdometerPhotoUrl!} alt="Start Odo" className="h-24" />
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 mb-1 block">End Odometer</span>
                                <ImageViewer src={row.endOdometerPhotoUrl!} alt="End Odo" className="h-24" />
                              </div>
                              <div className="col-span-2">
                                <span className="text-xs text-gray-500 mb-1 block">Fuel Bill</span>
                                <ImageViewer src={row.fuelBillPhotoUrl!} alt="Fuel Bill" className="h-32" />
                              </div>
                            </div>
                          </div>

                          {/* Route & Map Placeholder */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> Route Visualization
                            </h4>
                            <div className="bg-white p-3 rounded-md border border-gray-200 h-full max-h-[220px] overflow-y-auto">
                              <div className="relative border-l-2 border-primary ml-3 space-y-4 py-2">
                                {row.waypoints.map((wp: string, idx: number) => (
                                  <div key={idx} className="relative pl-4">
                                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-white"></span>
                                    <p className="text-sm font-medium text-gray-800">{wp}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Flags & Details */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                              <Flag className="h-4 w-4" /> Review Details
                            </h4>
                            {row.fraudFlags.length > 0 ? (
                              <div className="space-y-2">
                                {row.fraudFlags.map((f: any) => (
                                  <div key={f.id} className="bg-red-50 border border-red-200 rounded-md p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="flagged" className="bg-red-100 text-red-700">{f.severity}</Badge>
                                      <span className="text-sm font-semibold text-red-900">{f.type.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-xs text-red-700">{f.description}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                <p className="text-sm text-green-800 font-medium">Clean Claim</p>
                                <p className="text-xs text-green-600">No anomalies detected.</p>
                              </div>
                            )}
                            
                            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                              <Link href={`/approvals/${row.id}`}>
                                <Button variant="outline" size="sm">View Full Details & History →</Button>
                              </Link>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}




