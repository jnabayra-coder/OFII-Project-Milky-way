/**
 * POD Notification & Alert System Engine (Prompt 2F-3)
 *
 * Architecture:
 * ACTUAL DELIVERY DATE
 *        ↓
 *   POD LEADTIME
 *        ↓
 * POD RETURN DUE DATE
 *        ↓
 * POD SLA + POD STATUS
 *        ↓
 * ┌─────────────────────────────┐
 * │                             │
 * │  Due Soon → 🟡 Notification │
 * │  Overdue  → 🔴 Notification │
 * │  Returned → 🟢/🔴 Alert     │
 * │                             │
 * └─────────────────────────────┘
 *        ↓
 * ASSIGNED OFFICE / COORDINATOR
 *
 * Rule Mandates:
 * - Strictly consumes existing POD Due Date, POD SLA, and POD Status.
 * - Never calculates independent deadlines.
 * - Prevents duplicate notifications on page refreshes, recalculations, or tab switches.
 * - Generates new events on status transitions (Due Soon -> Overdue -> Returned On Time / Late).
 * - Associates alerts with assigned office/coordinator.
 */

import { 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  PODNotification, 
  PODNotificationType 
} from '../types';
import { getClientAssignedCoordinator } from './dataSync';
import { 
  countWorkingDaysBetween, 
  parseDateOnly, 
  formatExpectedDeliveryDate,
  DEFAULT_REGULAR_HOLIDAYS,
  Holiday 
} from './leadtimeEngine';

/**
 * Evaluates a single Forwarding Progressive Record and returns the active POD notification event (if applicable).
 */
