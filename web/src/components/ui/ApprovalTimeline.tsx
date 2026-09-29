import React from 'react';
import { ApprovalAudit } from '@/lib/types';
import { CheckCircle, XCircle, AlertTriangle, Send, CornerUpLeft } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';

interface ApprovalTimelineProps {
  history: ApprovalAudit[];
}

export function ApprovalTimeline({ history }: ApprovalTimelineProps) {
  const getIcon = (action: string) => {
    switch (action) {
      case 'submitted': return <Send className="h-4 w-4 text-blue-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'flagged': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'returned': return <CornerUpLeft className="h-4 w-4 text-gray-500" />;
      default: return <div className="h-2 w-2 rounded-full bg-gray-400" />;
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== history.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-50 border border-gray-200">
                    {getIcon(event.action)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">{event.actorName}</span> ({ROLE_LABELS[event.actorRole] || event.actorRole}){' '}
                      <span className="capitalize font-medium text-gray-900">{event.action}</span>
                    </p>
                    {event.comments && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100">
                        "{event.comments}"
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    {formatDateTime(event.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
