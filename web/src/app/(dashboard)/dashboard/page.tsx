'use client';

import React, { useState } from 'react';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { useAuthStore } from '@/lib/store';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  IndianRupee,
  MapPin,
  Camera,
  Play,
  Square
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
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

function FieldAgentDashboard({ user }: { user: any }) {
  const [tripActive, setTripActive] = useState(false);

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      <div className="bg-primary text-white p-6 rounded-2xl shadow-lg text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Hi, {user?.name.split(' ')[0] || 'Agent'}</h2>
          <p className="opacity-90 mb-6">{tripActive ? "Your trip is currently active." : "Ready to start your day?"}</p>
          
          <button 
            onClick={() => setTripActive(!tripActive)}
            className={`w-full font-bold py-4 rounded-xl shadow uppercase tracking-wide text-lg flex items-center justify-center gap-2 ${tripActive ? 'bg-red-500 text-white' : 'bg-white text-primary'}`}
          >
            {tripActive ? <><Square className="h-5 w-5" fill="currentColor" /> End Trip</> : <><Play className="h-5 w-5" fill="currentColor" /> Start Trip</>}
          </button>
        </div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
          <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <MapPin className="h-7 w-7" />
          </div>
          <span className="font-semibold text-gray-700">Check-in</span>
        </button>
        <button className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
          <div className="h-14 w-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <Camera className="h-7 w-7" />
          </div>
          <span className="font-semibold text-gray-700">Upload Bill</span>
        </button>
      </div>
      
      <div className="mt-8">
        <h3 className="font-semibold text-gray-800 mb-4 px-1">Today's Activity</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center justify-center text-gray-400">
          <MapPin className="h-10 w-10 mb-3 opacity-20" />
          <p>No locations logged today.</p>
          <p className="text-sm mt-1">Start your trip to begin tracking.</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

  if (user?.role === 'field_agent') {
    return <FieldAgentDashboard user={user} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Fuel Expense (MTD)" value="?2,45,000" trend={{ value: 12, isPositive: false }} icon={<IndianRupee className="h-6 w-6 text-gray-400" />} />
        <StatsCard title="Pending Approvals" value="42" icon={<FileText className="h-6 w-6 text-gray-400" />} />
        <StatsCard title="Fraud Flags" value="5" trend={{ value: 2, isPositive: false }} icon={<AlertTriangle className="h-6 w-6 text-red-500" />} />
        <StatsCard title="Reconciled" value="128" trend={{ value: 8, isPositive: true }} icon={<CheckCircle2 className="h-6 w-6 text-green-500" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense Trend</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `?${val/1000}k`} />
                  <RechartsTooltip cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mockDeptData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="spend">
                    {mockDeptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `?${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
