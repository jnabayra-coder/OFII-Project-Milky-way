/**
 * Centralized Leadtime Calculation Engine (Prompt 2E-1)
 * OFII Monitoring System
 *
 * Core Logic:
 * ACTUAL DEPARTURE -> START COUNTING NEXT DAY -> COUNT WORKING DAYS ONLY
 * -> SKIP SUNDAYS -> SKIP REGULAR HOLIDAYS -> APPLY MODE + DESTINATION LEADTIME
 * -> EXPECTED DELIVERY DATE
 */

import { ForwardingMode, PhilippineArea } from '../types';

export type LeadtimeCalculationStatus = 'SUCCESS' | 'NOT_APPLICABLE' | 'INCOMPLETE_DATA';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'regular' | 'special';
}

export interface DayBreakdown {
  dayNumber?: number; // 1, 2, 3... for counted working days
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // e.g. "Tuesday", "Sunday"
  isCounted: boolean;
  reason?: 'COUNTED_WORKING_DAY' | 'SUNDAY_EXCLUDED' | 'REGULAR_HOLIDAY_EXCLUDED';
  holidayName?: string;
}

export interface LeadtimeCalculationResult {
  leadTimeDays: number | null;
  expectedDeliveryDate: string | null; // YYYY-MM-DD
  expectedDeliveryDateFormatted: string | null; // e.g. "Monday, Aug 10, 2026"
  status: LeadtimeCalculationStatus;
  message: string;
  breakdown: DayBreakdown[];
  skippedSundaysCount: number;
  skippedHolidaysCount: number;
}

/**
 * Standard Official Leadtime Matrix:
 * 
 * Delivery Mode | Luzon   | Visayas  | Mindanao
 * Air           | 5 days  | 12 days  | 12 days
 * Land          | 5 days  | N/A      | N/A
 * Sea           | N/A     | 15 days  | 17 days
 * RORO          | N/A     | 8 days   | 10 days
 */
export const OFFICIAL_LEADTIME_MATRIX: Record<string, Record<string, number | null>> = {
  AIR: {
    LUZON: 5,
    VISAYAS: 12,
    MINDANAO: 12,
  },
  LAND: {
    LUZON: 5,
    VISAYAS: null,
    MINDANAO: null,
  },
  SEA: {
    LUZON: null,
    VISAYAS: 15,
    MINDANAO: 17,
  },
  RORO: {
    LUZON: null,
    VISAYAS: 8,
    MINDANAO: 10,
  },
};

/**
 * Standard Philippine Regular Holidays (2024 - 2027 Baseline)
 * Regular holidays are excluded from leadtime calculations.
 */
