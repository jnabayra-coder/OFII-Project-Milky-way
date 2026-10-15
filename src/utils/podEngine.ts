/**
 * Centralized POD Leadtime & Return Due Date Rule Engine (Prompt 2F-1)
 * OFII Monitoring System
 * 
 * Core Concept:
 * Actual Delivery Date
 *   ↓
 * Start counting next day (Delivery date does NOT count as Day 1)
 *   ↓
 * Determine Client + Delivery Area
 *   ↓
 * Get POD Leadtime (Fixed Company Rules - No Manual Override)
 *   ↓
 * Count Valid Working Days (Excluding Sundays + Regular Holidays)
 *   ↓
 * POD Return Due Date
 */

import { PhilippineArea, PerformanceResult } from '../types';
import { 
  addWorkingDays, 
  countWorkingDaysBetween,
  parseDateOnly, 
  formatExpectedDeliveryDate, 
  normalizeDestinationAreaKey,
  DEFAULT_REGULAR_HOLIDAYS, 
  Holiday, 
  DayBreakdown 
} from './leadtimeEngine';

export type PodCalculationStatus = 'SUCCESS' | 'WAITING_FOR_DELIVERY' | 'INCOMPLETE_DATA';

export interface PodLeadtimeResult {
  podLeadTimeDays: number;
  podReturnDueDate: string | null; // YYYY-MM-DD
  podReturnDueDateFormatted: string | null; // e.g. "Saturday, Aug 15, 2026"
  status: PodCalculationStatus;
  message: string;
  ruleApplied: string;
  countingStartDate: string | null; // Day after delivery date (Day 1)
  breakdown: DayBreakdown[];
  skippedSundaysCount: number;
  skippedHolidaysCount: number;
}

/**
 * Official POD Leadtime Rules:
 * 
 * 1. Intelligent Skin Care Inc. (ISCI):
 *    - Luzon: 5 working days
 *    - Visayas: 7 working days
 *    - Mindanao: 7 working days
 * 
 * 2. Golden Archers Development Corporation (GADC):
 *    - Any Area: 7 working days
 * 
 * 3. ALL OTHER CLIENTS:
 *    - Any Area: 7 working days
 * 
 * Note: POD Return Leadtime must NOT be manually adjusted.
 */
export function getPodLeadtime(
  clientName?: string | null,
  deliveryArea?: string | PhilippineArea | null
): number {
  if (!clientName) {
    return 7; // Standard default for any other client
  }

  const cleanClient = String(clientName).trim().toLowerCase();
  const areaKey = normalizeDestinationAreaKey(deliveryArea);

  // 1. Intelligent Skin Care Inc. (ISCI)
  if (
    cleanClient.includes('intelligent skin care') ||
    cleanClient.includes('isci') ||
    cleanClient === 'client-isci'
  ) {
    if (areaKey === 'LUZON') {
      return 5; // ISCI Luzon = 5 working days
    }
    // ISCI Visayas & Mindanao = 7 working days
    return 7;
  }

  // 2. Golden Archers Development Corporation (GADC)
  if (
    cleanClient.includes('golden archers') ||
    cleanClient.includes('gadc') ||
    cleanClient === 'client-gadc'
  ) {
    return 7; // GADC Any Area = 7 working days
  }

  // 3. All other clients = 7 working days
  return 7;
}

/**
 * Returns a human-readable description of the applied POD SLA rule.
 */
export function getPodLeadtimeRuleDescription(
  clientName?: string | null,
  deliveryArea?: string | PhilippineArea | null
): string {
  const cleanClient = String(clientName || '').trim().toLowerCase();
  const areaKey = normalizeDestinationAreaKey(deliveryArea) || 'LUZON';

  if (cleanClient.includes('intelligent skin care') || cleanClient.includes('isci')) {
    if (areaKey === 'LUZON') {
      return 'ISCI Luzon SLA Rule (5 Working Days)';
    }
    return `ISCI ${areaKey === 'VISAYAS' ? 'Visayas' : 'Mindanao'} SLA Rule (7 Working Days)`;
  }

  if (cleanClient.includes('golden archers') || cleanClient.includes('gadc')) {
    return 'GADC Universal SLA Rule (7 Working Days)';
  }

  return 'Standard Client POD SLA Rule (7 Working Days)';
}

/**
 * Centralized POD Return Due Date Engine
 * 
 * Calculates the exact POD Return Due Date using working-day addition.
 * Starts counting on the day AFTER the Actual Delivery Date.
 * Skips Sundays and configured regular Philippine holidays.
 * 
 * @param actualDeliveryDate - YYYY-MM-DD or Date
 * @param clientName - Client name or code
 * @param deliveryArea - Destination region
 * @param customHolidays - Optional regular holidays list
 */
