import { DispatchOperationalStatus, IndividualDelivery } from '../types';
import { parseAndConvertMilitaryTime } from './timeUtils';

/**
 * Derives operational dispatch status based on entered timestamps.
 * Status progression:
 * READY FOR DISPATCH -> no operational times entered yet
 * ARRIVED -> Time Arrived entered
 * LOADING -> Start Loading Time entered
 * LOADING COMPLETED -> End Loading Time entered
 * DEPARTED -> Actual Departure entered
 * Uses the latest valid operational time.
 */
export function deriveDeliveryOperationalStatus(
  timeArrived?: string,
  startLoadingTime?: string,
  endLoadingTime?: string,
  actualDeparture?: string
): DispatchOperationalStatus {
  const hasTime = (t?: string) => Boolean(t && t.trim() && t.trim() !== '—');

  if (hasTime(actualDeparture)) {
    return 'DEPARTED';
  }
  if (hasTime(endLoadingTime)) {
    return 'LOADING COMPLETED';
  }
  if (hasTime(startLoadingTime)) {
    return 'LOADING';
  }
  if (hasTime(timeArrived)) {
    return 'ARRIVED';
  }
  return 'READY FOR DISPATCH';
}

/**
 * Determines if an individual delivery has already been encoded/dispatched.
 * A delivery is considered dispatched if isDispatched is explicitly true,
 * or if operational milestone times or dispatch timestamps have been encoded.
 */
export function isDeliveryDispatched(delivery: IndividualDelivery): boolean {
  if (delivery.isDispatched === true) return true;
  if (
    (delivery.timeArrived && delivery.timeArrived.trim() && delivery.timeArrived !== '—') ||
    (delivery.startLoadingTime && delivery.startLoadingTime.trim() && delivery.startLoadingTime !== '—') ||
    (delivery.endLoadingTime && delivery.endLoadingTime.trim() && delivery.endLoadingTime !== '—') ||
    (delivery.actualDeparture && delivery.actualDeparture.trim() && delivery.actualDeparture !== '—') ||
    (delivery.dispatchedAt && delivery.dispatchedAt.trim())
  ) {
    return true;
  }
  return false;
}

/**
 * Converts any user input time (e.g. 1430, 14:30, 2:30 PM, 0815, 8:15 AM)
 * into clean 12-hour AM/PM format (e.g. "02:30 PM", "08:15 AM").
 */
export function formatToAmPm(timeStr?: string): string {
  if (!timeStr || !timeStr.trim() || timeStr.trim() === '—') return '';
  const parsed = parseAndConvertMilitaryTime(timeStr);
  if (parsed.isValid && parsed.time12 && parsed.time12 !== '—') {
    return parsed.time12;
  }
  return timeStr.trim();
}

/**
 * Visual styling and metadata for each operational dispatch status
 */
export function getDispatchStatusInfo(status: DispatchOperationalStatus) {
  switch (status) {
    case 'DEPARTED':
      return {
        label: 'DEPARTED',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        dotClass: 'bg-emerald-600',
      };
    case 'LOADING COMPLETED':
      return {
        label: 'LOADING COMPLETED',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
        dotClass: 'bg-teal-600',
      };
    case 'LOADING':
      return {
        label: 'LOADING',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
        dotClass: 'bg-indigo-600 animate-pulse',
      };
    case 'ARRIVED':
      return {
        label: 'ARRIVED',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        dotClass: 'bg-amber-500',
      };
    case 'READY FOR DISPATCH':
    default:
      return {
        label: 'READY FOR DISPATCH',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
        dotClass: 'bg-blue-500',
      };
  }
}