export const DEFAULT_REGULAR_HOLIDAYS: Holiday[] = [
  // 2024 Regular Holidays
  { date: '2024-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2024-03-28', name: 'Maundy Thursday', type: 'regular' },
  { date: '2024-03-29', name: 'Good Friday', type: 'regular' },
  { date: '2024-04-09', name: 'Araw ng Kagitingan', type: 'regular' },
  { date: '2024-04-10', name: 'Eid al-Fitr', type: 'regular' },
  { date: '2024-05-01', name: 'Labor Day', type: 'regular' },
  { date: '2024-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2024-06-17', name: 'Eid al-Adha', type: 'regular' },
  { date: '2024-08-26', name: 'National Heroes Day', type: 'regular' },
  { date: '2024-11-30', name: 'Bonifacio Day', type: 'regular' },
  { date: '2024-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2024-12-30', name: 'Rizal Day', type: 'regular' },

  // 2025 Regular Holidays
  { date: '2025-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2025-04-09', name: 'Araw ng Kagitingan', type: 'regular' },
  { date: '2025-04-17', name: 'Maundy Thursday', type: 'regular' },
  { date: '2025-04-18', name: 'Good Friday', type: 'regular' },
  { date: '2025-05-01', name: 'Labor Day', type: 'regular' },
  { date: '2025-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2025-08-25', name: 'National Heroes Day', type: 'regular' },
  { date: '2025-11-30', name: 'Bonifacio Day', type: 'regular' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2025-12-30', name: 'Rizal Day', type: 'regular' },

  // 2026 Regular Holidays (Active System Year)
  { date: '2026-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2026-03-20', name: 'Eid al-Fitr', type: 'regular' },
  { date: '2026-04-02', name: 'Maundy Thursday', type: 'regular' },
  { date: '2026-04-03', name: 'Good Friday', type: 'regular' },
  { date: '2026-04-09', name: 'Araw ng Kagitingan', type: 'regular' },
  { date: '2026-05-01', name: 'Labor Day', type: 'regular' },
  { date: '2026-05-27', name: 'Eid al-Adha', type: 'regular' },
  { date: '2026-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2026-08-31', name: 'National Heroes Day', type: 'regular' },
  { date: '2026-11-30', name: 'Bonifacio Day', type: 'regular' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2026-12-30', name: 'Rizal Day', type: 'regular' },

  // 2027 Regular Holidays
  { date: '2027-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2027-03-25', name: 'Maundy Thursday', type: 'regular' },
  { date: '2027-03-26', name: 'Good Friday', type: 'regular' },
  { date: '2027-04-09', name: 'Araw ng Kagitingan', type: 'regular' },
  { date: '2027-05-01', name: 'Labor Day', type: 'regular' },
  { date: '2027-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2027-08-30', name: 'National Heroes Day', type: 'regular' },
  { date: '2027-11-30', name: 'Bonifacio Day', type: 'regular' },
  { date: '2027-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2027-12-30', name: 'Rizal Day', type: 'regular' },
];

/**
 * Normalizes delivery mode string into standard matrix key: 'AIR', 'LAND', 'SEA', 'RORO'
 */
export function normalizeDeliveryModeKey(mode?: string | ForwardingMode | null): 'AIR' | 'LAND' | 'SEA' | 'RORO' | null {
  if (!mode) return null;
  const clean = String(mode).trim().toUpperCase();
  if (clean.includes('AIR')) return 'AIR';
  if (clean.includes('LAND') || clean.includes('TRUCK') || clean.includes('FTL') || clean.includes('LTL')) return 'LAND';
  if (clean.includes('RORO') || clean.includes('ROLL-ON')) return 'RORO';
  if (clean.includes('SEA') || clean.includes('OCEAN') || clean.includes('VESSEL')) return 'SEA';
  return null;
}

/**
 * Normalizes destination area into standard matrix key: 'LUZON', 'VISAYAS', 'MINDANAO'
 * Note: NCR (National Capital Region) is part of Luzon.
 */
export function normalizeDestinationAreaKey(areaOrDest?: string | PhilippineArea | null): 'LUZON' | 'VISAYAS' | 'MINDANAO' | null {
  if (!areaOrDest) return null;
  const clean = String(areaOrDest).trim().toUpperCase();
  if (clean.includes('VISAYAS') || clean === 'VIS' || clean.includes('CEBU') || clean.includes('ILOILO') || clean.includes('BACOLOD') || clean.includes('TACLOBAN')) {
    return 'VISAYAS';
  }
  if (clean.includes('MINDANAO') || clean === 'MIN' || clean.includes('DAVAO') || clean.includes('CAGAYAN') || clean.includes('GENSAN') || clean.includes('ZAMBOANGA')) {
    return 'MINDANAO';
  }
  if (clean.includes('LUZON') || clean.includes('NCR') || clean.includes('MANILA') || clean.includes('LAGUNA') || clean.includes('PAMPANGA') || clean.includes('BATANGAS') || clean.includes('CAVITE')) {
    return 'LUZON';
  }
  return null;
}

/**
 * Extracts and formats a date string as YYYY-MM-DD
 */
export function parseDateOnly(dateInput?: string | Date | null): string | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // If format is YYYY-MM-DD or starts with YYYY-MM-DD
  const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2].padStart(2, '0');
    const d = matchIso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If format is MM/DD/YYYY
  const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchSlash) {
    const m = matchSlash[1].padStart(2, '0');
    const d = matchSlash[2].padStart(2, '0');
    const y = matchSlash[3];
    return `${y}-${m}-${d}`;
  }

  // Standard fallback
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Official Delivery Leadtime Rule Engine (Prompt 2E-1 Revised)
 * 
 * Returns the official Delivery Leadtime in days for a given Mode of Shipment and Delivery Area.
 * Returns `null` if the combination is Not Applicable (N/A) or not found.
 * 
 * Official Matrix:
 * Mode of Shipment | Luzon   | Visayas  | Mindanao
 * Air              | 5 days  | 12 days  | 12 days
 * Land             | 5 days  | N/A      | N/A
 * Sea              | N/A     | 15 days  | 17 days
 * RORO             | N/A     | 8 days   | 10 days
 */
export function getDeliveryLeadtime(
  modeOfShipment?: string | ForwardingMode | null,
  deliveryArea?: string | PhilippineArea | null
): number | null {
  const modeKey = normalizeDeliveryModeKey(modeOfShipment);
  const areaKey = normalizeDestinationAreaKey(deliveryArea);

  if (!modeKey || !areaKey) {
    return null;
  }

  const row = OFFICIAL_LEADTIME_MATRIX[modeKey];
  if (!row) return null;

  return row[areaKey] ?? null;
}

