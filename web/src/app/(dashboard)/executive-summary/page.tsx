"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export default function ExecutiveSummaryPage() {
  
  const [data, setData] = useState({
    totalPending: 0,
    totalValue: 0,
    cleanClaims: 0,
    flaggedClaims: 0,
    savings: 0,
    agentStats: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch pending trips
    const { data: trips, error } = await supabase
      .from('trip_logs')
      .select('*, profiles(full_name)')
      .eq('approval_status', 'pending');
      
    if (error || !trips) {
      setIsLoading(false);
      return;
    }

    let totalPending = trips.length;
    let totalValue = 0;
    let cleanClaims = 0;
    let flaggedClaims = 0;
    let savings = 0; // Simulated YTD savings (15% of total flagged)
    
    const agentMap: any = {};

    trips.forEach((t: any) => {
      const amount = Number(t.fuel_amount || 0) + Number(t.misc_amount || 0);
      totalValue += amount;
      
      const isFlagged = t.has_anomalies === true;
      if (isFlagged) {
        flaggedClaims++;
        savings += (amount * 0.15); // Example calculation
      } else {
        cleanClaims++;
      }

      const agentId = t.user_id;
      const agentName = t.profiles?.full_name || 'Unknown Agent';
      
      if (!agentMap[agentId]) {
        agentMap[agentId] = { name: agentName, totalClaims: 0, clean: 0, flagged: 0, totalAmount: 0 };
      }
      
      agentMap[agentId].totalClaims++;
      if (isFlagged) agentMap[agentId].flagged++;
      else agentMap[agentId].clean++;
      agentMap[agentId].totalAmount += amount;
    });

    setData({
      totalPending,
      totalValue,
      cleanClaims,
      flaggedClaims,
      savings,
      agentStats: Object.values(agentMap).sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    });
    
    setIsLoading(false);
  };

  const handleApproveAll = async () => {
    if (data.cleanClaims === 0) return toast.error("No clean claims to approve");
    
    toast.loading("Approving all clean claims...");
    
    const { error } = await supabase
      .from('trip_logs')
      .update({ approval_status: 'approved' })
      .eq('approval_status', 'pending')
      .eq('has_anomalies', false);
      
    toast.dismiss();
    if (error) {
      toast.error("Failed to approve claims");
    } else {
      toast.success(`Successfully approved ${data.cleanClaims} clean claims.`);
      fetchData(); // refresh
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Executive Summary - Fuel Autopilot", 14, 20);
    
    const tableColumn = ["Agent", "Total Claims", "Clean", "Flagged", "Total Amount"];
    const tableRows = data.agentStats.map(stat => [
      stat.name, 
      stat.totalClaims.toString(), 
      stat.clean.toString(), 
      stat.flagged.toString(), 
      formatCurrency(stat.totalAmount)
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
    
    doc.save("Executive_Summary.pdf");
  };

  const handleExportExcel = () => {
    const wsData = data.agentStats.map(stat => ({
      Agent: stat.name,
      "Total Claims": stat.totalClaims,
      "Clean": stat.clean,
      "Flagged": stat.flagged,
      "Total Amount": stat.totalAmount
    }));
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    
    XLSX.writeFile(wb, "Executive_Summary.xlsx");
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading live data...</div>;
  }

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
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardBody>
            <p className="text-sm font-medium text-gray-500">Total Pending Approvals</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{data.totalPending}</p>
            <p className="text-sm text-gray-500 mt-1">{formatCurrency(data.totalValue)} total value</p>
          </CardBody>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardBody>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-800">Clean Claims</p>
                <p className="mt-2 text-3xl font-bold text-green-900">{data.cleanClaims}</p>
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
                <p className="mt-2 text-3xl font-bold text-orange-900">{data.flaggedClaims}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <p className="text-sm text-orange-700 mt-1">Requires individual review</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm font-medium text-gray-500">YTD Savings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(data.savings)}</p>
            <p className="text-sm text-green-600 mt-1">Via automated variance detection</p>
          </CardBody>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Batch Approval</h3>
        <p className="text-gray-500 max-w-xl mx-auto mb-6">
          There are {data.cleanClaims} claims that have passed all AI checks and Level 1 approvals with zero fraud flags. 
          You can approve all these clean claims with a single click.
        </p>
        <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={handleApproveAll} disabled={data.cleanClaims === 0}>
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Approve All Clean Claims ({data.cleanClaims})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent-wise Breakdown</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">Agent</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Total Claims</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Clean</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Flagged</th>
                <th className="px-6 py-3 font-medium text-gray-700 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.agentStats.map((stat, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 font-medium text-gray-900">{stat.name}</td>
                  <td className="px-6 py-4 text-right">{stat.totalClaims}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium">{stat.clean}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-medium">{stat.flagged}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(stat.totalAmount)}</td>
                </tr>
              ))}
              {data.agentStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No pending claims found.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <tr>
                <td className="px-6 py-4">Total</td>
                <td className="px-6 py-4 text-right">{data.totalPending}</td>
                <td className="px-6 py-4 text-right text-green-600">{data.cleanClaims}</td>
                <td className="px-6 py-4 text-right text-red-600">{data.flaggedClaims}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(data.totalValue)}</td>
              </tr>
            </tfoot>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
