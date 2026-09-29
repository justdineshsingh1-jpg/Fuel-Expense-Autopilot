'use client';

import React from 'react';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  IndianRupee 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const mockTrendData = [
  { name: 'Jan', amount: 45000 },
  { name: 'Feb', amount: 52000 },
  { name: 'Mar', amount: 48000 },
  { name: 'Apr', amount: 61000 },
  { name: 'May', amount: 59000 },
  { name: 'Jun', amount: 68000 },
];

const mockDeptData = [
  { name: 'Sales', spend: 45000 },
  { name: 'Operations', spend: 25000 },
  { name: 'Support', spend: 15000 },
  { name: 'Marketing', spend: 10000 },
];

const mockStatusData = [
  { name: 'Approved', value: 400 },
  { name: 'Pending', value: 150 },
  { name: 'Flagged', value: 50 },
  { name: 'Rejected', value: 20 },
];

const COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Monitor fuel expenses and approval metrics across the organization.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Claims (MTD)"
          value="620"
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending Approvals"
          value="150"
          icon={CheckCircle2}
          className="bg-amber-50/50"
        />
        <StatsCard
          title="Flagged Anomalies"
          value="50"
          icon={AlertTriangle}
          trend={{ value: 5, isPositive: false }}
          className="bg-orange-50/50"
        />
        <StatsCard
          title="Total Spend (MTD)"
          value="₹ 2,45,000"
          icon={IndianRupee}
          trend={{ value: 8, isPositive: false }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expense Trend (₹)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  <Line type="monotone" dataKey="amount" stroke="#1565C0" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department-wise Spending</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDeptData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(value) => [`₹${value}`, 'Spend']} />
                  <Bar dataKey="spend" fill="#FF6F00" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Approval Status Distribution</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