/**
 * Gets the standard leadtime days from the official matrix for a given Mode and Destination Area.
 * Alias for getDeliveryLeadtime.
 */
export function getStandardLeadTimeDays(
  deliveryMode?: string | ForwardingMode | null,
  destinationArea?: string | PhilippineArea | null
): number | null {
  return getDeliveryLeadtime(deliveryMode, destinationArea);
}

/**
 * Checks if a given YYYY-MM-DD date is a Sunday.
 */
export function isSunday(dateStr: string): boolean {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return false;
  // Use UTC to prevent local time shift bugs
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCDay() === 0;
}

/**
 * Checks if a date is a regular holiday from the provided or default holiday list.
 */
export function findRegularHoliday(
  dateStr: string,
  holidaysList: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): Holiday | null {
  const cleanDate = dateStr.trim();
  const found = holidaysList.find(
    (h) => h.date === cleanDate && h.type === 'regular'
  );
  return found || null;
}

/**
 * Checks if a date is a valid working day (Monday - Saturday, excluding regular holidays).
 */
export function isWorkingDay(
  dateStr: string,
  holidaysList: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): boolean {
  if (isSunday(dateStr)) return false;
  if (findRegularHoliday(dateStr, holidaysList)) return false;
  return true;
}

/**
 * Formats a YYYY-MM-DD date to a human-readable string: "Monday, Aug 10, 2026"
 */
export function formatExpectedDeliveryDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return dateStr;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayOfWeek = dayNames[date.getUTCDay()];
  const month = monthNames[date.getUTCMonth()];
  const dayOfMonth = date.getUTCDate();
  const year = date.getUTCFullYear();

  return `${dayOfWeek}, ${month} ${dayOfMonth}, ${year}`;
}

/**
 * Helper to advance a YYYY-MM-DD date by a given number of calendar days.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns day of week name for a YYYY-MM-DD date.
 */
export function getDayOfWeekName(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[date.getUTCDay()];
}

export interface CountWorkingDaysResult {
  workingDays: number;
  skippedSundaysCount: number;
  skippedHolidaysCount: number;
  breakdown: DayBreakdown[];
}

/**
 * Centralized Working-Day Counting Engine
 * 
 * Counts valid working days (Monday - Saturday) between two dates.
 * Counting begins on the day AFTER the start date (startDate + 1).
 * Excludes:
 * - Every Sunday
 * - Configured regular Philippine holidays
 * 
 * @param startDateStr - Start date / Actual Dispatch Date (YYYY-MM-DD)
 * @param endDateStr - End date / Actual Delivery Date (YYYY-MM-DD)
 * @param customHolidays - Optional custom regular holidays list
 */
export function countWorkingDaysBetween(
  startDateStr?: string | Date | null,
  endDateStr?: string | Date | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): CountWorkingDaysResult {
  const start = parseDateOnly(startDateStr);
  const end = parseDateOnly(endDateStr);

  if (!start || !end) {
    return {
      workingDays: 0,
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
      breakdown: [],
    };
  }

  // If end date is on or before start date, 0 working days elapsed
  if (end <= start) {
    return {
      workingDays: 0,
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
      breakdown: [],
    };
  }

  let countedWorkingDays = 0;
  let skippedSundaysCount = 0;
  let skippedHolidaysCount = 0;
  const breakdown: DayBreakdown[] = [];

  let calendarOffset = 1; // Start counting the day AFTER the start date
  let currentDate = addCalendarDays(start, calendarOffset);
  const maxIterations = 730; // 2 years limit safety guard
  let iterations = 0;

  while (currentDate <= end && iterations < maxIterations) {
    iterations++;
    const currentDayOfWeek = getDayOfWeekName(currentDate);

    if (isSunday(currentDate)) {
      skippedSundaysCount++;
      breakdown.push({
        date: currentDate,
        dayOfWeek: currentDayOfWeek,
        isCounted: false,
        reason: 'SUNDAY_EXCLUDED',
      });
    } else {
      const holiday = findRegularHoliday(currentDate, customHolidays);
      if (holiday) {
        skippedHolidaysCount++;
        breakdown.push({
          date: currentDate,
          dayOfWeek: currentDayOfWeek,
          isCounted: false,
          reason: 'REGULAR_HOLIDAY_EXCLUDED',
          holidayName: holiday.name,
        });
      } else {
        countedWorkingDays++;
        breakdown.push({
          dayNumber: countedWorkingDays,
          date: currentDate,
          dayOfWeek: currentDayOfWeek,
          isCounted: true,
          reason: 'COUNTED_WORKING_DAY',
        });
      }
    }

    calendarOffset++;
    currentDate = addCalendarDays(start, calendarOffset);
  }

  return {
    workingDays: countedWorkingDays,
    skippedSundaysCount,
    skippedHolidaysCount,
    breakdown,
  };
}

