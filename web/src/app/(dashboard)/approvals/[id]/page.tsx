'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { 
  ArrowLeft, CheckCircle, XCircle, CornerUpLeft, Flag, 
  MapPin, Camera, AlertTriangle, FileText, User
} from 'lucide-react';
import toast from 'react-hot-toast';

// Reusing same mock data for a single view
const mockTrip = {
  id: 'TRP-1002',
  employeeName: 'Priya Patel',
  employeeCode: 'EMP842',
  department: 'Sales',
  date: '2024-02-14',
  route: 'Home -> Client Site -> Home',
  distanceKm: 120.5,
  claimedKm: 120.5,
  osrmKm: 85.0,
  variancePercentage: 41.7,
  fuelAmount: 1200,
  status: 'flagged',
  startOdometerPhotoUrl: 'https://images.unsplash.com/photo-1599423689404-5154ee0d2023?w=400&q=80',
  endOdometerPhotoUrl: 'https://images.unsplash.com/photo-1599423689404-5154ee0d2023?w=400&q=80',
  fuelBillPhotoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
  clientVisits: [
    { id: 'v2', clientName: 'MegaCorp', timestamp: '2024-02-14T11:00:00Z', location: 'Navi Mumbai' }
  ],
  fraudFlags: [
    { id: 'f1', type: 'high_variance', description: 'Claimed distance is 41% higher than OSRM route.', severity: 'high', resolved: false, tripDate: '2024-02-14', employeeName: 'Priya Patel' }
  ],
  waypoints: ['Borivali', 'MegaCorp, Navi Mumbai', 'Borivali'],
  approvalHistory: [
    { id: 'ah1', action: 'submitted' as const, actorName: 'Priya Patel', actorRole: 'employee' as any, timestamp: '2024-02-15T09:00:00Z' },
    { id: 'ah2', action: 'flagged' as const, actorName: 'System AI', actorRole: 'system' as any, timestamp: '2024-02-15T09:00:05Z', comments: 'High variance detected vs OSRM.' },
  ]
};

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [comment, setComment] = useState('');

  const handleAction = (action: string) => {
    toast.success(`Claim ${action} successfully`);
    router.push('/approvals');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Claim {mockTrip.id}</h2>
            <Badge variant={mockTrip.status as any}>{mockTrip.status}</Badge>
          </div>
          <p className="text-gray-500">Submitted on {formatDate(mockTrip.date)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee & Summary */}
          <Card>
            <CardBody className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                  <User className="h-4 w-4" /> Employee
                </p>
                <p className="font-semibold text-gray-900">{mockTrip.employeeName}</p>
                <p className="text-xs text-gray-500">{mockTrip.employeeCode} • {mockTrip.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Distance</p>
                <p className="font-semibold text-gray-900">{mockTrip.claimedKm} KM</p>
                <p className="text-xs text-gray-500">OSRM: {mockTrip.osrmKm} KM</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Variance</p>
                <p className={cn("font-semibold", mockTrip.variancePercentage > 10 ? "text-red-600" : "text-green-600")}>
                  {mockTrip.variancePercentage}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Amount Claimed</p>
                <p className="font-semibold text-gray-900 text-lg">{formatCurrency(mockTrip.fuelAmount)}</p>
              </div>
            </CardBody>
          </Card>

          {/* Flags Alert */}
          {mockTrip.fraudFlags.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Fraud Flags Detected</h3>
                  <div className="mt-2 space-y-2">
                    {mockTrip.fraudFlags.map(flag => (
                      <p key={flag.id} className="text-sm text-red-700">
                        • <strong>{flag.type.replace('_', ' ').toUpperCase()}</strong>: {flag.description}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" /> Evidence Photos
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Odometer Comparison</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500 mb-1 block">Start (0 KM)</span>
                      <ImageViewer src={mockTrip.startOdometerPhotoUrl} alt="Start Odometer" className="h-32" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 mb-1 block">End ({mockTrip.claimedKm} KM)</span>
                      <ImageViewer src={mockTrip.endOdometerPhotoUrl} alt="End Odometer" className="h-32" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Fuel Bill</h4>
                  <ImageViewer src={mockTrip.fuelBillPhotoUrl} alt="Fuel Bill" className="h-32 w-full max-w-[200px]" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Route Map
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="bg-gray-100 rounded-md h-48 mb-4 flex items-center justify-center border border-gray-200">
                <span className="text-sm text-gray-500 flex flex-col items-center gap-2">
                  <MapPin className="h-8 w-8 text-gray-400" />
                  Map Integration Placeholder
                </span>
              </div>
              <div className="relative border-l-2 border-primary ml-3 space-y-4 py-2">
                {mockTrip.waypoints.map((wp, idx) => (
                  <div key={idx} className="relative pl-4">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-white"></span>
                    <p className="text-sm font-medium text-gray-800">{wp}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Approval History
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ApprovalTimeline history={mockTrip.approvalHistory} />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Action Bar Fixed Bottom */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <input 
            type="text" 
            placeholder="Add comments before action..." 
            className="flex-1 w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="danger" className="flex-1 sm:flex-none" onClick={() => handleAction('rejected')}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button variant="secondary" className="flex-1 sm:flex-none text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleAction('flagged')}>
              <Flag className="mr-2 h-4 w-4" /> Flag
            </Button>
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => handleAction('returned')}>
              <CornerUpLeft className="mr-2 h-4 w-4" /> Return
            </Button>
            <Button variant="primary" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" onClick={() => handleAction('approved')}>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
