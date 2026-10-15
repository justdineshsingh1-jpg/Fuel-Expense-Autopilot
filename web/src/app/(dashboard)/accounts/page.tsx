'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { VALIDATION_RULES } from '@/lib/constants';
import { 
  Search, CheckSquare, DownloadCloud, Server, DollarSign, 
  CreditCard, RefreshCw, CheckCircle2, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export default function AccountsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settlementFilter, setSettlementFilter] = useState<'pending' | 'settled' | 'all'>('pending');

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trips');
      if (!res.ok) throw new Error('Failed to load trips');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrips(data);
      }
    } catch (e) {
      toast.error('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Aggregate trips by Employee & Month for reconciliation
  const employeeRollups = useMemo(() => {
    const map = new Map<string, any>();

    trips.forEach(t => {
      // Consider approved, manager_approved, md_approved, finance_settled trips
      const status = t.approval_status;
      const isEligible = ['approved', 'md_approved', 'manager_approved', 'finance_settled'].includes(status);
      if (!isEligible) return;

      const userKey = t.user_id || 'unknown';
      const month = (t.log_date || t.created_at || '').substring(0, 7) || new Date().toISOString().substring(0, 7);
      const groupKey = `${userKey}_${month}`;

      const startR = Number(t.start_reading || 0);
      const endR = Number(t.end_reading || startR);
      const dist = t.distance_km !== null ? Number(t.distance_km) : (endR >= startR ? endR - startR : 0);
      const fuel = Number(t.fuel_amount) || 0;
      const misc = Number(t.misc_amount) || 0;
      const isSettled = status === 'finance_settled';

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: groupKey,
          userId: userKey,
          employeeName: t.users?.full_name || `Executive ${userKey.substring(0, 4)}`,
          employeeCode: t.users?.employee_code || userKey.substring(0, 6).toUpperCase(),
          department: t.users?.department || 'Operations',
          month,
          tripIds: [t.id],
          tripsCount: 1,
          totalKm: dist,
          fuelAmount: fuel,
          miscAmount: misc,
          settledCount: isSettled ? 1 : 0,
          pendingCount: isSettled ? 0 : 1,
        });
      } else {
        const item = map.get(groupKey);
        item.tripIds.push(t.id);
        item.tripsCount += 1;
        item.totalKm += dist;
        item.fuelAmount += fuel;
        item.miscAmount += misc;
        if (isSettled) item.settledCount += 1;
        else item.pendingCount += 1;
      }
    });

    return Array.from(map.values()).map(item => {
      // Benchmark fuel price (Rs 106 / Liter)
      const FUEL_BENCHMARK_PRICE = 106;
      const petrolUsageLiters = item.fuelAmount > 0 
        ? Number((item.fuelAmount / FUEL_BENCHMARK_PRICE).toFixed(2)) 
        : 0;

      // Mileage = Total KM / (Fuel Bill / Fuel Price)
      // e.g. 1000 KM / (2500 / 106) = 42.40 KM/L
      const vehicleMileage = (petrolUsageLiters > 0 && item.totalKm > 0)
        ? Number((item.totalKm / (item.fuelAmount / FUEL_BENCHMARK_PRICE)).toFixed(2))
        : 0;

      // If fuel is not claimed directly, apply standard conveyance rate per KM
      // Otherwise conveyance is fuel + misc
      const kmReimbursement = Number((item.totalKm * VALIDATION_RULES.STANDARD_CONVEYANCE_RATE_PER_KM).toFixed(2));
      const totalPayable = item.fuelAmount > 0 
        ? item.fuelAmount + item.miscAmount 
        : kmReimbursement + item.miscAmount;

      return {
        ...item,
        totalKm: Number(item.totalKm.toFixed(1)),
        petrolUsageLiters,
        vehicleMileage,
        kmReimbursement,
        totalPayable: Number(totalPayable.toFixed(2)),
        isFullySettled: item.pendingCount === 0 && item.settledCount > 0
      };
    });
  }, [trips]);

  // Filtered rows
  const filteredRollups = useMemo(() => {
    return employeeRollups.filter(r => {
      if (settlementFilter === 'pending' && r.isFullySettled) return false;
      if (settlementFilter === 'settled' && !r.isFullySettled) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchName = r.employeeName.toLowerCase().includes(q);
        const matchCode = r.employeeCode.toLowerCase().includes(q);
        const matchDept = r.department.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept) return false;
      }
      return true;
    });
  }, [employeeRollups, settlementFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selected.size === filteredRollups.length) setSelected(new Set());
    else setSelected(new Set(filteredRollups.map(i => i.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Record settlement in batch
  const handleProcessSettlement = async () => {
    if (selected.size === 0) return;

    const ref = window.prompt(`Enter Bank / ERP Payment Reference Number (e.g., NEFT-20261014-001):`);
    if (ref === null) return;
    if (!ref.trim()) {
      toast.error('Payment reference is required for audit trail.');
      return;
    }

    // Collect all trip IDs belonging to selected employee rollups
    const tripIdsToSettle: string[] = [];
    employeeRollups.forEach(r => {
      if (selected.has(r.id)) {
        tripIdsToSettle.push(...r.tripIds);
      }
    });

    toast.loading(`Reconciling & settling ${tripIdsToSettle.length} claim logs...`);
    try {
      const { error } = await supabase
        .from('trip_logs')
        .update({
          approval_status: 'finance_settled',
          updated_at: new Date().toISOString()
        })
        .in('id', tripIdsToSettle);

      toast.dismiss();
      if (error) throw error;

      toast.success(`🎉 Settled ${tripIdsToSettle.length} claims under Ref: ${ref.trim()}`);
      setSelected(new Set());
      fetchTrips();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || 'Settlement failed');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRollups.length === 0) {
      toast.error('No records available to export.');
      return;
    }

    const headers = [
      'Month', 
      'Employee Code', 
      'Employee Name', 
      'Department', 
      'Trips Count', 
      'Total KM', 
      'Fuel Expenses (INR)', 
      'Est. Petrol Usage (Liters @ Rs 106/L)', 
      'Vehicle Mileage (KM/L)', 
      'Misc Expenses (INR)', 
      'Total Payable (INR)', 
      'Status'
    ];
    const rows = filteredRollups.map(r => [
      r.month,
      r.employeeCode,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      r.tripsCount,
      r.totalKm,
      r.fuelAmount,
      r.petrolUsageLiters > 0 ? r.petrolUsageLiters : 'N/A',
      r.vehicleMileage > 0 ? r.vehicleMileage : 'N/A',
      r.miscAmount,
      r.totalPayable,
      r.isFullySettled ? 'SETTLED' : 'PENDING SETTLEMENT'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fuel_Reconciliation_Settlement_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded reconciliation statement with mileage!');
  };

  // Top KPI calculations
  const pendingSettlementRollups = employeeRollups.filter(r => !r.isFullySettled);
  const totalPayablePending = pendingSettlementRollups.reduce((sum, r) => sum + r.totalPayable, 0);
  const settledCount = employeeRollups.filter(r => r.isFullySettled).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Finance Settlement & Reconciliation</h2>
          <p className="text-gray-500 text-sm mt-1">
            Reconcile fully authorized employee claims, apply payment references, and disburse reimbursements.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <Button 
              onClick={handleProcessSettlement} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs whitespace-nowrap"
            >
              <CheckSquare className="mr-1.5 h-4 w-4" /> Settle Selected ({selected.size})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs whitespace-nowrap">
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" /> Export Reconciliation CSV
          </Button>

          <Button variant="ghost" size="sm" onClick={fetchTrips} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Ticker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-700">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Pending Finance Settlement</p>
            <p className="text-2xl font-extrabold text-gray-900">{pendingSettlementRollups.length} Statements</p>
            <p className="text-xs text-amber-700 font-medium">Ready for disbursement</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-700">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Total Pending Disbursement</p>
            <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(totalPayablePending)}</p>
            <p className="text-xs text-gray-400">Total claim liability</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-l-4 border-l-primary shadow-sm">
          <div className="bg-primary/10 p-3 rounded-xl text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Settled Statements</p>
            <p className="text-2xl font-extrabold text-gray-900">{settledCount}</p>
            <p className="text-xs text-gray-400">Reconciled with bank vouchers</p>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 space-x-2">
        <button
          onClick={() => setSettlementFilter('pending')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2",
            settlementFilter === 'pending'
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Pending Settlement
          {pendingSettlementRollups.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingSettlementRollups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSettlementFilter('settled')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2",
            settlementFilter === 'settled'
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Settled / Reconciled
          {settledCount > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {settledCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSettlementFilter('all')}
          className={cn(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-colors",
            settlementFilter === 'all' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          All Rollups
        </button>
      </div>

      {/* Main Table Card */}
      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center bg-gray-50/50 justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            <Input 
              placeholder="Search employee by name, code, dept..." 
              className="pl-10 bg-white" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-500">
            Showing <strong>{filteredRollups.length}</strong> monthly statements
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary" 
                    checked={selected.size === filteredRollups.length && filteredRollups.length > 0} 
                    onChange={toggleSelectAll} 
                  />
                </th>
                <th className="px-3 py-3 font-medium">Month</th>
                <th className="px-3 py-3 font-medium">Employee / Code</th>
                <th className="px-3 py-3 font-medium">Department</th>
                <th className="px-2 py-3 font-medium text-center">Trips</th>
                <th className="px-3 py-3 font-medium">Distance</th>
                <th className="px-3 py-3 font-medium">Fuel Bill</th>
                <th className="px-3 py-3 font-medium">Petrol Usage</th>
                <th className="px-3 py-3 font-medium text-center">Mileage</th>
                <th className="px-3 py-3 font-medium">Total Payable</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Calculating monthly employee conveyance rollups & vehicle mileages...
                  </td>
                </tr>
              ) : filteredRollups.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    No approved claims pending finance settlement for this filter.
                  </td>
                </tr>
              ) : (
                filteredRollups.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary" 
                        checked={selected.has(row.id)} 
                        onChange={() => toggleSelect(row.id)} 
                        disabled={row.isFullySettled}
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{row.month}</td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-gray-900 block">{row.employeeName}</span>
                      <span className="text-xs text-gray-400 font-mono">{row.employeeCode}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{row.department}</td>
                    <td className="px-2 py-3 text-center">
                      <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-full font-bold">
                        {row.tripsCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-gray-900 whitespace-nowrap">{row.totalKm} KM</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatCurrency(row.fuelAmount)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.petrolUsageLiters > 0 ? (
                        <div>
                          <span className="font-bold text-sky-700">{row.petrolUsageLiters} L</span>
                          <span className="text-[10px] text-gray-400 block">@ ₹106/L</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {row.vehicleMileage > 0 ? (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-extrabold",
                          row.vehicleMileage >= 35 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        )}>
                          {row.vehicleMileage} KM/L
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-extrabold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(row.totalPayable)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.isFullySettled ? (
                        <Badge variant="finance_settled">Settled</Badge>
                      ) : (
                        <Badge variant="warning">Pending Settlement</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => window.open(`/api/reports/monthly-conveyance?userId=${row.userId}&month=${row.month}&fuelPrice=106`, '_blank')}
                        className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded shadow-xs transition-colors"
                        title="View Official Conveyance & Fuel Mileage Sheet"
                      >
                        📄 Sheet
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
