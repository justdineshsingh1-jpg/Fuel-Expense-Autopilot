'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';

export default function ExecutiveSummaryPage() {
  const handleApproveAll = () => {
    toast.success('Successfully approved 145 clean claims.');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Executive Summary - Fuel Autopilot", 14, 20);
    
    // We will export the department table as an example
    const tableColumn = ["Department", "Total Claims", "Clean", "Flagged", "Total Amount"];
    const tableRows = [
      ["Sales", "0", "0", "0", "Rs. 0"],
      ["Operations", "0", "0", "0", "Rs. 0"],
      ["Service", "0", "0", "0", "Rs. 0"]
    ];

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
    
    doc.save("Executive_Summary.pdf");
    toast.success('PDF Downloaded!');
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Department: "Sales", "Total Claims": 0, "Clean": 0, "Flagged": 0, "Total Amount": 0 },
      { Department: "Operations", "Total Claims": 0, "Clean": 0, "Flagged": 0, "Total Amount": 0 },
      { Department: "Service", "Total Claims": 0, "Clean": 0, "Flagged": 0, "Total Amount": 0 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, "Executive_Summary.xlsx");
    toast.success('Excel Downloaded!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Executive Summary</h2>
          <p className="text-gray-500">Company-wide fuel expense overview for Managing Director approval.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="border-green-200 text-green-700 hover:bg-green-50">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* High-Level Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Pending Approvals</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500 mt-1">{formatCurrency(0)} total value</p>
          </CardBody>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardBody>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-800">Clean Claims</p>
                <p className="mt-2 text-3xl font-bold text-green-900">0</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <p className="text-sm text-green-700 mt-1">Ready for immediate approval</p>
          </CardBody>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardBody>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-orange-800">Flagged Anomalies</p>
                <p className="mt-2 text-3xl font-bold text-orange-900">0</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <p className="text-sm text-orange-700 mt-1">Requires individual review</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">YTD Savings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(0)}</p>
            <p className="text-sm text-green-600 mt-1">Via automated variance detection</p>
          </CardBody>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Batch Approval</h3>
        <p className="text-gray-500 max-w-xl mx-auto mb-6">
          There are 0 claims that have passed all AI checks and Level 1 approvals with zero fraud flags. 
          You can approve all these clean claims with a single click.
        </p>
        <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={handleApproveAll}>
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Approve All Clean Claims (0)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department-wise Breakdown</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">Department</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Total Claims</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Clean</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Flagged</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 font-medium text-gray-900">Sales</td>
                <td className="px-6 py-4 text-right">0</td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">0</td>
                <td className="px-6 py-4 text-right text-red-600 font-medium">0</td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(0)}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-gray-900">Operations</td>
                <td className="px-6 py-4 text-right">0</td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">0</td>
                <td className="px-6 py-4 text-right text-red-600 font-medium">0</td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(0)}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-gray-900">Service</td>
                <td className="px-6 py-4 text-right">0</td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">0</td>
                <td className="px-6 py-4 text-right text-red-600 font-medium">0</td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(0)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <tr>
                <td className="px-6 py-4">Total</td>
                <td className="px-6 py-4 text-right">158</td>
                <td className="px-6 py-4 text-right text-green-600">145</td>
                <td className="px-6 py-4 text-right text-red-600">13</td>
                <td className="px-6 py-4 text-right">{formatCurrency(0)}</td>
              </tr>
            </tfoot>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
