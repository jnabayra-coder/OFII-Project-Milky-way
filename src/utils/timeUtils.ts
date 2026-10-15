/**
 * Time utility functions for 24-Hour Military Time parsing,
 * validation, and 12-Hour AM/PM conversion in the OFII Monitoring System.
 */

export interface MilitaryTimeParseResult {
  isValid: boolean;
  rawInput: string;
  hours?: number;
  minutes?: number;
  military24?: string;     // e.g. "14:30"
  militaryRaw?: string;    // e.g. "1430"
  time12?: string;         // e.g. "2:30 PM"
  combinedDisplay?: string;// e.g. "14:30 (2:30 PM)"
  errorMessage?: string;
}

/**
 * Validates and converts 24-hour military time input (e.g., "1430", "0730", "0000", "14:30")
 * into 12-hour AM/PM format (e.g., "2:30 PM", "7:30 AM", "12:00 AM").
 * Also handles existing 12-hour strings gracefully.
 */
export function parseAndConvertMilitaryTime(input: string): MilitaryTimeParseResult {
  if (!input || !input.trim() || input.trim() === '—' || input.trim() === '-' || input.trim().toLowerCase() === 'n/a') {
    return {
      isValid: true,
      rawInput: input || '',
      time12: '—',
      military24: '—',
      combinedDisplay: '—',
    };
  }

  const clean = input.trim();

  // Check if input is a special status string (e.g. "In Transit", "Pending")
  if (['in transit', 'pending', 'under customs', 'delayed', 'booked'].includes(clean.toLowerCase())) {
    return {
      isValid: true,
      rawInput: clean,
      time12: clean,
      military24: clean,
      combinedDisplay: clean,
    };
  }

  // 1. Check if it's already a 12-hour format like "2:30 PM" or "08:15 AM"
  const twelveHourMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (twelveHourMatch) {
    let h = parseInt(twelveHourMatch[1], 10);
    const m = parseInt(twelveHourMatch[2], 10);
    const meridian = twelveHourMatch[3].toUpperCase();

    if (h < 1 || h > 12 || m < 0 || m > 59) {
      return {
        isValid: false,
        rawInput: clean,
        errorMessage: 'Invalid 12-hour time. Hours must be 1-12, minutes 00-59.',
      };
    }

    // Convert to 24h
    let h24 = h;
    if (meridian === 'AM') {
      if (h === 12) h24 = 0;
    } else {
      if (h !== 12) h24 = h + 12;
    }

    const military24 = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const militaryRaw = `${h24.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}`;
    const displayHourStr = h.toString().padStart(2, '0');
    const time12 = `${displayHourStr}:${m.toString().padStart(2, '0')} ${meridian}`;

    return {
      isValid: true,
      rawInput: clean,
      hours: h24,
      minutes: m,
      military24,
      militaryRaw,
      time12,
      combinedDisplay: `${military24} (${time12})`,
    };
  }

  // 2. Check if it's already a combined format like "14:30 (02:30 PM)" or "14:30 (2:30 PM)"
  const combinedMatch = clean.match(/^(\d{2}):(\d{2})\s*\((.+)\)$/);
  if (combinedMatch) {
    const h = parseInt(combinedMatch[1], 10);
    const m = parseInt(combinedMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return parseAndConvertMilitaryTime(`${combinedMatch[1]}${combinedMatch[2]}`);
    }
  }

  // 3. Normalize raw 24-hour military input: "1430", "14:30", "0730", "730", "0000", "2359", "0", "9"
  // Remove non-digit characters if it's a military string (e.g. "14:30" -> "1430")
  let digitsOnly = clean.replace(/\D/g, '');

  if (!digitsOnly) {
    return {
      isValid: false,
      rawInput: clean,
      errorMessage: 'Please enter digits in 24-hour format (e.g., 1430 for 02:30 PM).',
    };
  }

  // If user entered 3 digits like "730", pad to "0730"
  if (digitsOnly.length === 3) {
    digitsOnly = '0' + digitsOnly;
  } else if (digitsOnly.length === 1 || digitsOnly.length === 2) {
    // If user entered e.g. "14" -> "14:00" or "7" -> "07:00"
    digitsOnly = digitsOnly.padStart(2, '0') + '00';
  } else if (digitsOnly.length > 4) {
    // If more than 4 digits, check if invalid
    return {
      isValid: false,
      rawInput: clean,
      errorMessage: `Invalid length (${clean}). 24-hour format requires 4 digits (e.g., 1430).`,
    };
  }

  const hours = parseInt(digitsOnly.slice(0, 2), 10);
  const minutes = parseInt(digitsOnly.slice(2, 4), 10);

  // Validate 24-hour range: Hours 00-23, Minutes 00-59
  if (hours < 0 || hours > 23) {
    return {
      isValid: false,
      rawInput: clean,
      hours,
      minutes,
      errorMessage: `Invalid Hour "${hours.toString().padStart(2, '0')}". Hours in 24-hour military format must be between 00 and 23.`,
    };
  }

  if (minutes < 0 || minutes > 59) {
    return {
      isValid: false,
      rawInput: clean,
      hours,
      minutes,
      errorMessage: `Invalid Minutes "${minutes.toString().padStart(2, '0')}". Minutes must be between 00 and 59.`,
    };
  }

  // Convert to 12-Hour AM/PM with 2-digit hours (e.g. 08:15 AM, 09:05 AM)
  const period = hours >= 12 ? 'PM' : 'AM';
  const rawDisplayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayHours = rawDisplayHours.toString().padStart(2, '0');
  const displayMinutes = minutes.toString().padStart(2, '0');
  const time12 = `${displayHours}:${displayMinutes} ${period}`;
  const military24 = `${hours.toString().padStart(2, '0')}:${displayMinutes}`;
  const militaryRaw = `${hours.toString().padStart(2, '0')}${displayMinutes}`;

  return {
    isValid: true,
    rawInput: clean,
    hours,
    minutes,
    military24,
    militaryRaw,
    time12,
    combinedDisplay: `${military24} (${time12})`,
  };
}