export interface AddWorkingDaysResult {
  finalDate: string;
  finalDateFormatted: string;
  skippedSundaysCount: number;
  skippedHolidaysCount: number;
  breakdown: DayBreakdown[];
}

/**
 * Adds a specific number of working days to a start date,
 * skipping Sundays and regular Philippine holidays.
 * Counting begins on the day AFTER the start date.
 */
export function addWorkingDays(
  startDateStr: string,
  workingDays: number,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): AddWorkingDaysResult {
  const start = parseDateOnly(startDateStr) || startDateStr;
  const breakdown: DayBreakdown[] = [];

  if (workingDays <= 0) {
    return {
      finalDate: start,
      finalDateFormatted: formatExpectedDeliveryDate(start) || start,
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
      breakdown: [],
    };
  }

  let countedWorkingDays = 0;
  let calendarOffset = 1; // Day after start date
  let skippedSundaysCount = 0;
  let skippedHolidaysCount = 0;
  let currentDate = addCalendarDays(start, calendarOffset);

  const maxIterations = 730;
  let iterations = 0;

  while (countedWorkingDays < workingDays && iterations < maxIterations) {
    iterations++;
    const currentDayOfWeek = getDayOfWeekName(currentDate);

    if (isSunday(currentDate)) {
      skippedSundaysCount++;
      breakdown.push({
        date: currentDate,
        dayOfWeek: currentDayOfWeek,
        isCounted: false,
        reason: 'SUNDAY_EXCLUDED',
      });
    } else {
      const holiday = findRegularHoliday(currentDate, customHolidays);
      if (holiday) {
        skippedHolidaysCount++;
        breakdown.push({
          date: currentDate,
          dayOfWeek: currentDayOfWeek,
          isCounted: false,
          reason: 'REGULAR_HOLIDAY_EXCLUDED',
          holidayName: holiday.name,
        });
      } else {
        countedWorkingDays++;
        breakdown.push({
          dayNumber: countedWorkingDays,
          date: currentDate,
          dayOfWeek: currentDayOfWeek,
          isCounted: true,
          reason: 'COUNTED_WORKING_DAY',
        });
      }
    }

    if (countedWorkingDays >= workingDays) {
      break;
    }

    calendarOffset++;
    currentDate = addCalendarDays(start, calendarOffset);
  }

  return {
    finalDate: currentDate,
    finalDateFormatted: formatExpectedDeliveryDate(currentDate) || currentDate,
    skippedSundaysCount,
    skippedHolidaysCount,
    breakdown,
  };
}

/**
 * Calculates Expected Delivery Date directly from a known Lead Time in working days.
 */
export function calculateExpectedDeliveryDateFromLeadtime(
  departureDate?: string | Date | null,
  leadTimeDays?: number | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): LeadtimeCalculationResult {
  const parsedDeparture = parseDateOnly(departureDate);

  if (!parsedDeparture || leadTimeDays === null || leadTimeDays === undefined) {
    return {
      leadTimeDays: leadTimeDays ?? null,
      expectedDeliveryDate: null,
      expectedDeliveryDateFormatted: null,
      status: 'INCOMPLETE_DATA',
      message: 'Expected delivery date cannot be calculated without departure date and lead time.',
      breakdown: [],
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
    };
  }

  if (leadTimeDays <= 0) {
    return {
      leadTimeDays: null,
      expectedDeliveryDate: null,
      expectedDeliveryDateFormatted: null,
      status: 'NOT_APPLICABLE',
      message: 'No standard leadtime is configured for this shipment.',
      breakdown: [],
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
    };
  }

  const result = addWorkingDays(parsedDeparture, leadTimeDays, customHolidays);

  return {
    leadTimeDays,
    expectedDeliveryDate: result.finalDate,
    expectedDeliveryDateFormatted: result.finalDateFormatted,
    status: 'SUCCESS',
    message: `Calculated ${leadTimeDays} working days leadtime (excluding ${result.skippedSundaysCount} Sunday(s) and ${result.skippedHolidaysCount} holiday(s)).`,
    breakdown: result.breakdown,
    skippedSundaysCount: result.skippedSundaysCount,
    skippedHolidaysCount: result.skippedHolidaysCount,
  };
}

