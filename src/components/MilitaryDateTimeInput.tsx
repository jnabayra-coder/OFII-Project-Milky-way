import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { parseAndConvertMilitaryTime, formatTo12HourTime, formatDualTimeDisplay } from '../utils/timeUtils';

interface MilitaryDateTimeInputProps {
  label?: string;
  value: string; // e.g. "2026-08-23 08:00 AM" or "2026-08-23 14:30" or "In Transit"
  onChange: (value: string) => void;
  placeholderDate?: string;
  placeholderTime?: string;
  disabled?: boolean;
  className?: string;
}

export const MilitaryDateTimeInput: React.FC<MilitaryDateTimeInputProps> = ({
  label,
  value,
  onChange,
  placeholderDate = 'YYYY-MM-DD',
  placeholderTime = '24h (e.g. 1430)',
  disabled = false,
  className = '',
}) => {
  // Split value into date and time
  const parseValue = (val: string) => {
    if (!val || val === '—' || val === '-') {
      return { date: '', time: '' };
    }
    if (['in transit', 'pending', 'under customs', 'delayed', 'booked'].includes(val.toLowerCase())) {
      return { date: '', time: val };
    }
    const parts = val.split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const timePart = parts.slice(1).join(' ');
      return { date: datePart, time: timePart };
    }
    if (val.includes('-')) {
      return { date: val, time: '' };
    }
    return { date: '', time: val };
  };

  const initial = parseValue(value);
  const [datePart, setDatePart] = useState(initial.date);
  const [timePart, setTimePart] = useState(initial.time);
  const [timeValidation, setTimeValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: true });

  useEffect(() => {
    const updated = parseValue(value);
    setDatePart(updated.date);
    setTimePart(updated.time);
  }, [value]);

  const handleDateChange = (newDate: string) => {
    setDatePart(newDate);
    emitCombined(newDate, timePart);
  };

  const handleTimeChange = (newTime: string) => {
    setTimePart(newTime);
    if (!newTime.trim()) {
      setTimeValidation({ isValid: true });
      emitCombined(datePart, '');
      return;
    }

    const parsed = parseAndConvertMilitaryTime(newTime);
    if (!parsed.isValid) {
      setTimeValidation({ isValid: false, message: parsed.errorMessage });
      emitCombined(datePart, newTime);
    } else {
      setTimeValidation({ isValid: true });
      emitCombined(datePart, parsed.time12 || newTime);
    }
  };

  const emitCombined = (d: string, t: string) => {
    if (!d && !t) {
      onChange('—');
      return;
    }
    if (d && t) {
      onChange(`${d} ${t}`);
    } else if (d) {
      onChange(d);
    } else {
      onChange(t);
    }
  };

  const parsedTimeResult = parseAndConvertMilitaryTime(timePart);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </label>
          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">
            Date + 24-Hr Time
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Date Input */}
        <div className="relative">
          <input
            type="date"
            value={datePart}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholderDate}
            className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono text-xs text-slate-800 shadow-2xs"
          />
        </div>

        {/* 24-Hour Military Time Input */}
        <div className="relative">
          <input
            type="text"
            value={timePart}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholderTime}
            className={`w-full bg-white font-mono text-xs rounded px-2.5 py-1 transition-all shadow-2xs ${
              !timeValidation.isValid
                ? 'border border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500'
                : 'border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800'
            }`}
          />
          {parsedTimeResult.isValid && parsedTimeResult.time12 && parsedTimeResult.time12 !== '—' && (
            <span className="absolute right-2 top-1 text-[10px] font-mono font-bold text-emerald-700 pointer-events-none">
              {parsedTimeResult.time12}
            </span>
          )}
        </div>
      </div>

      {/* Real-time feedback & validation message */}
      <div className="flex items-center justify-between text-[10px]">
        {!timeValidation.isValid ? (
          <span className="text-rose-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{timeValidation.message}</span>
          </span>
        ) : parsedTimeResult.isValid && parsedTimeResult.time12 && parsedTimeResult.time12 !== '—' ? (
          <span className="text-slate-500 font-mono">
            Converted: <strong className="text-blue-900">{parsedTimeResult.time12}</strong>{' '}
            {parsedTimeResult.military24 && `[${parsedTimeResult.military24}H]`}
          </span>
        ) : (
          <span className="text-slate-400">Military time e.g. 0800, 1430, 1830</span>
        )}
      </div>
    </div>
  );
};
