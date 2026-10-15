import { ForwardingMode, PhilippineArea, PerformanceResult } from '../types';
import {
  calculateExpectedDeliveryDate,
  calculateExpectedDeliveryDateFromLeadtime,
  getDeliveryLeadtime,
  getStandardLeadTimeDays,
  countWorkingDaysBetween,
  addWorkingDays,
  evaluateDeliveryPerformance,
  checkInTransitDelay,
  getDeliveryPerformanceTarget,
  determineAutomaticDeliveryStatus,
  getSystemTodayDateStr,
  AutomaticDeliveryStatus,
  AutomaticDeliveryStatusResult,
  DEFAULT_REGULAR_HOLIDAYS,
  Holiday,
  LeadtimeCalculationResult,
  CountWorkingDaysResult,
  AddWorkingDaysResult,
  DeliveryPerformanceEvaluation,
  DeliveryTargetSource,
  DeliveryPerformanceTargetResult,
  formatExpectedDeliveryDate,
  isWorkingDay,
  isSunday,
  findRegularHoliday,
} from './leadtimeEngine';
import {
  getPodLeadtime,
  getPodLeadtimeRuleDescription,
  calculatePodReturnDueDate,
  determineAutomaticPodStatus,
  PodLeadtimeResult,
  PodCalculationStatus,
  AutomaticPodStatus,
  AutomaticPodStatusResult,
} from './podEngine';

export {
  calculateExpectedDeliveryDate,
  calculateExpectedDeliveryDateFromLeadtime,
  getDeliveryLeadtime,
  getStandardLeadTimeDays,
  countWorkingDaysBetween,
  addWorkingDays,
  evaluateDeliveryPerformance,
  checkInTransitDelay,
  getDeliveryPerformanceTarget,
  determineAutomaticDeliveryStatus,
  getSystemTodayDateStr,
  DEFAULT_REGULAR_HOLIDAYS,
  formatExpectedDeliveryDate,
  isWorkingDay,
  isSunday,
  findRegularHoliday,
  getPodLeadtime,
  getPodLeadtimeRuleDescription,
  calculatePodReturnDueDate,
  determineAutomaticPodStatus,
};
export type {
  Holiday,
  LeadtimeCalculationResult,
  CountWorkingDaysResult,
  AddWorkingDaysResult,
  DeliveryPerformanceEvaluation,
  DeliveryTargetSource,
  DeliveryPerformanceTargetResult,
  AutomaticDeliveryStatus,
  AutomaticDeliveryStatusResult,
  PodLeadtimeResult,
  PodCalculationStatus,
  AutomaticPodStatus,
  AutomaticPodStatusResult,
};

/**
 * Calculates the difference in calendar days between two date strings (YYYY-MM-DD).
 */
