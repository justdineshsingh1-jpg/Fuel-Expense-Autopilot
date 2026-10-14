import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 
    | 'default' 
    | 'draft' 
    | 'pending' 
    | 'approved' 
    | 'rejected' 
    | 'flagged' 
    | 'active' 
    | 'warning'
    | 'supervisor_approved'
    | 'manager_approved'
    | 'md_approved'
    | 'finance_settled'
    | 'returned'
    | 'clean'
    | 'exception';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-800',
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    supervisor_approved: 'bg-indigo-100 text-indigo-800',
    manager_approved: 'bg-purple-100 text-purple-800',
    md_approved: 'bg-emerald-100 text-emerald-800',
    finance_settled: 'bg-teal-100 text-teal-800',
    returned: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    flagged: 'bg-orange-100 text-orange-800',
    active: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-800',
    clean: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    exception: 'bg-rose-100 text-rose-800 border border-rose-300',
  };

  const badgeClass = variants[variant] || variants.default;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        badgeClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