/**
 * Centralized Leadtime Calculation Engine
 *
 * @param departureDate - Actual departure or dispatch date (YYYY-MM-DD or date string)
 * @param deliveryMode - Delivery mode (Air Freight, Land Freight, Sea Freight, RORO)
 * @param destinationArea - Destination area (Luzon, Visayas, Mindanao, NCR)
 * @param customHolidays - Optional custom list of regular holidays to use instead of default
 * @returns LeadtimeCalculationResult
 */
export function calculateExpectedDeliveryDate(
  departureDate?: string | Date | null,
  deliveryMode?: string | ForwardingMode | null,
  destinationArea?: string | PhilippineArea | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): LeadtimeCalculationResult {
  const parsedDeparture = parseDateOnly(departureDate);
  const modeKey = normalizeDeliveryModeKey(deliveryMode);
  const areaKey = normalizeDestinationAreaKey(destinationArea);

  // 1. Check for Missing / Incomplete Information
  if (!parsedDeparture || !modeKey || !areaKey) {
    return {
      leadTimeDays: null,
      expectedDeliveryDate: null,
      expectedDeliveryDateFormatted: null,
      status: 'INCOMPLETE_DATA',
      message:
        'Expected delivery date cannot be calculated until departure date, delivery mode, and destination are provided.',
      breakdown: [],
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
    };
  }

  // 2. Check Leadtime Matrix for Mode + Destination
  const leadTimeDays = getStandardLeadTimeDays(deliveryMode, destinationArea);

  // 3. Handle Not Applicable (N/A) Combinations
  if (leadTimeDays === null || leadTimeDays <= 0) {
    return {
      leadTimeDays: null,
      expectedDeliveryDate: null,
      expectedDeliveryDateFormatted: null,
      status: 'NOT_APPLICABLE',
      message: 'No standard leadtime is configured for this mode and destination.',
      breakdown: [],
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
    };
  }

  // 4. Working-Day Calculation via Centralized Working Days Engine
  return calculateExpectedDeliveryDateFromLeadtime(parsedDeparture, leadTimeDays, customHolidays);
}

export type DeliveryTargetSource = 'Standard Leadtime' | 'Client Request Delivery Date';

export interface DeliveryPerformanceTargetResult {
  targetDate: string | null;
  targetDateFormatted: string | null;
  targetSource: DeliveryTargetSource;
  isRddOverride: boolean;
  standardExpectedDeliveryDate: string | null;
  requestDeliveryDate: string | null;
}

/**
 * Centralized Delivery Performance Target Rule Engine
 * 
 * Determines which delivery target should be used for Delivery Performance evaluation:
 * - IF NO RDD EXISTS:
 *   Use Standard Expected Delivery Date (calculated from Mode + Area + Leadtime) as target.
 *   Target Source: 'Standard Leadtime'
 *   isRddOverride: false
 * - IF RDD EXISTS:
 *   Use Request Delivery Date (RDD) as the active Delivery Performance Target override.
 *   Target Source: 'Client Request Delivery Date'
 *   isRddOverride: true
 * 
 * Note: Standard Delivery Leadtime and Standard Expected Delivery Date are preserved and NEVER overwritten.
 */
export function getDeliveryPerformanceTarget(
  standardExpectedDeliveryDate?: string | Date | null,
  requestDeliveryDate?: string | Date | null
): DeliveryPerformanceTargetResult {
  const cleanRdd = parseDateOnly(requestDeliveryDate);
  const cleanStandard = parseDateOnly(standardExpectedDeliveryDate);

  if (cleanRdd) {
    return {
      targetDate: cleanRdd,
      targetDateFormatted: formatExpectedDeliveryDate(cleanRdd),
      targetSource: 'Client Request Delivery Date',
      isRddOverride: true,
      standardExpectedDeliveryDate: cleanStandard,
      requestDeliveryDate: cleanRdd,
    };
  }

  return {
    targetDate: cleanStandard,
    targetDateFormatted: formatExpectedDeliveryDate(cleanStandard),
    targetSource: 'Standard Leadtime',
    isRddOverride: false,
    standardExpectedDeliveryDate: cleanStandard,
    requestDeliveryDate: null,
  };
}

