'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const mockExportData = [
  { id: '1', voucherDate: '2024-02-28', ledgerName: 'Fuel Expenses', empCode: 'EMP842', empName: 'Priya Patel', distance: 850, amount: 8500, dr: 8500, cr: 0 },
  { id: '2', voucherDate: '2024-02-28', ledgerName: 'Staff Advance - EMP842', empCode: 'EMP842', empName: 'Priya Patel', distance: 0, amount: 8500, dr: 0, cr: 8500 },
];

export default function ExportCenterPage() {
  const [format, setFormat] = useState('tally-csv');

  const handleExport = () => {
    toast.success(`Data exported in ${format} format successfully`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Export Center</h2>
        <p className="text-gray-500">Export processed claims for accounting software integration.</p>
      </div>

      <Card>
        <CardBody className="flex flex-wrap gap-4 items-end">
          <DateRangePicker startDate="2024-02-01" endDate="2024-02-29" onChange={() => {}} />
          <Select 
            label="Department"
            options={[
              { label: 'All Departments', value: 'all' },
              { label: 'Sales', value: 'sales' },
              { label: 'Operations', value: 'ops' },
            ]}
          />
          <Select 
            label="Export Format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            options={[
              { label: 'Tally Compatible (CSV)', value: 'tally-csv' },
              { label: 'Standard Excel (XLSX)', value: 'excel' },
              { label: 'JSON Data', value: 'json' },
            ]}
          />
          <Button onClick={handleExport} className="mb-0.5">
            {format === 'tally-csv' ? <FileSpreadsheet className="mr-2 h-4 w-4" /> : <FileJson className="mr-2 h-4 w-4" />}
            Generate Export
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Preview (Tally Format Format)</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Voucher Date</th>
                <th className="px-4 py-3 font-medium">Ledger Name</th>
                <th className="px-4 py-3 font-medium">Emp Code</th>
                <th className="px-4 py-3 font-medium">Employee Name</th>
                <th className="px-4 py-3 font-medium">Distance (KM)</th>
                <th className="px-4 py-3 font-medium">Debit (₹)</th>
                <th className="px-4 py-3 font-medium">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockExportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(row.voucherDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.ledgerName}</td>
                  <td className="px-4 py-3">{row.empCode}</td>
                  <td className="px-4 py-3">{row.empName}</td>
                  <td className="px-4 py-3">{row.distance > 0 ? row.distance : '-'}</td>
                  <td className="px-4 py-3">{row.dr > 0 ? row.dr : '-'}</td>
                  <td className="px-4 py-3">{row.cr > 0 ? row.cr : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