/**
 * Formats any time string into standard professional 12-hour format ("08:15 AM").
 * If the time is empty, placeholder, or invalid, returns "—".
 */
export function formatTo12HourTime(timeStr?: string): string {
  if (!timeStr || timeStr === '—' || timeStr === '-' || !timeStr.trim() || timeStr.trim() === '00:00' || timeStr.trim().toLowerCase() === 'n/a') {
    return '—';
  }
  
  // If it's a datetime like "2026-08-23 08:00 AM" or "2026-08-23 14:30"
  if (timeStr.includes('-') && timeStr.includes(' ')) {
    const parts = timeStr.split(' ');
    const datePart = parts[0];
    const timePart = parts.slice(1).join(' ');
    const parsed = parseAndConvertMilitaryTime(timePart);
    if (parsed.isValid && parsed.time12 && parsed.time12 !== '—') {
      return `${datePart} ${parsed.time12}`;
    }
    return timeStr;
  }

  const parsed = parseAndConvertMilitaryTime(timeStr);
  return parsed.isValid && parsed.time12 ? parsed.time12 : timeStr;
}

/**
 * Formats any time string into 24-hour military format ("14:30" or "1430").
 */
export function formatTo24HourTime(timeStr?: string, withColon = true): string {
  if (!timeStr || timeStr === '—' || timeStr === '-' || !timeStr.trim()) return '—';
  
  // If it's a datetime
  if (timeStr.includes('-') && timeStr.includes(' ')) {
    const parts = timeStr.split(' ');
    const datePart = parts[0];
    const timePart = parts.slice(1).join(' ');
    const parsed = parseAndConvertMilitaryTime(timePart);
    if (parsed.isValid && parsed.military24 && parsed.military24 !== '—') {
      return `${datePart} ${withColon ? parsed.military24 : parsed.militaryRaw}`;
    }
    return timeStr;
  }

  const parsed = parseAndConvertMilitaryTime(timeStr);
  if (parsed.isValid) {
    return withColon ? (parsed.military24 || timeStr) : (parsed.militaryRaw || timeStr);
  }
  return timeStr;
}

/**
 * Returns formatted dual display: "14:30 (08:30 PM)".
 */
export function formatDualTimeDisplay(timeStr?: string): string {
  if (!timeStr || timeStr === '—' || timeStr === '-' || !timeStr.trim()) return '—';
  
  // If it's a datetime
  if (timeStr.includes('-') && timeStr.includes(' ')) {
    const parts = timeStr.split(' ');
    const datePart = parts[0];
    const timePart = parts.slice(1).join(' ');
    const parsed = parseAndConvertMilitaryTime(timePart);
    if (parsed.isValid && parsed.military24 && parsed.time12 && parsed.time12 !== '—') {
      return `${datePart} ${parsed.military24} (${parsed.time12})`;
    }
    return timeStr;
  }

  const parsed = parseAndConvertMilitaryTime(timeStr);
  if (parsed.isValid && parsed.combinedDisplay) {
    return parsed.combinedDisplay;
  }
  return timeStr;
}