export interface DeliveryPerformanceEvaluation {
  tatDays: number; // Turnaround Time in valid working days (Sundays & regular holidays excluded)
  performance: 'HIT' | 'MISSED' | 'PENDING';
  expectedDeliveryDate: string | null; // Standard expected delivery date (preserved)
  activeTargetDate: string | null; // Resolved active Delivery Performance Target (RDD if present, else standard expected delivery date)
  targetSource: DeliveryTargetSource;
  isRddOverride: boolean;
  isLate: boolean;
  workingDaysLate: number;
  skippedSundaysCount: number;
  skippedHolidaysCount: number;
}

/**
 * Centralized Delivery Performance Evaluation Engine
 * 
 * Strict Working-Day Rule with RDD Target Override:
 * 1. Resolves Active Delivery Target:
 *    - If Request Delivery Date (RDD) exists -> uses RDD as active target.
 *    - If No RDD exists -> uses Standard Expected Delivery Date as active target.
 * 2. Counts working days (excluding Sundays and regular Philippine holidays)
 *    starting the day after actual departure up to actual delivery.
 * 3. Compares actual delivery date against active delivery target date.
 * 4. NO GRACE PERIOD: If actual delivery exceeds active target by even 1 working day,
 *    it is evaluated as MISSED / Delayed.
 * 
 * @param actualDispatchDate - Actual dispatch / departure date (YYYY-MM-DD)
 * @param actualDeliveryDate - Actual delivery date (YYYY-MM-DD)
 * @param leadTimeDaysOrConfig - Allowed lead time in working days, OR object with mode & area
 * @param customHolidays - Optional custom list of regular holidays
 * @param requestDeliveryDate - Optional Client Request Delivery Date (RDD) override
 */
export function evaluateDeliveryPerformance(
  actualDispatchDate?: string | Date | null,
  actualDeliveryDate?: string | Date | null,
  leadTimeDaysOrConfig?: number | { mode?: string | ForwardingMode | null; area?: string | PhilippineArea | null } | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS,
  requestDeliveryDate?: string | Date | null
): DeliveryPerformanceEvaluation {
  const dispatch = parseDateOnly(actualDispatchDate);
  const delivery = parseDateOnly(actualDeliveryDate);
  const rdd = parseDateOnly(requestDeliveryDate);

  // Determine applicable standard lead time in working days
  let leadTimeDays: number | null = null;
  if (typeof leadTimeDaysOrConfig === 'number') {
    leadTimeDays = leadTimeDaysOrConfig;
  } else if (leadTimeDaysOrConfig && typeof leadTimeDaysOrConfig === 'object') {
    leadTimeDays = getDeliveryLeadtime(leadTimeDaysOrConfig.mode, leadTimeDaysOrConfig.area);
  }

  // Calculate standard expected delivery date if dispatch and valid lead time exist
  let standardExpectedDate: string | null = null;
  if (dispatch && leadTimeDays && leadTimeDays > 0) {
    const expectedResult = calculateExpectedDeliveryDateFromLeadtime(dispatch, leadTimeDays, customHolidays);
    standardExpectedDate = expectedResult.expectedDeliveryDate;
  }

  // Resolve active delivery target via centralized rule
  const targetResult = getDeliveryPerformanceTarget(standardExpectedDate, rdd);
  const activeTargetDate = targetResult.targetDate;

  if (!dispatch || !delivery) {
    return {
      tatDays: 0,
      performance: 'PENDING',
      expectedDeliveryDate: standardExpectedDate,
      activeTargetDate,
      targetSource: targetResult.targetSource,
      isRddOverride: targetResult.isRddOverride,
      isLate: false,
      workingDaysLate: 0,
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
    };
  }

  // Calculate actual working days elapsed (Turnaround Time in working days)
  const countResult = countWorkingDaysBetween(dispatch, delivery, customHolidays);
  const workingDaysTat = countResult.workingDays;

  // If no active target exists (neither RDD nor standard expected date is available), cannot grade SLA
  if (!activeTargetDate) {
    return {
      tatDays: workingDaysTat,
      performance: 'PENDING',
      expectedDeliveryDate: standardExpectedDate,
      activeTargetDate: null,
      targetSource: targetResult.targetSource,
      isRddOverride: targetResult.isRddOverride,
      isLate: false,
      workingDaysLate: 0,
      skippedSundaysCount: countResult.skippedSundaysCount,
      skippedHolidaysCount: countResult.skippedHolidaysCount,
    };
  }

  // Evaluate performance:
  // Strict rule: Delivered on or before active target date -> HIT
  // Delivered after active target date -> MISSED (no grace period)
  const isWithinSla = delivery <= activeTargetDate;
  const performance = isWithinSla ? 'HIT' : 'MISSED';
  const isLate = !isWithinSla;

  let workingDaysLate = 0;
  if (isLate) {
    workingDaysLate = countWorkingDaysBetween(activeTargetDate, delivery, customHolidays).workingDays;
    // Guarantee at least 1 working day late if MISSED
    if (workingDaysLate === 0) {
      if (leadTimeDays && leadTimeDays > 0 && !targetResult.isRddOverride) {
        workingDaysLate = Math.max(1, workingDaysTat - leadTimeDays);
      } else {
        workingDaysLate = 1;
      }
    }
  }

  return {
    tatDays: workingDaysTat,
    performance,
    expectedDeliveryDate: standardExpectedDate,
    activeTargetDate,
    targetSource: targetResult.targetSource,
    isRddOverride: targetResult.isRddOverride,
    isLate,
    workingDaysLate,
    skippedSundaysCount: countResult.skippedSundaysCount,
    skippedHolidaysCount: countResult.skippedHolidaysCount,
  };
}