export function calculateDaysBetween(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Normalizing to UTC midnight to avoid DST offset inaccuracies
  const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  
  const diffTime = utc2 - utc1;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Business Rules Engine for OFII Forwarding Lead Times:
 * 
 * OFFICIAL DEFAULT MATRIX (Prompt 2E-1 Confirmed Rules):
 * - Air: Luzon = 5d, Visayas = 12d, Mindanao = 12d
 * - Land: Luzon = 5d, Visayas = N/A, Mindanao = N/A
 * - Sea: Luzon = N/A, Visayas = 15d, Mindanao = 17d
 * - RORO: Luzon = N/A, Visayas = 8d, Mindanao = 10d
 */
export function getAutoDeliveryLeadTime(
  clientName: string,
  modeOfShipment: ForwardingMode | string,
  area: PhilippineArea | string
): number {
  // Official centralized matrix lookup (Single Source of Truth)
  const standardLeadTime = getDeliveryLeadtime(modeOfShipment, area);
  if (standardLeadTime !== null) {
    return standardLeadTime;
  }

  return 0; // 0 indicates N/A combination
}

/**
 * Calculates Delivery TAT and Delivery Performance using the Centralized Working-Day Rule Engine
 * and Active Delivery Performance Target (RDD override when present, else Standard Expected Delivery Date).
 * 
 * Strict Working-Day Rule:
 * 1. Resolves Active Delivery Target (RDD if present, else standard calculated expected delivery date).
 * 2. Counts working days (excluding Sundays and regular Philippine holidays) starting the day after dispatch.
 * 3. Compares actual delivery date against active delivery target.
 * 4. NO GRACE PERIOD: Exceeding active target by even 1 valid working day results in MISSED (Delayed).
 */
export function computeDeliveryPerformance(
  actualDispatchDate?: string | Date | null,
  actualDeliveryDate?: string | Date | null,
  deliveryLeadTimeDays?: number | null | undefined,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS,
  requestDeliveryDate?: string | Date | null
): {
  tatDays: number;
  performance: PerformanceResult;
  expectedDeliveryDate: string | null;
  activeTargetDate: string | null;
  targetSource: DeliveryTargetSource;
  isRddOverride: boolean;
  isLate: boolean;
  workingDaysLate: number;
} {
  const result = evaluateDeliveryPerformance(
    actualDispatchDate,
    actualDeliveryDate,
    deliveryLeadTimeDays,
    customHolidays,
    requestDeliveryDate
  );

  return {
    tatDays: result.tatDays,
    performance: result.performance,
    expectedDeliveryDate: result.expectedDeliveryDate,
    activeTargetDate: result.activeTargetDate,
    targetSource: result.targetSource,
    isRddOverride: result.isRddOverride,
    isLate: result.isLate,
    workingDaysLate: result.workingDaysLate,
  };
}

/**
 * Calculates POD TAT and POD SLA Performance using the centralized POD Engine.
 * 
 * Strict Rule:
 * - Both POD SLA (podPerformance) and POD Status (podStatus) use the exact same comparison between:
 *   - POD Return Due Date
 *   - Actual POD Return Date
 * - Actual POD Return Date <= POD Return Due Date -> HIT / ON TIME
 * - Actual POD Return Date > POD Return Due Date -> MISSED / DELAYED
 */
export function computePodPerformance(
  actualDeliveryDate?: string | Date | null,
  dateOfPodReturn?: string | Date | null,
  podLeadTimeDays?: number,
  clientName?: string | null,
  deliveryArea?: string | PhilippineArea | null,
  podReturnDueDate?: string | null,
  currentDate?: string | Date | null,
  customHolidays?: Holiday[]
): {
  podTatDays: number;
  podPerformance: PerformanceResult;
  status: AutomaticPodStatus;
  podReturnDueDate: string | null;
  podReturnDueDateFormatted: string | null;
} {
  const result = determineAutomaticPodStatus({
    actualDeliveryDate,
    actualPodReturnDate: dateOfPodReturn,
    podReturnDueDate,
    clientName,
    deliveryArea,
    currentDate,
    customHolidays,
  });

  return {
    podTatDays: result.podTatDays,
    podPerformance: result.podPerformance,
    status: result.status,
    podReturnDueDate: result.podReturnDueDate,
    podReturnDueDateFormatted: result.podReturnDueDateFormatted,
  };
}

/**
 * Convenient helper to resolve automatic Delivery Status directly from a record's fields.
 */
export function computeAutomaticDeliveryStatus(
  actualDispatchDate?: string | Date | null,
  actualDeliveryDate?: string | Date | null,
  deliveryLeadTimeDays?: number | null,
  requestDeliveryDate?: string | Date | null,
  expectedDeliveryDate?: string | Date | null,
  currentDate?: string | Date | null,
  customHolidays?: Holiday[]
): AutomaticDeliveryStatusResult {
  return determineAutomaticDeliveryStatus({
    actualDispatchDate,
    actualDeliveryDate,
    expectedDeliveryDate,
    requestDeliveryDate,
    leadTimeDaysOrConfig: deliveryLeadTimeDays,
    currentDate,
    customHolidays,
  });
}

