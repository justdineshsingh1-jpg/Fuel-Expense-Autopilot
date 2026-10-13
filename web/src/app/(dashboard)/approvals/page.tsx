'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/constants';
import { 
  ChevronDown, ChevronUp, Search, CheckCircle, XCircle, 
  CornerUpLeft, Flag, MapPin, Camera, Download, AlertTriangle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export default function ApprovalsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'approved' | 'rejected' | 'all'>('pending');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trips');
      if (!res.ok) throw new Error('Failed to load trips');
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(d => {
          const startR = Number(d.start_reading || 0);
          const endR = Number(d.end_reading || startR);
          const computedDist = endR >= startR ? (endR - startR) : 0;
          const claimedKm = (d.distance_km !== null && d.distance_km !== undefined) ? Number(d.distance_km) : computedDist;
          const totalAmount = (Number(d.fuel_amount) || 0) + (Number(d.misc_amount) || 0);

          return {
            id: d.id,
            date: d.created_at || d.log_date,
            employeeName: d.users?.full_name || ('Agent ' + d.user_id.substring(0, 4)),
            employeeCode: d.users?.employee_code || d.user_id.substring(0, 6),
            department: d.users?.department || 'Operations',
            userId: d.user_id,
            logDate: d.log_date,
            startReading: startR,
            endReading: endR,
            claimedKm: Number(claimedKm.toFixed(1)),
            osrmKm: Number((d.osrm_calculated_km || d.osrm_distance_km || 0).toFixed(1)),
            variancePercentage: Number((d.variance_percent || 0).toFixed(1)),
            fuelAmount: Number(d.fuel_amount) || 0,
            miscAmount: Number(d.misc_amount) || 0,
            totalAmount: totalAmount,
            miscRemarks: d.misc_particulars || '',
            status: d.approval_status || 'pending',
            startOdometerPhotoUrl: d.start_odometer_image_url,
            endOdometerPhotoUrl: d.end_odometer_image_url,
            fuelBillPhotoUrl: d.fuel_bill_url || null,
            miscBillPhotoUrl: d.misc_bill_url || null,
            fraudFlags: d.fraud_flags || []
          };
        });
        setTrips(mapped);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

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

  const toggleSelectAll = (filteredList: any[]) => {
    if (selectedRows.size === filteredList.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredList.map(d => d.id)));
    }
  };

  const handleAction = async (id: string, action: string) => {
    toast.loading(`Applying ${action}...`);
    let newStatus = 'pending';
    if (action === 'Approve') newStatus = 'approved';
    if (action === 'Reject') newStatus = 'rejected';
    if (action === 'Return') newStatus = 'returned';
    if (action === 'Flag') newStatus = 'flagged';

    const { error } = await supabase
      .from('trip_logs')
      .update({ approval_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    toast.dismiss();
    
    if (error) {
      toast.error(`Failed to apply action: ${error.message}`);
    } else {
      toast.success(`Trip marked as ${newStatus}`);
      setTrips(trips.map(t => t.id === id ? { ...t, status: newStatus } : t));
    }
  };

  const downloadMonthlyReport = () => {
    const userId = trips.length > 0 ? trips[0].userId : 'AGENT123';
    const month = new Date().toISOString().substring(0, 7);
    window.open(`/api/reports/monthly-conveyance?userId=${userId}&month=${month}`, '_blank');
  };

  const handleBatchAction = async (action: string) => {
    if (selectedRows.size === 0) return;
    toast.loading(`Processing ${selectedRows.size} claims...`);
    try {
      const res = await fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: Array.from(selectedRows), action })
      });
      toast.dismiss();
      if (res.ok) {
        toast.success(`Successfully updated ${selectedRows.size} claims!`);
        setSelectedRows(new Set());
        fetchTrips();
      } else {
        toast.error('Failed to batch update claims');
      }
    } catch (e) {
      toast.dismiss();
      toast.error('Batch update failed');
    }
  };

  // Filter trips based on active tab and search query
  const filteredTrips = trips.filter(t => {
    if (statusFilter !== 'all' && t.status.toLowerCase() !== statusFilter) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = t.employeeName.toLowerCase().includes(q);
      const matchCode = t.employeeCode.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchId) return false;
    }
    return true;
  });

  const pendingCount = trips.filter(t => t.status === 'pending').length;
  const activeCount = trips.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Approvals & Claim Management</h2>
            <Button variant="outline" size="sm" onClick={downloadMonthlyReport} className="ml-4">
              <Download className="h-4 w-4 mr-2" /> Monthly Conveyance Export
            </Button>
          </div>
          <p className="text-gray-500">Review employee trip logs, odometer audits, and fuel receipts.</p>
        </div>
        {selectedRows.size > 0 && (
          <div className="flex gap-2">
            <Button onClick={() => handleBatchAction('Approve')} className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
              <CheckCircle className="mr-2 h-4 w-4" /> Approve Selected ({selectedRows.size})
            </Button>
            <Button onClick={() => handleBatchAction('Reject')} variant="danger" className="whitespace-nowrap">
              <XCircle className="mr-2 h-4 w-4" /> Reject Selected
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 space-x-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2",
            statusFilter === 'pending'
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Pending Approvals
          {pendingCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2",
            statusFilter === 'active'
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Active Shifts (In Progress)
          {activeCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors",
            statusFilter === 'approved' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors",
            statusFilter === 'rejected' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Rejected
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors",
            statusFilter === 'all' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          All Records
        </button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center bg-gray-50/50">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <Input 
                placeholder="Search by Employee, Code, or Claim ID..." 
                className="pl-10 bg-white" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button variant="ghost" onClick={fetchTrips} size="sm">
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedRows.size === filteredTrips.length && filteredTrips.length > 0}
                    onChange={() => toggleSelectAll(filteredTrips)}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Distance (KM)</th>
                <th className="px-4 py-3 font-medium">Route Variance</th>
                <th className="px-4 py-3 font-medium">Amount Claimed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading claim records...
                  </td>
                </tr>
              ) : filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No claims found for this filter.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((row) => {
                  const isRowActive = row.status.toLowerCase() === 'active';

                  return (
                    <React.Fragment key={row.id}>
                      <tr className={cn("hover:bg-gray-50 transition-colors", expandedRows.has(row.id) && "bg-gray-50")}>
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRows.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            disabled={isRowActive}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <Link href={`/approvals/${row.id}`} className="hover:text-primary hover:underline font-bold">
                            {row.employeeName}
                          </Link>
                          <div className="text-xs text-gray-500 font-normal">
                            {row.employeeCode} • {row.id.substring(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isRowActive ? (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                              Live Shift ({row.startReading} KM start)
                            </span>
                          ) : (
                            <>
                              <div>Claimed: <span className="font-bold">{row.claimedKm} KM</span></div>
                              <div className="text-xs text-gray-500">OSRM: {row.osrmKm} KM</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isRowActive ? (
                            <span className="text-xs text-gray-400">Tracking...</span>
                          ) : (
                            <span className={cn(
                              "font-medium",
                              row.variancePercentage > 15 ? "text-red-600" : "text-green-600"
                            )}>
                              {row.variancePercentage}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {formatCurrency(row.totalAmount)}
                          {row.miscAmount > 0 && (
                            <div className="text-xs text-gray-400 font-normal">
                              (Fuel: ₹{row.fuelAmount} + Misc: ₹{row.miscAmount})
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={row.status as any}>
                            {isRowActive ? 'Active Shift' : (STATUS_LABELS[row.status] || row.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isRowActive ? (
                            <span className="text-xs italic text-gray-400">Shift In Progress</span>
                          ) : (
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
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => toggleRow(row.id)} className="text-gray-400 hover:text-gray-600 p-1">
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
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                  <Camera className="h-4 w-4 text-gray-500" /> Evidence Photos
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-xs text-gray-500 mb-1 block">Start ({row.startReading} KM)</span>
                                    <ImageViewer src={row.startOdometerPhotoUrl!} alt="Start Odo" className="h-24 w-full object-cover rounded border" />
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 mb-1 block">End ({row.endReading} KM)</span>
                                    {isRowActive ? (
                                      <div className="h-24 w-full bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400 text-center p-2">
                                        Shift Active (Pending End Photo)
                                      </div>
                                    ) : (
                                      <ImageViewer src={row.endOdometerPhotoUrl!} alt="End Odo" className="h-24 w-full object-cover rounded border" />
                                    )}
                                  </div>
                                  {row.fuelBillPhotoUrl && (
                                    <div className="col-span-2">
                                      <span className="text-xs text-gray-500 mb-1 block">Fuel Bill (₹{row.fuelAmount})</span>
                                      <ImageViewer src={row.fuelBillPhotoUrl} alt="Fuel Bill" className="h-32 w-full object-cover rounded border" />
                                    </div>
                                  )}
                                  {row.miscBillPhotoUrl && (
                                    <div className="col-span-2">
                                      <span className="text-xs text-gray-500 mb-1 block">Misc Bill (₹{row.miscAmount})</span>
                                      <ImageViewer src={row.miscBillPhotoUrl} alt="Misc Bill" className="h-32 w-full object-cover rounded border" />
                                      {row.miscRemarks && (
                                        <p className="text-xs text-gray-500 mt-1">Remarks: {row.miscRemarks}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Shift Status and Summary */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-500" /> Claim Breakdown
                                </h4>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Employee:</span>
                                    <span className="font-bold">{row.employeeName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Employee Code:</span>
                                    <span>{row.employeeCode}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Odometer Distance:</span>
                                    <span className="font-bold">{row.claimedKm} KM</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">OSRM Validated:</span>
                                    <span>{row.osrmKm} KM</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Fuel Amount:</span>
                                    <span>{formatCurrency(row.fuelAmount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Misc Amount:</span>
                                    <span>{formatCurrency(row.miscAmount)}</span>
                                  </div>
                                  <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                                    <span>Total Claim:</span>
                                    <span>{formatCurrency(row.totalAmount)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Flags & Details */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                  <Flag className="h-4 w-4 text-gray-500" /> Audit Checks
                                </h4>
                                {row.fraudFlags && row.fraudFlags.length > 0 ? (
                                  <div className="space-y-2">
                                    {row.fraudFlags.map((f: any, idx: number) => (
                                      <div key={idx} className="bg-red-50 border border-red-200 rounded-md p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant="flagged" className="bg-red-100 text-red-700">{f.severity || 'FLAG'}</Badge>
                                          <span className="text-sm font-semibold text-red-900">{f.type?.replace(/_/g, ' ') || 'Flag'}</span>
                                        </div>
                                        <p className="text-xs text-red-700">{f.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-green-800 font-medium">Clean Claim</p>
                                    <p className="text-xs text-green-600">No route or OCR anomalies detected.</p>
                                  </div>
                                )}
                                
                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                  <Link href={`/approvals/${row.id}`}>
                                    <Button variant="outline" size="sm">View Full Route Map & Claim →</Button>
                                  </Link>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