/**
 * Reusable Delay Detection for In-Transit Shipments
 * Evaluates whether an in-transit or active shipment is already overdue past its active target date (RDD or Standard Expected Date).
 */
export function checkInTransitDelay(
  actualDispatchDate: string,
  currentDateStr: string,
  leadTimeDays?: number | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS,
  requestDeliveryDate?: string | null
): {
  isOverdue: boolean;
  workingDaysOverdue: number;
  expectedDeliveryDate: string | null;
  activeTargetDate: string | null;
  isRddOverride: boolean;
} {
  const dispatch = parseDateOnly(actualDispatchDate);
  const current = parseDateOnly(currentDateStr);
  const rdd = parseDateOnly(requestDeliveryDate);

  let standardExpected: string | null = null;
  if (dispatch && leadTimeDays && leadTimeDays > 0) {
    const expected = calculateExpectedDeliveryDateFromLeadtime(dispatch, leadTimeDays, customHolidays);
    standardExpected = expected.expectedDeliveryDate;
  }

  const targetResult = getDeliveryPerformanceTarget(standardExpected, rdd);
  const activeTarget = targetResult.targetDate;

  if (!dispatch || !current || !activeTarget) {
    return {
      isOverdue: false,
      workingDaysOverdue: 0,
      expectedDeliveryDate: standardExpected,
      activeTargetDate: activeTarget,
      isRddOverride: targetResult.isRddOverride,
    };
  }

  if (current > activeTarget) {
    const overdueDays = countWorkingDaysBetween(activeTarget, current, customHolidays).workingDays;
    return {
      isOverdue: true,
      workingDaysOverdue: Math.max(1, overdueDays),
      expectedDeliveryDate: standardExpected,
      activeTargetDate: activeTarget,
      isRddOverride: targetResult.isRddOverride,
    };
  }

  return {
    isOverdue: false,
    workingDaysOverdue: 0,
    expectedDeliveryDate: standardExpected,
    activeTargetDate: activeTarget,
    isRddOverride: targetResult.isRddOverride,
  };
}

/**
 * Current local system date helper (YYYY-MM-DD)
 */
export function getSystemTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type AutomaticDeliveryStatus = 'On Time' | 'In Transit' | 'Delayed';

export interface AutomaticDeliveryStatusResult {
  status: AutomaticDeliveryStatus;
  activeTargetDate: string | null;
  targetSource: DeliveryTargetSource;
  isRddOverride: boolean;
  isOverdueInTransit: boolean;
  isDelivered: boolean;
  isLate: boolean;
  standardExpectedDeliveryDate: string | null;
  requestDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  workingDaysLate?: number;
  workingDaysOverdue?: number;
}

/**
 * Centralized Automatic Delivery Status & Delay Detection Engine
 * 
 * Determines Delivery Status strictly according to Prompt 2E-3:
 * 1. Active Delivery Target Resolution:
 *    - If Request Delivery Date (RDD) exists -> RDD is Active Target
 *    - If NO RDD exists -> Standard Expected Delivery Date is Active Target
 * 
 * 2. Decision Flow:
 *    - DOES ACTUAL DELIVERY DATE EXIST?
 *      - YES:
 *        - Actual Delivery Date <= Active Target Date -> 'On Time' (🟢)
 *        - Actual Delivery Date > Active Target Date -> 'Delayed' (🔴 - No grace period)
 *      - NO (In Transit / Undelivered):
 *        - Current Date > Active Target Date -> 'Delayed' (🔴 - Overdue in transit)
 *        - Current Date <= Active Target Date -> 'In Transit' (🟡)
 */
