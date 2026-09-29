'use client';

import React from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { AlertTriangle, User, Calendar, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import { FLAG_TYPE_LABELS, STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const mockFlags = [
  {
    id: 'FLG-882',
    tripId: 'TRP-1002',
    type: 'high_variance',
    description: 'Claimed distance is 41.7% higher than OSRM calculated route. Normal acceptable variance is 10%.',
    severity: 'high',
    resolved: false,
    tripDate: '2024-02-14',
    employeeName: 'Priya Patel',
    executiveExplanation: 'Had to take a detour due to heavy road construction on the main highway. Verified with local news.',
  },
  {
    id: 'FLG-883',
    tripId: 'TRP-1015',
    type: 'weekend_travel',
    description: 'Travel claimed on Sunday without prior weekend work approval record.',
    severity: 'medium',
    resolved: false,
    tripDate: '2024-02-11',
    employeeName: 'Amit Kumar',
  }
];

export default function FlagsPage() {
  const handleResolve = (id: string) => {
    toast.success(`Flag ${id} marked as resolved.`);
  };

  const handleEscalate = (id: string) => {
    toast.success(`Flag ${id} escalated for further review.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Fraud Flag Review</h2>
          <p className="text-gray-500">Investigate anomalies detected by the AI engine.</p>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-gray-200">
        <Select 
          options={[
            { label: 'Unresolved', value: 'unresolved' },
            { label: 'Resolved', value: 'resolved' },
            { label: 'All Flags', value: 'all' },
          ]}
          className="w-48"
        />
        <Select 
          options={[
            { label: 'All Severities', value: 'all' },
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ]}
          className="w-48"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockFlags.map((flag) => (
          <Card key={flag.id} className={flag.resolved ? 'opacity-60' : ''}>
            <CardBody>
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Status & Type */}
                <div className="flex-shrink-0 flex flex-col items-start gap-2 w-full md:w-48">
                  <Badge 
                    variant="flagged" 
                    className={flag.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}
                  >
                    {flag.severity.toUpperCase()} SEVERITY
                  </Badge>
                  <h3 className="font-semibold text-gray-900">{FLAG_TYPE_LABELS[flag.type] || flag.type}</h3>
                  <p className="text-xs text-gray-500">ID: {flag.id}</p>
                </div>

                {/* Details */}
                <div className="flex-grow space-y-4">
                  <div className="bg-red-50 border border-red-100 p-3 rounded-md">
                    <p className="text-sm text-red-800">{flag.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 flex items-center gap-1"><User className="h-3 w-3"/> Employee</span>
                      <p className="font-medium text-gray-900">{flag.employeeName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3"/> Date</span>
                      <p className="font-medium text-gray-900">{formatDate(flag.tripDate)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3"/> Trip Ref</span>
                      <p className="font-medium text-primary hover:underline cursor-pointer">{flag.tripId}</p>
                    </div>
                  </div>

                  {flag.executiveExplanation && (
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1">EXECUTIVE EXPLANATION</p>
                      <p className="text-sm text-gray-700 italic">"{flag.executiveExplanation}"</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col gap-2 w-full md:w-32 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 justify-center">
                  {!flag.resolved ? (
                    <>
                      <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleResolve(flag.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Resolve
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleEscalate(flag.id)}>
                        <ArrowRight className="mr-2 h-4 w-4" /> Escalate
                      </Button>
                    </>
                  ) : (
                    <Badge variant="approved">Resolved</Badge>
                  )}
                </div>

              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
