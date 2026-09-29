'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, CheckSquare, DownloadCloud, Server } from 'lucide-react';
import toast from 'react-hot-toast';

const mockQueue = [
  { id: '1', employee: 'Rahul Sharma', month: 'Feb 2024', totalKm: 1250, fuelAmount: 12500, billCount: 15, approvedDate: '2024-02-28' },
  { id: '2', employee: 'Priya Patel', month: 'Feb 2024', totalKm: 850, fuelAmount: 8500, billCount: 8, approvedDate: '2024-02-28' },
  { id: '3', employee: 'Amit Kumar', month: 'Feb 2024', totalKm: 2100, fuelAmount: 21000, billCount: 22, approvedDate: '2024-02-27' },
];

export default function AccountsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelectAll = () => {
    if (selected.size === mockQueue.length) setSelected(new Set());
    else setSelected(new Set(mockQueue.map(i => i.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleProcess = () => {
    toast.success(`Marked ${selected.size} claims as processed in Accounts`);
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reconciliation Queue</h2>
          <p className="text-gray-500">Fully approved claims awaiting accounts processing.</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button onClick={handleProcess}>
              <CheckSquare className="mr-2 h-4 w-4" /> Process Selected ({selected.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full text-primary"><Server className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Pending Processing</p>
            <p className="text-2xl font-bold text-gray-900">42</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full text-green-600"><CheckSquare className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Processed Today</p>
            <p className="text-2xl font-bold text-gray-900">18</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => window.location.href = '/accounts/export'}>
          <div className="text-center">
            <DownloadCloud className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-medium text-gray-900">Go to Export Center &rarr;</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-xs"><Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" /><Input placeholder="Search employee..." className="pl-10" /></div>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded border-gray-300 text-primary" checked={selected.size === mockQueue.length && mockQueue.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 font-medium">Total KM</th>
              <th className="px-4 py-3 font-medium">Fuel Amount</th>
              <th className="px-4 py-3 font-medium">Bills</th>
              <th className="px-4 py-3 font-medium">Approved Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockQueue.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300 text-primary" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{row.employee}</td>
                <td className="px-4 py-3">{row.month}</td>
                <td className="px-4 py-3">{row.totalKm}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(row.fuelAmount)}</td>
                <td className="px-4 py-3">{row.billCount}</td>
                <td className="px-4 py-3">{formatDate(row.approvedDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

