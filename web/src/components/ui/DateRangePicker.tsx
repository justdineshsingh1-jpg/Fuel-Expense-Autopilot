import React from 'react';
import { Input } from './Input';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, className }: DateRangePickerProps) {
  return (
    <div className={`flex items-end gap-2 ${className || ''}`}>
      <Input 
        type="date" 
        label="From" 
        value={startDate} 
        onChange={(e) => onChange(e.target.value, endDate)}
      />
      <span className="pb-2 text-gray-400">-</span>
      <Input 
        type="date" 
        label="To" 
        value={endDate} 
        onChange={(e) => onChange(startDate, e.target.value)}
      />
    </div>
  );
}