export function calculatePodReturnDueDate(
  actualDeliveryDate?: string | Date | null,
  clientName?: string | null,
  deliveryArea?: string | PhilippineArea | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): PodLeadtimeResult {
  const podLeadTimeDays = getPodLeadtime(clientName, deliveryArea);
  const ruleApplied = getPodLeadtimeRuleDescription(clientName, deliveryArea);
  const cleanDeliveryDate = parseDateOnly(actualDeliveryDate);

  // If no delivery date has been recorded yet, POD Return Due Date is pending delivery
  if (!cleanDeliveryDate) {
    return {
      podLeadTimeDays,
      podReturnDueDate: null,
      podReturnDueDateFormatted: null,
      status: 'WAITING_FOR_DELIVERY',
      message: `Awaiting actual delivery date. POD Return Leadtime is ${podLeadTimeDays} working days (${ruleApplied}).`,
      ruleApplied,
      countingStartDate: null,
      breakdown: [],
      skippedSundaysCount: 0,
      skippedHolidaysCount: 0,
    };
  }

  // Calculate POD Return Due Date:
  // Starts counting on the next day after delivery
  const addResult = addWorkingDays(cleanDeliveryDate, podLeadTimeDays, customHolidays);

  const countingStartDate = addResult.breakdown.length > 0 
    ? addResult.breakdown[0].date 
    : cleanDeliveryDate;

  return {
    podLeadTimeDays,
    podReturnDueDate: addResult.finalDate,
    podReturnDueDateFormatted: addResult.finalDateFormatted,
    status: 'SUCCESS',
    message: `POD Return Due Date is ${addResult.finalDateFormatted}. Counting started on ${countingStartDate} (${podLeadTimeDays} working days, excluding ${addResult.skippedSundaysCount} Sunday(s) and ${addResult.skippedHolidaysCount} regular holiday(s)).`,
    ruleApplied,
    countingStartDate,
    breakdown: addResult.breakdown,
    skippedSundaysCount: addResult.skippedSundaysCount,
    skippedHolidaysCount: addResult.skippedHolidaysCount,
  };
}

export type AutomaticPodStatus = 'Not Applicable' | 'POD Pending' | 'POD On Time' | 'POD Delayed';

export interface AutomaticPodStatusResult {
  status: AutomaticPodStatus;
  podPerformance: PerformanceResult;
  podTatDays: number;
  podReturnDueDate: string | null;
  podReturnDueDateFormatted: string | null;
  podLeadTimeDays: number;
  actualDeliveryDate: string | null;
  actualPodReturnDate: string | null;
  isOverdue: boolean;
  isReturned: boolean;
  message: string;
  badgeVariant: 'neutral' | 'pending' | 'ontime' | 'delayed';
}

/**
 * Centralized Automatic POD Status, SLA & Delay Detection Engine
 * 
 * Strict Centralized Comparison Rule:
 * The POD SLA result and POD Status MUST use the exact same comparison between:
 * - POD Return Due Date
 * - Actual POD Return Date
 * 
 * IF Actual POD Return Date exists:
 *    IF Actual POD Return Date <= POD Return Due Date:
 *        POD SLA = 'HIT'
 *        POD Status = 'POD On Time'
 *    ELSE (Actual POD Return Date > POD Return Due Date):
 *        POD SLA = 'MISSED'
 *        POD Status = 'POD Delayed'
 * 
 * IF NO Actual POD Return Date:
 *    IF NO Actual Delivery Date:
 *        POD SLA = 'PENDING'
 *        POD Status = 'Not Applicable'
 *    ELSE IF Current Date <= POD Return Due Date:
 *        POD SLA = 'PENDING'
 *        POD Status = 'POD Pending'
 *    ELSE IF Current Date > POD Return Due Date:
 *        POD SLA = 'MISSED'
 *        POD Status = 'POD Delayed'
 */
