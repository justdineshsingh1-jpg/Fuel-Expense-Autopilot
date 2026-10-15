'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Fuel, TrendingUp, History, ShieldCheck, 
  Save, RefreshCw, Calculator, ArrowRight, IndianRupee, Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function FuelSettingsPage() {
  const { user } = useAuthStore();
  const [currentPrice, setCurrentPrice] = useState<number>(106);
  const [conveyanceRate, setConveyanceRate] = useState<number>(3.5);
  const [newPriceInput, setNewPriceInput] = useState<string>('106');
  const [newRateInput, setNewRateInput] = useState<string>('3.5');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [updatedBy, setUpdatedBy] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Live Calculator simulation state
  const [simBill, setSimBill] = useState<number>(2500);
  const [simDistance, setSimDistance] = useState<number>(1000);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/fuel-price', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCurrentPrice(data.fuel_price || 106);
        setNewPriceInput(String(data.fuel_price || 106));
        setConveyanceRate(data.conveyance_rate_km || 3.5);
        setNewRateInput(String(data.conveyance_rate_km || 3.5));
        setLastUpdated(data.updated_at || '');
        setUpdatedBy(data.updated_by || 'Admin');
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch (e) {
      toast.error('Failed to load current fuel settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newPriceInput);
    const rateNum = parseFloat(newRateInput);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid positive petrol price.');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Please enter a valid conveyance rate per KM.');
      return;
    }

    setIsSaving(true);
    toast.loading('Saving new fuel benchmark rate...');
    try {
      const res = await fetch('/api/admin/fuel-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuel_price: priceNum,
          conveyance_rate_km: rateNum,
          updated_by: user?.name ? `${user.name} (${user.role})` : 'Administrator'
        })
      });
      toast.dismiss();
      const resData = await res.json();
      if (res.ok) {
        toast.success(`🎉 ${resData.message}`);
        fetchSettings();
      } else {
        toast.error(resData.error || 'Failed to update fuel price');
      }
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || 'Error updating price');
    } finally {
      setIsSaving(false);
    }
  };

  // Live simulation results
  const previewPrice = parseFloat(newPriceInput) || currentPrice || 106;
  const simLiters = simBill > 0 && previewPrice > 0 ? (simBill / previewPrice) : 0;
  const simMileage = simLiters > 0 && simDistance > 0 ? (simDistance / simLiters) : 0;

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Fuel className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Petrol Price & Policy Rates
              </h2>
              <p className="text-gray-500 text-sm">
                Update the official petrol rate benchmark. Automatically recalculates all mileage audits and monthly reports.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings} disabled={isLoading}>
          <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      {/* Main Form and Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Rate Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" /> Update Benchmark Rates
              </CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleSave} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Petrol Price */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Petrol Price Per Litre (₹ / L) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="pl-8 text-lg font-bold text-gray-900"
                        placeholder="106.00"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Currently configured: <strong>₹{currentPrice.toFixed(2)}/L</strong>
                    </span>
                  </div>

                  {/* Standard Per KM Rate */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Conveyance Rate Per KM (₹ / KM) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.05"
                        min="0.5"
                        value={newRateInput}
                        onChange={(e) => setNewRateInput(e.target.value)}
                        className="pl-8 text-lg font-bold text-gray-900"
                        placeholder="3.50"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Used when employee travels without fuel bill (Default: <strong>₹{conveyanceRate.toFixed(2)}/KM</strong>)
                    </span>
                  </div>
                </div>

                {/* Info Callout */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-600" /> Immediate System-Wide Application:
                  </p>
                  <p>
                    When you save a new price, all upcoming Monthly Conveyance Sheets, Accounts reconciliation rollups, and average mileage audits will automatically calculate using this new benchmark.
                  </p>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Last updated: {lastUpdated ? formatDate(lastUpdated) : 'Never'} by {updatedBy}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                  >
                    <Save className="h-4 w-4 mr-1.5" /> Save New Benchmark Price
                  </Button>
                </div>

              </form>
            </CardBody>
          </Card>

          {/* Price Change Audit History */}
          <Card>
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-gray-500" /> Historical Price Log
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Effective Date</th>
                    <th className="px-4 py-2.5 font-semibold">Petrol Rate</th>
                    <th className="px-4 py-2.5 font-semibold">Updated By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                        No previous price changes recorded. Current rate is active.
                      </td>
                    </tr>
                  ) : (
                    history.map((h, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium">{formatDate(h.effective_date)}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-700">₹{Number(h.price).toFixed(2)} / Litre</td>
                        <td className="px-4 py-2.5 text-gray-500">{h.updated_by || 'Admin'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Col: Live Mileage Impact Simulator */}
        <div className="space-y-6">
          <Card className="border-2 border-primary/20 shadow-sm bg-gradient-to-b from-white to-slate-50">
            <CardHeader className="border-b border-gray-100 bg-primary/5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Calculator className="h-4 w-4" /> Live Mileage Impact Simulator
              </CardTitle>
            </CardHeader>
            <CardBody className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Test how the new petrol price affects petrol usage and vehicle mileage calculation:
              </p>

              {/* Sample Fuel Bill */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  Sample Fuel Bill (₹)
                </label>
                <Input
                  type="number"
                  value={simBill}
                  onChange={(e) => setSimBill(parseFloat(e.target.value) || 0)}
                  className="text-sm font-bold bg-white"
                />
              </div>

              {/* Sample Distance */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  Sample Travel Distance (KM)
                </label>
                <Input
                  type="number"
                  value={simDistance}
                  onChange={(e) => setSimDistance(parseFloat(e.target.value) || 0)}
                  className="text-sm font-bold bg-white"
                />
              </div>

              {/* Calculation Preview Output */}
              <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3 mt-4">
                <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span>Applied Benchmark:</span>
                  <span className="font-bold text-amber-400">₹{previewPrice.toFixed(2)} / L</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Estimated Petrol Usage:</span>
                  <span className="font-extrabold text-sky-400 text-sm">
                    {simLiters.toFixed(2)} Litres
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                  <span className="text-xs text-slate-300">Average Mileage:</span>
                  <span className="font-extrabold text-emerald-400 text-base">
                    {simMileage.toFixed(2)} KM / L
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 italic pt-1 text-center">
                  Formula: {simDistance} KM ÷ ({simBill} ÷ {previewPrice}) = {simMileage.toFixed(2)} KM/L
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}
