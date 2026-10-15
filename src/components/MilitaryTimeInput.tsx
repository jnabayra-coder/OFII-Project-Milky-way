import React, { useState, useEffect, useId } from 'react';
import { Clock, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { parseAndConvertMilitaryTime, MilitaryTimeParseResult } from '../utils/timeUtils';

interface MilitaryTimeInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'table';
  helperText?: string;
  autoFormatOnBlur?: boolean;
}

export const MilitaryTimeInput: React.FC<MilitaryTimeInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'e.g. 1430 or 0730',
  required = false,
  disabled = false,
  className = '',
  size = 'md',
  helperText,
  autoFormatOnBlur = true,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  
  // Local input state to allow fluid typing of numbers like "1", "14", "143", "1430"
  const [inputValue, setInputValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [parseResult, setParseResult] = useState<MilitaryTimeParseResult>({
    isValid: true,
    rawInput: value || '',
  });

  // Sync external value with local input state when not actively focused
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value || '');
      if (value) {
        setParseResult(parseAndConvertMilitaryTime(value));
      } else {
        setParseResult({ isValid: true, rawInput: '' });
      }
    }
  }, [value, isFocused]);

  // Handle typing in real time
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setInputValue(rawVal);

    if (!rawVal.trim() || rawVal.trim() === '—') {
      setParseResult({ isValid: true, rawInput: rawVal, time12: '—' });
      onChange(rawVal.trim() === '—' ? '—' : '');
      return;
    }

    const res = parseAndConvertMilitaryTime(rawVal);
    setParseResult(res);

    if (res.isValid && res.time12) {
      // Pass the converted 12-hour format or military time
      onChange(res.time12);
    } else {
      // Keep propagating so parent state is updated with what user typed
      onChange(rawVal);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!inputValue.trim() || inputValue.trim() === '—') {
      return;
    }

    const res = parseAndConvertMilitaryTime(inputValue);
    setParseResult(res);

    if (res.isValid && res.time12 && autoFormatOnBlur) {
      // Auto-standardize to 12-Hour AM/PM representation
      setInputValue(res.time12);
      onChange(res.time12);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // If it's currently formatted as "2:30 PM", when focusing, if user wants to type military time,
    // they can either overwrite or we can show military digits
    const res = parseAndConvertMilitaryTime(inputValue);
    if (res.isValid && res.militaryRaw) {
      // Provide clean military representation on focus for rapid 24-hr numeric entry
      setInputValue(res.militaryRaw);
    }
  };

  // Preset shortcut clicks (e.g. 0600, 0800, 1430, etc.)
  const applyPreset = (militaryDigits: string) => {
    const res = parseAndConvertMilitaryTime(militaryDigits);
    if (res.isValid && res.time12) {
      setInputValue(res.time12);
      setParseResult(res);
      onChange(res.time12);
    }
  };

  const isTable = size === 'table';
  const isSm = size === 'sm';

  return (
    <div className={`flex flex-col ${isTable ? 'w-full min-w-[120px]' : 'w-full'} ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={inputId} className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">
            24-Hr / Mil
          </span>
        </div>
      )}

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full font-mono transition-all rounded outline-none ${
            isTable
              ? 'py-1 px-2 text-xs'
              : isSm
              ? 'py-1 px-2.5 text-xs'
              : 'py-1.5 px-3 text-xs'
          } ${
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : !parseResult.isValid
              ? 'bg-rose-50/60 border border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-500'
              : isFocused
              ? 'bg-white border border-blue-600 ring-1 ring-blue-500/30 text-slate-900 shadow-2xs'
              : 'bg-white border border-slate-300 text-slate-900 hover:border-slate-400 shadow-2xs'
          }`}
        />

        {/* Real-time Indicator or Validation Icon */}
        <div className="absolute right-2 flex items-center pointer-events-none gap-1">
          {!parseResult.isValid && (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          {parseResult.isValid && parseResult.time12 && parseResult.time12 !== '—' && (
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
              {parseResult.time12}
            </span>
          )}
        </div>
      </div>

      {/* Validation Message / Converted Helper */}
      {!isTable && (
        <div className="mt-1 flex items-center justify-between text-[10px] min-h-[14px]">
          {!parseResult.isValid ? (
            <span className="text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{parseResult.errorMessage}</span>
            </span>
          ) : parseResult.time12 && parseResult.time12 !== '—' ? (
            <span className="text-slate-500 flex items-center gap-1 font-mono">
              <span>Converted:</span>
              <strong className="text-blue-900 font-bold">{parseResult.time12}</strong>
              {parseResult.military24 && (
                <span className="text-slate-400">[{parseResult.military24}H]</span>
              )}
            </span>
          ) : helperText ? (
            <span className="text-slate-400">{helperText}</span>
          ) : (
            <span className="text-slate-400">Enter 24h (e.g., 0730, 1430, 2359)</span>
          )}

          {/* Quick Preset pill on focus */}
          {isFocused && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyPreset('0800'); }}
                className="text-[9px] bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-800 px-1 rounded cursor-pointer"
              >
                0800
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyPreset('1430'); }}
                className="text-[9px] bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-800 px-1 rounded cursor-pointer"
              >
                1430
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