export function determineAutomaticPodStatus(params: {
  actualDeliveryDate?: string | Date | null;
  podReturnDueDate?: string | null;
  actualPodReturnDate?: string | Date | null;
  clientName?: string | null;
  deliveryArea?: string | PhilippineArea | null;
  currentDate?: string | Date | null;
  customHolidays?: Holiday[];
}): AutomaticPodStatusResult {
  const cleanDeliveryDate = parseDateOnly(params.actualDeliveryDate);
  const cleanPodReturnDate = parseDateOnly(params.actualPodReturnDate);
  const holidays = params.customHolidays || DEFAULT_REGULAR_HOLIDAYS;

  // 1. Undelivered shipment -> POD monitoring has not started
  if (!cleanDeliveryDate) {
    const leadTimeDays = getPodLeadtime(params.clientName, params.deliveryArea);
    return {
      status: 'Not Applicable',
      podPerformance: 'PENDING',
      podTatDays: 0,
      podReturnDueDate: null,
      podReturnDueDateFormatted: null,
      podLeadTimeDays: leadTimeDays,
      actualDeliveryDate: null,
      actualPodReturnDate: null,
      isOverdue: false,
      isReturned: false,
      message: 'Shipment has not been delivered yet. POD monitoring is Not Applicable.',
      badgeVariant: 'neutral',
    };
  }

  // 2. Determine POD Return Due Date
  let podDueDate = params.podReturnDueDate ? parseDateOnly(params.podReturnDueDate) : null;
  let podDueDateFormatted: string | null = null;
  let podLeadTimeDays = getPodLeadtime(params.clientName, params.deliveryArea);

  if (!podDueDate) {
    const calc = calculatePodReturnDueDate(
      cleanDeliveryDate,
      params.clientName,
      params.deliveryArea,
      holidays
    );
    podDueDate = calc.podReturnDueDate;
    podDueDateFormatted = calc.podReturnDueDateFormatted;
    podLeadTimeDays = calc.podLeadTimeDays;
  } else {
    podDueDateFormatted = formatExpectedDeliveryDate(podDueDate);
  }

  const todayStr = parseDateOnly(params.currentDate) || new Date().toISOString().split('T')[0];

  // 3. IF Actual POD Return Date exists:
  if (cleanPodReturnDate) {
    const tatResult = countWorkingDaysBetween(cleanDeliveryDate, cleanPodReturnDate, holidays);
    const podTatDays = tatResult.workingDays;

    // Strict centralized date comparison:
    // If Actual POD Return Date <= POD Return Due Date -> HIT, POD On Time
    // Else (Actual POD Return Date > POD Return Due Date) -> MISSED, POD Delayed
    if (podDueDate && cleanPodReturnDate > podDueDate) {
      return {
        status: 'POD Delayed',
        podPerformance: 'MISSED',
        podTatDays,
        podReturnDueDate: podDueDate,
        podReturnDueDateFormatted: podDueDateFormatted,
        podLeadTimeDays,
        actualDeliveryDate: cleanDeliveryDate,
        actualPodReturnDate: cleanPodReturnDate,
        isOverdue: true,
        isReturned: true,
        message: `Returned Late on ${cleanPodReturnDate} (Due Date was ${podDueDate}, TAT: ${podTatDays} working days).`,
        badgeVariant: 'delayed',
      };
    }

    return {
      status: 'POD On Time',
      podPerformance: 'HIT',
      podTatDays,
      podReturnDueDate: podDueDate,
      podReturnDueDateFormatted: podDueDateFormatted,
      podLeadTimeDays,
      actualDeliveryDate: cleanDeliveryDate,
      actualPodReturnDate: cleanPodReturnDate,
      isOverdue: false,
      isReturned: true,
      message: `Returned On Time on ${cleanPodReturnDate} (Due Date: ${podDueDate || '—'}, TAT: ${podTatDays} working days).`,
      badgeVariant: 'ontime',
    };
  }

  // 4. IF NO Actual POD Return Date:
  // IF Current Date > POD Return Due Date -> MISSED, POD Delayed
  if (podDueDate && todayStr > podDueDate) {
    return {
      status: 'POD Delayed',
      podPerformance: 'MISSED',
      podTatDays: 0,
      podReturnDueDate: podDueDate,
      podReturnDueDateFormatted: podDueDateFormatted,
      podLeadTimeDays,
      actualDeliveryDate: cleanDeliveryDate,
      actualPodReturnDate: null,
      isOverdue: true,
      isReturned: false,
      message: `Overdue! Target due date was ${podDueDate}. POD not yet returned to office.`,
      badgeVariant: 'delayed',
    };
  }

  // IF Current Date <= POD Return Due Date -> PENDING, POD Pending
  return {
    status: 'POD Pending',
    podPerformance: 'PENDING',
    podTatDays: 0,
    podReturnDueDate: podDueDate,
    podReturnDueDateFormatted: podDueDateFormatted,
    podLeadTimeDays,
    actualDeliveryDate: cleanDeliveryDate,
    actualPodReturnDate: null,
    isOverdue: false,
    isReturned: false,
    message: `Awaiting POD return to office. Due on or before ${podDueDate || 'calculated due date'}.`,
    badgeVariant: 'pending',
  };
}