export function determineAutomaticDeliveryStatus(params: {
  actualDispatchDate?: string | Date | null;
  actualDeliveryDate?: string | Date | null;
  expectedDeliveryDate?: string | Date | null;
  requestDeliveryDate?: string | Date | null;
  leadTimeDaysOrConfig?: number | { mode?: string | ForwardingMode | null; area?: string | PhilippineArea | null } | null;
  currentDate?: string | Date | null;
  customHolidays?: Holiday[];
}): AutomaticDeliveryStatusResult {
  const dispatch = parseDateOnly(params.actualDispatchDate);
  const delivery = parseDateOnly(params.actualDeliveryDate);
  const rdd = parseDateOnly(params.requestDeliveryDate);
  const customHolidays = params.customHolidays || DEFAULT_REGULAR_HOLIDAYS;
  const currentDateStr = parseDateOnly(params.currentDate) || getSystemTodayDateStr();

  // 1. Calculate Standard Expected Delivery Date if not explicitly provided
  let standardExpected: string | null = parseDateOnly(params.expectedDeliveryDate);
  if (!standardExpected && dispatch) {
    let leadTimeDays: number | null = null;
    if (typeof params.leadTimeDaysOrConfig === 'number') {
      leadTimeDays = params.leadTimeDaysOrConfig;
    } else if (params.leadTimeDaysOrConfig && typeof params.leadTimeDaysOrConfig === 'object') {
      leadTimeDays = getDeliveryLeadtime(params.leadTimeDaysOrConfig.mode, params.leadTimeDaysOrConfig.area);
    }
    if (leadTimeDays && leadTimeDays > 0) {
      const expRes = calculateExpectedDeliveryDateFromLeadtime(dispatch, leadTimeDays, customHolidays);
      standardExpected = expRes.expectedDeliveryDate;
    }
  }

  // 2. Resolve Active Delivery Target (RDD override takes priority, standard target preserved)
  const targetResult = getDeliveryPerformanceTarget(standardExpected, rdd);
  const activeTargetDate = targetResult.targetDate;

  // 3. Evaluate Status based on Decision Flow
  // A. Actual Delivery Date exists
  if (delivery) {
    if (activeTargetDate) {
      if (delivery <= activeTargetDate) {
        return {
          status: 'On Time',
          activeTargetDate,
          targetSource: targetResult.targetSource,
          isRddOverride: targetResult.isRddOverride,
          isOverdueInTransit: false,
          isDelivered: true,
          isLate: false,
          standardExpectedDeliveryDate: standardExpected,
          requestDeliveryDate: rdd,
          actualDeliveryDate: delivery,
        };
      } else {
        const lateDays = countWorkingDaysBetween(activeTargetDate, delivery, customHolidays).workingDays;
        return {
          status: 'Delayed',
          activeTargetDate,
          targetSource: targetResult.targetSource,
          isRddOverride: targetResult.isRddOverride,
          isOverdueInTransit: false,
          isDelivered: true,
          isLate: true,
          workingDaysLate: Math.max(1, lateDays),
          standardExpectedDeliveryDate: standardExpected,
          requestDeliveryDate: rdd,
          actualDeliveryDate: delivery,
        };
      }
    }

    // Fallback if no target date could be calculated
    return {
      status: 'On Time',
      activeTargetDate: null,
      targetSource: targetResult.targetSource,
      isRddOverride: targetResult.isRddOverride,
      isOverdueInTransit: false,
      isDelivered: true,
      isLate: false,
      standardExpectedDeliveryDate: standardExpected,
      requestDeliveryDate: rdd,
      actualDeliveryDate: delivery,
    };
  }

  // B. No Actual Delivery Date (Undelivered shipment)
  if (activeTargetDate && currentDateStr > activeTargetDate) {
    const overdueDays = countWorkingDaysBetween(activeTargetDate, currentDateStr, customHolidays).workingDays;
    return {
      status: 'Delayed',
      activeTargetDate,
      targetSource: targetResult.targetSource,
      isRddOverride: targetResult.isRddOverride,
      isOverdueInTransit: true,
      isDelivered: false,
      isLate: true,
      workingDaysOverdue: Math.max(1, overdueDays),
      standardExpectedDeliveryDate: standardExpected,
      requestDeliveryDate: rdd,
      actualDeliveryDate: null,
    };
  }

  return {
    status: 'In Transit',
    activeTargetDate,
    targetSource: targetResult.targetSource,
    isRddOverride: targetResult.isRddOverride,
    isOverdueInTransit: false,
    isDelivered: false,
    isLate: false,
    standardExpectedDeliveryDate: standardExpected,
    requestDeliveryDate: rdd,
    actualDeliveryDate: null,
  };
}