export interface TimeSequenceValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  warnings: string[];
}

/**
 * Parses time string into absolute minutes from midnight (0..1439).
 */
export function timeStringToMinutes(timeStr?: string): number | null {
  if (!timeStr || !timeStr.trim() || timeStr === '—' || timeStr === '-' || timeStr.trim() === '00:00') {
    return null;
  }
  const clean = timeStr.includes(' ') && timeStr.includes('-') ? timeStr.split(' ').slice(1).join(' ') : timeStr;
  const res = parseAndConvertMilitaryTime(clean);
  if (res.isValid && res.hours !== undefined && res.minutes !== undefined) {
    return res.hours * 60 + res.minutes;
  }
  return null;
}

/**
 * Validates the logical sequence of operational dispatch timestamps:
 * Time Arrived -> Start Loading Time -> End Loading Time -> Actual Departure Time
 */
export function validateDispatchTimeSequence(
  timeArrived?: string,
  startLoadingTime?: string,
  endLoadingTime?: string,
  actualDepartureTime?: string
): TimeSequenceValidationResult {
  const warnings: string[] = [];

  const tArr = timeStringToMinutes(timeArrived);
  const tStart = timeStringToMinutes(startLoadingTime);
  const tEnd = timeStringToMinutes(endLoadingTime);
  const tDep = timeStringToMinutes(actualDepartureTime);

  // 1. Time Arrived vs Start Loading
  if (tArr !== null && tStart !== null && tStart < tArr) {
    warnings.push('Start Loading Time cannot be earlier than Time Arrived.');
  }

  // 2. Start Loading vs End Loading
  if (tStart !== null && tEnd !== null && tEnd < tStart) {
    warnings.push('End Loading Time cannot be earlier than Start Loading Time.');
  }

  // 3. End Loading vs Actual Departure
  if (tEnd !== null && tDep !== null && tDep < tEnd) {
    warnings.push('Actual Departure Time cannot be earlier than End Loading Time.');
  } else if (tStart !== null && tDep !== null && tDep < tStart && tEnd === null) {
    warnings.push('Actual Departure Time cannot be earlier than Start Loading Time.');
  } else if (tArr !== null && tDep !== null && tDep < tArr && tStart === null && tEnd === null) {
    warnings.push('Actual Departure Time cannot be earlier than Time Arrived.');
  }

  return {
    isValid: warnings.length === 0,
    hasWarnings: warnings.length > 0,
    warnings,
  };
}

/**
 * Calculates operational durations for future analytics:
 * - Waiting Time: Start Loading Time − Time Arrived
 * - Loading Duration: End Loading Time − Start Loading Time
 * - Compound Time: Actual Departure Time − Time Arrived
 */
export function calculateOperationalDurations(
  timeArrived?: string,
  startLoadingTime?: string,
  endLoadingTime?: string,
  actualDepartureTime?: string
) {
  const tArr = timeStringToMinutes(timeArrived);
  const tStart = timeStringToMinutes(startLoadingTime);
  const tEnd = timeStringToMinutes(endLoadingTime);
  const tDep = timeStringToMinutes(actualDepartureTime);

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null || isNaN(minutes) || minutes < 0) return '—';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const waitingMinutes = (tStart !== null && tArr !== null && tStart >= tArr) ? tStart - tArr : null;
  const loadingMinutes = (tEnd !== null && tStart !== null && tEnd >= tStart) ? tEnd - tStart : null;
  const compoundMinutes = (tDep !== null && tArr !== null && tDep >= tArr) ? tDep - tArr : null;

  return {
    waitingTimeMinutes: waitingMinutes,
    loadingDurationMinutes: loadingMinutes,
    compoundTimeMinutes: compoundMinutes,
    waitingTimeFormatted: formatDuration(waitingMinutes),
    loadingDurationFormatted: formatDuration(loadingMinutes),
    compoundTimeFormatted: formatDuration(compoundMinutes),
  };
}
