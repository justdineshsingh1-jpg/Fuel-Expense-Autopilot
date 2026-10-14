'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { STATUS_LABELS, DELEGATION_LIMITS, VALIDATION_RULES, FLAG_TYPE_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';
import { 
  ChevronDown, ChevronUp, Search, CheckCircle, XCircle, 
  CornerUpLeft, Flag, Camera, Download, AlertTriangle, FileText,
  Zap, ShieldCheck, ArrowUpRight, Sparkles, RefreshCw, Filter, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const currentRole = user?.role || 'team_leader';

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter Tabs
  const [statusFilter, setStatusFilter] = useState<'pending' | 'clean' | 'exceptions' | 'active' | 'manager_queue' | 'md_queue' | 'approved' | 'rejected' | 'all'>('pending');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

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
          const variance = Math.abs(Number(d.variance_percent || 0));
          const flags = d.fraud_flags || [];

          // Automated Clean Trip Evaluation
          const isNegativeOdo = endR < startR;
          const isExcessiveKm = claimedKm > VALIDATION_RULES.MAX_DAILY_KM;
          const isHighVariance = variance > VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT;
          const hasFlags = Array.isArray(flags) && flags.length > 0;
          const isMissingOdoPhoto = !d.start_odometer_image_url || (!d.end_odometer_image_url && d.approval_status !== 'active');
          const isMissingFuelBill = (Number(d.fuel_amount) > 0 && !d.fuel_bill_url);

          const isClean = !isNegativeOdo && !isExcessiveKm && !isHighVariance && !hasFlags && !isMissingOdoPhoto && !isMissingFuelBill && claimedKm > 0;

          // Determine validation status category
          let validationStatus: 'clean' | 'exception' | 'incomplete' = 'clean';
          const detectedExceptions: string[] = [];

          if (isNegativeOdo) {
            validationStatus = 'exception';
            detectedExceptions.push('Negative Odometer (End < Start)');
          }
          if (isExcessiveKm) {
            validationStatus = 'exception';
            detectedExceptions.push(`Excessive Distance (> ${VALIDATION_RULES.MAX_DAILY_KM} KM)`);
          }
          if (isHighVariance) {
            validationStatus = 'exception';
            detectedExceptions.push(`Route Variance Discrepancy (${variance.toFixed(1)}%)`);
          }
          if (isMissingOdoPhoto) {
            validationStatus = 'incomplete';
            detectedExceptions.push('Missing Odometer Photo Evidence');
          }
          if (isMissingFuelBill) {
            validationStatus = 'incomplete';
            detectedExceptions.push('Fuel Claimed without Bill Receipt');
          }
          if (hasFlags) {
            validationStatus = 'exception';
            flags.forEach((f: any) => {
              detectedExceptions.push(f.description || f.type || 'Audit Flag');
            });
          }

          // Authority delegation tier required
          let requiredTier: 'supervisor' | 'manager' | 'md' = 'supervisor';
          if (totalAmount > DELEGATION_LIMITS.manager || variance > VALIDATION_RULES.CRITICAL_ROUTE_VARIANCE_PERCENT) {
            requiredTier = 'md';
          } else if (totalAmount > DELEGATION_LIMITS.supervisor || isHighVariance) {
            requiredTier = 'manager';
          }

          return {
            id: d.id,
            date: d.created_at || d.log_date,
            employeeName: d.users?.full_name || ('Executive ' + d.user_id.substring(0, 4)),
            employeeCode: d.users?.employee_code || d.user_id.substring(0, 6).toUpperCase(),
            department: d.users?.department || 'Field Operations',
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
            fraudFlags: flags,
            isClean,
            validationStatus,
            detectedExceptions,
            requiredTier,
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

  // Single Action with prompt for reason if rejecting/returning
  const handleAction = async (id: string, action: 'Approve' | 'Reject' | 'Return' | 'Escalate') => {
    let comment = '';
    if (action === 'Reject' || action === 'Return') {
      const reason = window.prompt(`Please provide a reason for ${action.toLowerCase()}ing this claim:`);
      if (reason === null) return; // User cancelled
      if (!reason.trim()) {
        toast.error('Reason is required.');
        return;
      }
      comment = reason.trim();
    }

    toast.loading(`Applying ${action}...`);
    try {
      const res = await fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_ids: [id],
          action,
          comment,
          actor_role: currentRole,
          actor_name: user?.name || 'Approver'
        })
      });
      toast.dismiss();
      const resData = await res.json();
      if (res.ok) {
        toast.success(resData.message || `Claim ${action}d successfully`);
        fetchTrips();
      } else {
        toast.error(resData.error || `Failed to ${action} claim`);
      }
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || 'Action failed');
    }
  };

  // ⚡ 1-Click Approve All Clean Claims
  const handle1ClickApproveClean = async () => {
    const cleanPendingCount = trips.filter(t => 
      t.status === 'pending' && t.isClean && (
        currentRole === 'team_leader' ? t.requiredTier === 'supervisor' :
        currentRole === 'manager' ? t.requiredTier !== 'md' : true
      )
    ).length;

    if (cleanPendingCount === 0) {
      toast('No clean unflagged claims found in your pending queue.', { icon: 'ℹ️' });
      return;
    }

    const confirmMsg = `⚡ 1-Click Bulk Approval:\n\nApprove all ${cleanPendingCount} clean, automated-verified claims without manual clicks?\n\n(All flagged exceptions and high-value claims will be safely preserved for individual inspection)`;
    if (!window.confirm(confirmMsg)) return;

    setBatchProcessing(true);
    toast.loading(`⚡ Auto-approving ${cleanPendingCount} clean claims...`);

    try {
      const res = await fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approve_all_clean: true,
          action: 'Approve',
          actor_role: currentRole,
          actor_name: user?.name || 'Approver',
          comment: 'Bulk clean pass approval'
        })
      });
      toast.dismiss();
      const resData = await res.json();
      if (res.ok) {
        toast.success(`🎉 ${resData.message}`);
        fetchTrips();
      } else {
        toast.error(resData.error || 'Failed to bulk approve clean claims');
      }
    } catch (e: any) {
      toast.dismiss();
      toast.error('Bulk approval failed');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchSelectedAction = async (action: 'Approve' | 'Reject') => {
    if (selectedRows.size === 0) return;
    setBatchProcessing(true);
    toast.loading(`Processing ${selectedRows.size} selected claims...`);
    try {
      const res = await fetch('/api/trips/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_ids: Array.from(selectedRows),
          action,
          actor_role: currentRole,
          actor_name: user?.name || 'Approver'
        })
      });
      toast.dismiss();
      const resData = await res.json();
      if (res.ok) {
        toast.success(resData.message || `Successfully processed ${selectedRows.size} claims`);
        setSelectedRows(new Set());
        fetchTrips();
      } else {
        toast.error(resData.error || 'Batch update failed');
      }
    } catch (e) {
      toast.dismiss();
      toast.error('Batch update failed');
    } finally {
      setBatchProcessing(false);
    }
  };

  const downloadMonthlyReport = () => {
    const userId = trips.length > 0 ? trips[0].userId : 'ALL';
    const month = new Date().toISOString().substring(0, 7);
    window.open(`/api/reports/monthly-conveyance?userId=${userId}&month=${month}`, '_blank');
  };

  // Filter trips based on active tab and search query
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Status & Tab Filtering
      if (statusFilter === 'pending') {
        if (t.status !== 'pending' && t.status !== 'submitted' && t.status !== 'auto_validated') return false;
      } else if (statusFilter === 'clean') {
        if ((t.status !== 'pending' && t.status !== 'submitted') || !t.isClean) return false;
      } else if (statusFilter === 'exceptions') {
        if ((t.status !== 'pending' && t.status !== 'submitted') || t.isClean) return false;
      } else if (statusFilter === 'active') {
        if (t.status !== 'active') return false;
      } else if (statusFilter === 'manager_queue') {
        if (t.status !== 'supervisor_approved' && !(t.status === 'pending' && t.requiredTier === 'manager')) return false;
      } else if (statusFilter === 'md_queue') {
        if (t.status !== 'manager_approved' && !(t.status === 'pending' && t.requiredTier === 'md')) return false;
      } else if (statusFilter === 'approved') {
        if (t.status !== 'approved' && t.status !== 'finance_settled' && t.status !== 'md_approved') return false;
      } else if (statusFilter === 'rejected') {
        if (t.status !== 'rejected' && t.status !== 'returned') return false;
      }

      // Search Query Filtering
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchName = t.employeeName.toLowerCase().includes(q);
        const matchCode = t.employeeCode.toLowerCase().includes(q);
        const matchDept = t.department.toLowerCase().includes(q);
        const matchId = t.id.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept && !matchId) return false;
      }

      return true;
    });
  }, [trips, statusFilter, searchQuery]);

  // Counts for Badges & Summary Cards
  const pendingTrips = trips.filter(t => t.status === 'pending' || t.status === 'submitted' || t.status === 'auto_validated');
  const pendingCount = pendingTrips.length;
  const cleanPendingCount = pendingTrips.filter(t => t.isClean).length;
  const exceptionPendingCount = pendingTrips.filter(t => !t.isClean).length;
  const activeCount = trips.filter(t => t.status === 'active').length;
  const managerQueueCount = trips.filter(t => t.status === 'supervisor_approved' || (t.status === 'pending' && t.requiredTier === 'manager')).length;
  const mdQueueCount = trips.filter(t => t.status === 'manager_approved' || (t.status === 'pending' && t.requiredTier === 'md')).length;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Approvals & Claim Management</h2>
            <Badge variant="default" className="text-xs bg-slate-100 text-slate-700 uppercase font-semibold">
              {currentRole.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Exception-driven approval workflow for 100+ Field Executives. Routine clean claims are separated from flagged exceptions.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ⚡ 1-Click Approve All Clean Claims Button */}
          {cleanPendingCount > 0 && (
            <Button 
              onClick={handle1ClickApproveClean} 
              disabled={batchProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              <Zap className="h-4 w-4 fill-amber-300 text-amber-300 animate-pulse" />
              <span>⚡ 1-Click Approve All Clean ({cleanPendingCount})</span>
            </Button>
          )}

          {selectedRows.size > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleBatchSelectedAction('Approve')} 
                disabled={batchProcessing}
                className="bg-green-600 hover:bg-green-700 whitespace-nowrap text-xs"
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve Selected ({selectedRows.size})
              </Button>
              <Button 
                onClick={() => handleBatchSelectedAction('Reject')} 
                disabled={batchProcessing}
                variant="danger" 
                className="whitespace-nowrap text-xs"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject Selected
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={downloadMonthlyReport} className="whitespace-nowrap">
            <Download className="h-4 w-4 mr-1.5" /> Export Conveyance
          </Button>

          <Button variant="ghost" size="sm" onClick={fetchTrips} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Ticker / Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Clean Ready for 1-Click */}
        <div 
          onClick={() => setStatusFilter('clean')}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer",
            statusFilter === 'clean' ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20" : "bg-white border-gray-200 hover:border-emerald-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Clean Claims (1-Click)
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Ready
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{cleanPendingCount}</span>
            <span className="text-xs text-gray-500">Route & OCR verified</span>
          </div>
        </div>

        {/* Flagged Exceptions */}
        <div 
          onClick={() => setStatusFilter('exceptions')}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer",
            statusFilter === 'exceptions' ? "bg-rose-50 border-rose-400 ring-2 ring-rose-500/20" : "bg-white border-gray-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Flagged Exceptions
            </span>
            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
              Manual Check
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">{exceptionPendingCount}</span>
            <span className="text-xs text-gray-500">Discrepancy / Over limit</span>
          </div>
        </div>

        {/* Manager & MD Escalation Queues */}
        <div 
          onClick={() => setStatusFilter('manager_queue')}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer",
            statusFilter === 'manager_queue' ? "bg-purple-50 border-purple-400 ring-2 ring-purple-500/20" : "bg-white border-gray-200 hover:border-purple-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-purple-800 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-purple-600" /> Manager Queue
            </span>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              &gt; ₹1,000
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-700">{managerQueueCount}</span>
            <span className="text-xs text-gray-500">Awaiting Mgr sign-off</span>
          </div>
        </div>

        {/* Active Shifts */}
        <div 
          onClick={() => setStatusFilter('active')}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer",
            statusFilter === 'active' ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20" : "bg-white border-gray-200 hover:border-blue-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-blue-800 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" /> Live Shifts Today
            </span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
              Live
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-700">{activeCount}</span>
            <span className="text-xs text-gray-500">Executives in field</span>
          </div>
        </div>

      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setStatusFilter('pending')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            statusFilter === 'pending'
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          All Pending
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('clean')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            statusFilter === 'clean'
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          ⚡ Clean Pass (Ready to Bulk Approve)
          {cleanPendingCount > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {cleanPendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('exceptions')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            statusFilter === 'exceptions'
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          ⚠️ Flagged Exceptions
          {exceptionPendingCount > 0 && (
            <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {exceptionPendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('active')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            statusFilter === 'active'
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Active Shifts
          {activeCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('manager_queue')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            statusFilter === 'manager_queue'
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Manager Queue
          {managerQueueCount > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {managerQueueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('md_queue')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            statusFilter === 'md_queue'
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          MD Escalations
          {mdQueueCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {mdQueueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap",
            statusFilter === 'approved' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Approved / Settled
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap",
            statusFilter === 'rejected' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Rejected / Returned
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap",
            statusFilter === 'all' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          All Records
        </button>
      </div>

      {/* Main Table Card */}
      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center bg-gray-50/50 justify-between">
          <div className="flex-1 min-w-[280px] max-w-md">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <Input 
                placeholder="Search by Employee, Code, Dept, or Claim ID..." 
                className="pl-10 bg-white" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Showing <strong>{filteredTrips.length}</strong> records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedRows.size === filteredTrips.length && filteredTrips.length > 0}
                    onChange={() => toggleSelectAll(filteredTrips)}
                  />
                </th>
                <th className="px-3 py-3 font-medium">Date & Time</th>
                <th className="px-3 py-3 font-medium">Employee / Team</th>
                <th className="px-3 py-3 font-medium">Odometer (KM)</th>
                <th className="px-3 py-3 font-medium">GPS Map & Variance</th>
                <th className="px-3 py-3 font-medium">Expense & Limit</th>
                <th className="px-3 py-3 font-medium">Validation Engine</th>
                <th className="px-3 py-3 font-medium">Status / Tier</th>
                <th className="px-3 py-3 font-medium text-center">Actions</th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading claim records...
                  </td>
                </tr>
              ) : filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ShieldCheck className="h-10 w-10 text-gray-300 mx-auto" />
                      <p className="font-medium text-gray-700">No claims match this filter</p>
                      <p className="text-xs text-gray-400">All claims in this category are either processed or pending executive activity.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((row) => {
                  const isRowActive = row.status.toLowerCase() === 'active';

                  return (
                    <React.Fragment key={row.id}>
                      <tr className={cn(
                        "hover:bg-gray-50 transition-colors", 
                        expandedRows.has(row.id) && "bg-gray-50/80",
                        row.validationStatus === 'exception' && "bg-rose-50/30"
                      )}>
                        {/* Checkbox */}
                        <td className="px-3 py-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRows.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            disabled={isRowActive}
                          />
                        </td>

                        {/* Date */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{formatDate(row.date)}</div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            {row.id.substring(0, 8).toUpperCase()}
                          </div>
                        </td>

                        {/* Employee */}
                        <td className="px-3 py-3">
                          <Link href={`/approvals/${row.id}`} className="hover:text-primary hover:underline font-bold text-gray-900 block">
                            {row.employeeName}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {row.employeeCode} • {row.department}
                          </div>
                        </td>

                        {/* Odometer */}
                        <td className="px-3 py-3">
                          {isRowActive ? (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              Start: {row.startReading} KM
                            </span>
                          ) : (
                            <div>
                              <div className="font-bold text-gray-900">{row.claimedKm} KM</div>
                              <div className="text-[11px] text-gray-400">
                                {row.startReading} → {row.endReading}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* GPS Map & Variance */}
                        <td className="px-3 py-3">
                          {isRowActive ? (
                            <span className="text-xs text-gray-400">Pings active...</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "font-bold text-xs px-1.5 py-0.5 rounded",
                                  Math.abs(row.variancePercentage) > VALIDATION_RULES.CRITICAL_ROUTE_VARIANCE_PERCENT ? "bg-red-100 text-red-800" :
                                  Math.abs(row.variancePercentage) > VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT ? "bg-amber-100 text-amber-800" :
                                  "bg-green-100 text-green-800"
                                )}>
                                  {row.variancePercentage > 0 ? '+' : ''}{row.variancePercentage}%
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                Map: {row.osrmKm} KM
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Expense & Limit */}
                        <td className="px-3 py-3">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(row.totalAmount)}
                          </div>
                          {row.totalAmount > 0 && (
                            <div className="text-[11px] text-gray-500">
                              {row.fuelAmount > 0 && `Fuel: ₹${row.fuelAmount}`}
                              {row.miscAmount > 0 && ` + Misc: ₹${row.miscAmount}`}
                            </div>
                          )}
                        </td>

                        {/* Validation Engine Status */}
                        <td className="px-3 py-3">
                          {isRowActive ? (
                            <Badge variant="active">Active Shift</Badge>
                          ) : row.isClean ? (
                            <Badge variant="clean" className="gap-1">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Clean Pass
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="exception" className="gap-1">
                                <AlertTriangle className="h-3 w-3 text-rose-600" /> Exception ({row.detectedExceptions.length})
                              </Badge>
                              <div className="text-[10px] text-rose-700 max-w-[140px] truncate" title={row.detectedExceptions.join(', ')}>
                                {row.detectedExceptions[0]}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status / Tier */}
                        <td className="px-3 py-3">
                          <Badge variant={row.status as any}>
                            {STATUS_LABELS[row.status] || row.status}
                          </Badge>
                          <div className="text-[10px] text-gray-400 mt-0.5 uppercase">
                            Tier: {row.requiredTier}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-center">
                          {isRowActive ? (
                            <span className="text-xs italic text-gray-400">Shift In Progress</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {/* Approve */}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                                onClick={() => handleAction(row.id, 'Approve')} 
                                title="Approve Claim"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>

                              {/* Reject */}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" 
                                onClick={() => handleAction(row.id, 'Reject')} 
                                title="Reject Claim (with reason)"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>

                              {/* Return for Correction */}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50" 
                                onClick={() => handleAction(row.id, 'Return')} 
                                title="Return for Employee Correction"
                              >
                                <CornerUpLeft className="h-4 w-4" />
                              </Button>

                              {/* Escalate to Higher Authority */}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50" 
                                onClick={() => handleAction(row.id, 'Escalate')} 
                                title="Escalate to Higher Authority"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Expand Button */}
                        <td className="px-2 py-3 text-right">
                          <button onClick={() => toggleRow(row.id)} className="text-gray-400 hover:text-gray-600 p-1">
                            {expandedRows.has(row.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Content Drawer */}
                      {expandedRows.has(row.id) && (
                        <tr className="bg-slate-50 border-b border-gray-200">
                          <td colSpan={10} className="px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              
                              {/* Evidence Photos */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                  <Camera className="h-4 w-4 text-gray-500" /> Evidence Audit Photos
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-xs text-gray-500 mb-1 block">Start Odometer ({row.startReading} KM)</span>
                                    {row.startOdometerPhotoUrl ? (
                                      <ImageViewer src={row.startOdometerPhotoUrl} alt="Start Odo" className="h-28 w-full object-cover rounded border" />
                                    ) : (
                                      <div className="h-28 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No start photo</div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 mb-1 block">End Odometer ({row.endReading} KM)</span>
                                    {isRowActive ? (
                                      <div className="h-28 w-full bg-blue-50/50 rounded border border-dashed border-blue-200 flex items-center justify-center text-xs text-blue-500 text-center p-2">
                                        Shift Active (Pending End Check-in)
                                      </div>
                                    ) : row.endOdometerPhotoUrl ? (
                                      <ImageViewer src={row.endOdometerPhotoUrl} alt="End Odo" className="h-28 w-full object-cover rounded border" />
                                    ) : (
                                      <div className="h-28 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No end photo</div>
                                    )}
                                  </div>
                                  {row.fuelBillPhotoUrl && (
                                    <div className="col-span-2">
                                      <span className="text-xs text-gray-500 mb-1 block">Fuel Receipt (₹{row.fuelAmount})</span>
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

                              {/* Claim Breakdown & Delegation Limits */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-500" /> Claim Breakdown & Limits
                                </h4>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2 text-sm shadow-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Employee:</span>
                                    <span className="font-bold text-gray-900">{row.employeeName}</span>
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
                                    <span className="text-gray-500">GPS Route Distance:</span>
                                    <span>{row.osrmKm} KM</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Route Variance:</span>
                                    <span className={Math.abs(row.variancePercentage) > 18 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                                      {row.variancePercentage}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Fuel Amount:</span>
                                    <span>{formatCurrency(row.fuelAmount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Misc Field Expense:</span>
                                    <span>{formatCurrency(row.miscAmount)}</span>
                                  </div>
                                  <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                                    <span>Total Claim:</span>
                                    <span className="text-emerald-700">{formatCurrency(row.totalAmount)}</span>
                                  </div>
                                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-600 mt-2 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Supervisor Limit:</span>
                                      <span>₹{DELEGATION_LIMITS.supervisor}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Manager Limit:</span>
                                      <span>₹{DELEGATION_LIMITS.manager}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-slate-800">
                                      <span>Required Sign-off:</span>
                                      <span className="uppercase text-primary">{row.requiredTier}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Validation Engine & Exceptions */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-gray-500" /> Automated Audit Checks
                                </h4>
                                {row.isClean ? (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                                    <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-sm text-emerald-900 font-bold">100% Automated Clean Pass</p>
                                    <p className="text-xs text-emerald-700 mt-1">
                                      Route distance matches within {VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT}%, odometer photos verified, no fraud flags detected.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {row.detectedExceptions.map((ex: string, idx: number) => (
                                      <div key={idx} className="bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-800 flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                                        <span>{ex}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                  <Link href={`/approvals/${row.id}`}>
                                    <Button variant="outline" size="sm" className="text-xs">
                                      View Map & Full Timeline →
                                    </Button>
                                  </Link>

                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      className="bg-emerald-600 hover:bg-emerald-700 text-xs" 
                                      onClick={() => handleAction(row.id, 'Approve')}
                                    >
                                      Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="danger" 
                                      className="text-xs" 
                                      onClick={() => handleAction(row.id, 'Reject')}
                                    >
                                      Reject
                                    </Button>
                                  </div>
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
