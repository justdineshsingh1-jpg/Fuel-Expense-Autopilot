import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    draft: 'bg-status-draft/10 text-status-draft',
    pending: 'bg-status-pending/10 text-status-pending',
    approved: 'bg-status-approved/10 text-status-approved',
    rejected: 'bg-status-rejected/10 text-status-rejected',
    flagged: 'bg-status-flagged/10 text-status-flagged',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