export function evaluateRecordPodNotification(
  record: ForwardingProgressiveRecord,
  clients: ClientSummary[] = [],
  currentDate?: string | Date | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): {
  type: PODNotificationType;
  title: string;
  message: string;
  dedupKey: string;
  coordinator: string;
} | null {
  if (record.isDeleted) return null;

  const cleanDeliveryDate = parseDateOnly(record.actualDeliveryDate);
  // Undelivered shipment: POD monitoring has not started
  if (!cleanDeliveryDate) return null;

  const dueDate = parseDateOnly(record.podReturnDueDate);
  if (!dueDate) return null;

  const returnDate = parseDateOnly(record.dateOfPodReturn);
  const todayStr = parseDateOnly(currentDate) || new Date().toISOString().split('T')[0];

  const assignedCoordinator = getClientAssignedCoordinator(
    clients,
    record.client,
    record.coordinator || 'Alodia Manalansan'
  );

  const clientName = record.client || 'Client';
  const refOrPod = record.referenceNumber || record.podNumber || `REC-${record.id.slice(-6)}`;
  const formattedDueDate = record.podReturnDueDateFormatted || formatExpectedDeliveryDate(dueDate) || dueDate;

  // ─────────────────────────────────────────────────────────────
  // CONDITION 1: ACTUAL POD RETURN DATE EXISTS (RETURNED)
  // ─────────────────────────────────────────────────────────────
  if (returnDate) {
    // Exact due date return (returnDate <= dueDate) or SLA = HIT -> ON TIME
    if (returnDate <= dueDate || record.podPerformance === 'HIT' || record.podStatus === 'POD On Time') {
      return {
        type: 'POD_RETURNED_ONTIME',
        title: '🟢 POD Returned On Time',
        message: `POD for ${clientName} (${refOrPod}) has been returned within the required deadline.`,
        dedupKey: `${record.id}_POD_RETURNED_ONTIME`,
        coordinator: assignedCoordinator,
      };
    }

    // Returned after due date (returnDate > dueDate) -> RETURNED LATE
    return {
      type: 'POD_RETURNED_LATE',
      title: '🔴 POD Returned Late',
      message: `POD for ${clientName} (${refOrPod}) was returned after the required deadline (Due: ${formattedDueDate}, Returned: ${returnDate}).`,
      dedupKey: `${record.id}_POD_RETURNED_LATE`,
      coordinator: assignedCoordinator,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CONDITION 2: NO ACTUAL POD RETURN DATE (PENDING RETURN)
  // ─────────────────────────────────────────────────────────────
  // 2A. Overdue: Current Date > POD Return Due Date
  if (todayStr > dueDate) {
    return {
      type: 'POD_OVERDUE',
      title: '🔴 POD Overdue',
      message: `POD for ${clientName} (${refOrPod}) is already past its return deadline of ${formattedDueDate}.`,
      dedupKey: `${record.id}_POD_OVERDUE`,
      coordinator: assignedCoordinator,
    };
  }

  // 2B. Approaching Due: Current Date <= POD Return Due Date
  // Check if within 1 to 2 working days of due date (or due today/tomorrow)
  const daysRemaining = countWorkingDaysBetween(todayStr, dueDate, customHolidays).workingDays;
  const isDueTomorrowOrSoon = daysRemaining <= 2 || todayStr === dueDate;

  if (isDueTomorrowOrSoon) {
    const isDueToday = todayStr === dueDate;
    const alertTitle = isDueToday ? '🟡 POD Due Today' : '🟡 POD Due Tomorrow';

    return {
      type: 'POD_DUE_SOON',
      title: alertTitle,
      message: `POD for ${clientName} (${refOrPod}) is due for return on ${formattedDueDate}.`,
      dedupKey: `${record.id}_POD_DUE_SOON`,
      coordinator: assignedCoordinator,
    };
  }

  return null;
}

/**
 * Synchronizes the complete list of POD notifications across all Forwarding Records.
 * 
 * Guarantees:
 * 1. Zero duplication: Preserves existing notifications by matching their `dedupKey`.
 * 2. Preserves Read/Unread state: If a notification was marked read, it stays read.
 * 3. Status Transitions: When a record moves from Due Soon -> Overdue or Overdue -> Returned,
 *    a new notification event is seamlessly generated without overwriting read history.
 */
export function syncPodNotifications(
  records: ForwardingProgressiveRecord[],
  clients: ClientSummary[] = [],
  existingNotifications: PODNotification[] = [],
  currentDate?: string | Date | null,
  customHolidays: Holiday[] = DEFAULT_REGULAR_HOLIDAYS
): PODNotification[] {
  const existingMap = new Map<string, PODNotification>();
  existingNotifications.forEach((n) => {
    existingMap.set(n.dedupKey, n);
    existingMap.set(n.id, n);
  });

  const synchronized: PODNotification[] = [];
  const activeDedupKeys = new Set<string>();

  for (const record of records) {
    if (record.isDeleted) continue;

    const evaluation = evaluateRecordPodNotification(record, clients, currentDate, customHolidays);
    if (!evaluation) continue;

    activeDedupKeys.add(evaluation.dedupKey);

    const existing = existingMap.get(evaluation.dedupKey);
    if (existing) {
      // Preserve existing read state, createdAt, and unique ID
      synchronized.push({
        ...existing,
        title: evaluation.title,
        message: evaluation.message,
        coordinator: evaluation.coordinator,
        client: record.client,
        clientId: record.clientId,
        referenceNumber: record.referenceNumber,
        podNumber: record.podNumber,
        consignee: record.consignee,
        destination: record.destination || record.destinationCode,
        area: record.area,
        actualDeliveryDate: record.actualDeliveryDate,
        podReturnDueDate: record.podReturnDueDate,
        podReturnDueDateFormatted: record.podReturnDueDateFormatted,
        actualPodReturnDate: record.dateOfPodReturn,
        podSla: record.podPerformance,
        podStatus: record.podStatus,
      });
    } else {
      // Create new unread notification event
      const newNotif: PODNotification = {
        id: `NOTIF-POD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
        dedupKey: evaluation.dedupKey,
        type: evaluation.type,
        title: evaluation.title,
        message: evaluation.message,
        recordId: record.id,
        client: record.client,
        clientId: record.clientId,
        coordinator: evaluation.coordinator,
        referenceNumber: record.referenceNumber,
        podNumber: record.podNumber,
        consignee: record.consignee,
        destination: record.destination || record.destinationCode,
        area: record.area,
        actualDeliveryDate: record.actualDeliveryDate,
        podReturnDueDate: record.podReturnDueDate,
        podReturnDueDateFormatted: record.podReturnDueDateFormatted,
        actualPodReturnDate: record.dateOfPodReturn,
        podSla: record.podPerformance,
        podStatus: record.podStatus,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      synchronized.push(newNotif);
    }
  }

  // Also retain any prior historical notifications or special events (e.g. DELIVERY_COMPLETED)
  for (const existing of existingNotifications) {
    if (existing.type === 'DELIVERY_COMPLETED' || !activeDedupKeys.has(existing.dedupKey)) {
      // Keep completed/historical notifications if already read or existing in history
      if (!synchronized.some((s) => s.id === existing.id || s.dedupKey === existing.dedupKey)) {
        synchronized.push(existing);
      }
    }
  }

  // Sort: Unread first, then by createdAt descending
  return synchronized.sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
