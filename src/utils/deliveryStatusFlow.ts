import { IndividualDelivery, TruckRun } from '../types';

export type CanonicalDeliveryStatus =
  | 'CREATED'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'READY FOR DISPATCH'
  | 'ARRIVED'
  | 'LOADING'
  | 'LOADING COMPLETED'
  | 'DEPARTED'
  | 'IN TRANSIT'
  | 'DELIVERED'
  | 'POD PENDING'
  | 'POD RETURNED'
  | 'COMPLETED';

export const CANONICAL_DELIVERY_STATUS_FLOW: CanonicalDeliveryStatus[] = [
  'CREATED',
  'PLANNED',
  'ASSIGNED',
  'READY FOR DISPATCH',
  'ARRIVED',
  'LOADING',
  'LOADING COMPLETED',
  'DEPARTED',
  'IN TRANSIT',
  'DELIVERED',
  'POD PENDING',
  'POD RETURNED',
  'COMPLETED',
];

const STATUS_STAGE_MAP: Record<string, number> = {
  CREATED: 0,
  'PENDING ASSIGNMENT': 0,
  PLANNED: 1,
  'ASSIGNED TO TRUCK RUN': 1,
  ASSIGNED: 2,
  'READY FOR DISPATCH': 3,
  ARRIVED: 4,
  LOADING: 5,
  'IN LOADING': 5,
  'LOADING COMPLETED': 6,
  DEPARTED: 7,
  'IN TRANSIT': 8,
  DELIVERED: 9,
  'POD PENDING': 10,
  'PENDING RETURN': 10,
  'POD RETURNED': 11,
  RETURNED: 11,
  COMPLETED: 12,
};

/**
 * Normalizes any legacy or operational status string to a CanonicalDeliveryStatus.
 */
export function normalizeDeliveryStatus(rawStatus?: string): CanonicalDeliveryStatus {
  if (!rawStatus) return 'CREATED';
  const clean = rawStatus.trim().toUpperCase();

  switch (clean) {
    case 'CREATED':
    case 'PENDING ASSIGNMENT':
    case 'PENDING':
    case 'BOOKED':
      return 'CREATED';

    case 'PLANNED':
    case 'ASSIGNED TO TRUCK RUN':
      return 'PLANNED';

    case 'ASSIGNED':
      return 'ASSIGNED';

    case 'READY FOR DISPATCH':
    case 'READY':
      return 'READY FOR DISPATCH';

    case 'ARRIVED':
    case 'ARRIVED AT HUB':
      return 'ARRIVED';

    case 'LOADING':
    case 'IN LOADING':
      return 'LOADING';

    case 'LOADING COMPLETED':
    case 'LOADED':
      return 'LOADING COMPLETED';

    case 'DEPARTED':
      return 'DEPARTED';

    case 'IN TRANSIT':
    case 'OUT FOR DELIVERY':
      return 'IN TRANSIT';

    case 'DELIVERED':
      return 'DELIVERED';

    case 'POD PENDING':
    case 'PENDING RETURN':
    case 'POD ON TIME':
    case 'POD DELAYED':
      return 'POD PENDING';

    case 'POD RETURNED':
    case 'RETURNED':
    case 'TRANSMITTED':
      return 'POD RETURNED';

    case 'COMPLETED':
      return 'COMPLETED';

    default:
      return 'CREATED';
  }
}

/**
 * Returns numeric rank of a status in the delivery pipeline.
 */
export function getDeliveryStatusRank(status?: string): number {
  if (!status) return 0;
  const canonical = normalizeDeliveryStatus(status);
  return STATUS_STAGE_MAP[canonical] ?? 0;
}

/**
 * Checks if status A is at or after status B in the flow.
 */
export function isStatusAtLeast(currentStatus: string | undefined, targetStatus: CanonicalDeliveryStatus): boolean {
  return getDeliveryStatusRank(currentStatus) >= getDeliveryStatusRank(targetStatus);
}

/**
 * Derives the active synchronized status of an Individual Delivery given its attributes
 * and its parent Truck Run (if any).
 */
export function deriveSynchronizedDeliveryStatus(
  delivery: Partial<IndividualDelivery>,
  truckRun?: Partial<TruckRun>
): CanonicalDeliveryStatus {
  // 1. Explicit COMPLETED
  if (
    delivery.deliveryStatus === 'COMPLETED' || 
    delivery.status === 'COMPLETED'
  ) {
    return 'COMPLETED';
  }

  // 2. Physical POD return complete / POD RETURNED
  if (
    delivery.deliveryStatus === 'POD RETURNED' ||
    delivery.status === 'POD RETURNED' ||
    delivery.podStatus === 'POD RETURNED' ||
    delivery.podReturnDate ||
    (delivery as any).dateOfPodReturn
  ) {
    // If delivery is explicitly marked COMPLETED or both returned and finalized
    if (delivery.deliveryStatus === 'COMPLETED' || delivery.status === 'COMPLETED') {
      return 'COMPLETED';
    }
    return 'POD RETURNED';
  }

  // 3. POD Pending (awaiting physical POD return)
  if (
    delivery.deliveryStatus === 'POD PENDING' ||
    delivery.status === 'POD PENDING' ||
    delivery.podStatus === 'POD PENDING' ||
    delivery.podStatus === 'PENDING'
  ) {
    return 'POD PENDING';
  }

  // 3. Driver confirmed delivery
  const isDelivered = Boolean(
    delivery.actualDeliveryDate ||
    delivery.dateReceived ||
    delivery.deliveryStatus === 'DELIVERED' ||
    delivery.status === 'Delivered' ||
    delivery.status === 'DELIVERED' ||
    delivery.driverProgressStatus === 'Delivered'
  );

  if (isDelivered) {
    return 'DELIVERED';
  }

  // 4. Driver progress in transit
  if (
    delivery.driverProgressStatus === 'In Transit' ||
    delivery.driverProgressStatus === 'Out for Delivery' ||
    delivery.status === 'In Transit' ||
    delivery.status === 'IN TRANSIT' ||
    delivery.deliveryStatus === 'IN TRANSIT'
  ) {
    return 'IN TRANSIT';
  }

  // 5. Operational Dispatcher stage (from TruckRun or Delivery)
  const opStatus = delivery.dispatchOperationalStatus || truckRun?.dispatchOperationalStatus;
  const actualDeparture = delivery.actualDeparture || truckRun?.actualDeparture;
  const endLoading = delivery.endLoadingTime || truckRun?.endLoadingTime;
  const startLoading = delivery.startLoadingTime || truckRun?.startLoadingTime;
  const timeArrived = delivery.timeArrived || truckRun?.timeArrived;

  if (actualDeparture && actualDeparture.trim()) {
    return 'DEPARTED';
  }
  if (opStatus === 'DEPARTED') {
    return 'DEPARTED';
  }

  if (endLoading && endLoading.trim()) {
    return 'LOADING COMPLETED';
  }
  if (opStatus === 'LOADING COMPLETED') {
    return 'LOADING COMPLETED';
  }

  if (startLoading && startLoading.trim()) {
    return 'LOADING';
  }
  if (opStatus === 'LOADING') {
    return 'LOADING';
  }

  if (timeArrived && timeArrived.trim()) {
    return 'ARRIVED';
  }
  if (opStatus === 'ARRIVED') {
    return 'ARRIVED';
  }

  // 6. Truck Run readiness
  const isTruckReady = 
    truckRun?.status === 'Ready for Dispatch' ||
    delivery.status === 'READY FOR DISPATCH' ||
    delivery.deliveryStatus === 'READY FOR DISPATCH' ||
    opStatus === 'READY FOR DISPATCH';

  if (isTruckReady) {
    return 'READY FOR DISPATCH';
  }

  // 7. Driver assignment
  const assignedDriver = delivery.driver || delivery.assignedDriverId || truckRun?.driver;
  const hasAssignedDriver = Boolean(assignedDriver && assignedDriver.trim() !== '' && assignedDriver !== 'Unassigned');

  if (hasAssignedDriver) {
    return 'ASSIGNED';
  }

  // 8. Added to Truck Run (Planned)
  if (delivery.truckRunId || (truckRun && truckRun.id)) {
    return 'PLANNED';
  }

  // 9. Newly created delivery
  return 'CREATED';
}

/**
 * Returns Tailwind badge styling for each status in the pipeline.
 */
export function getDeliveryStatusBadge(status?: string): {
  label: CanonicalDeliveryStatus;
  badgeClass: string;
  pillBg: string;
  dotColor: string;
} {
  const canonical = normalizeDeliveryStatus(status);

  switch (canonical) {
    case 'CREATED':
      return {
        label: 'CREATED',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        pillBg: 'bg-slate-50',
        dotColor: 'bg-slate-400',
      };
    case 'PLANNED':
      return {
        label: 'PLANNED',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
        pillBg: 'bg-blue-50/50',
        dotColor: 'bg-blue-500',
      };
    case 'ASSIGNED':
      return {
        label: 'ASSIGNED',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
        pillBg: 'bg-indigo-50/50',
        dotColor: 'bg-indigo-500',
      };
    case 'READY FOR DISPATCH':
      return {
        label: 'READY FOR DISPATCH',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
        pillBg: 'bg-teal-50/50',
        dotColor: 'bg-teal-500',
      };
    case 'ARRIVED':
      return {
        label: 'ARRIVED',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        pillBg: 'bg-amber-50/50',
        dotColor: 'bg-amber-500',
      };
    case 'LOADING':
      return {
        label: 'LOADING',
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 animate-pulse',
        pillBg: 'bg-orange-50/50',
        dotColor: 'bg-orange-500',
      };
    case 'LOADING COMPLETED':
      return {
        label: 'LOADING COMPLETED',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
        pillBg: 'bg-purple-50/50',
        dotColor: 'bg-purple-500',
      };
    case 'DEPARTED':
      return {
        label: 'DEPARTED',
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300',
        pillBg: 'bg-cyan-50/50',
        dotColor: 'bg-cyan-500',
      };
    case 'IN TRANSIT':
      return {
        label: 'IN TRANSIT',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
        pillBg: 'bg-sky-50/50',
        dotColor: 'bg-sky-500',
      };
    case 'DELIVERED':
      return {
        label: 'DELIVERED',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        pillBg: 'bg-emerald-50/50',
        dotColor: 'bg-emerald-500',
      };
    case 'POD PENDING':
      return {
        label: 'POD PENDING',
        badgeClass: 'bg-yellow-50 text-yellow-900 border-yellow-400',
        pillBg: 'bg-yellow-50/50',
        dotColor: 'bg-yellow-500',
      };
    case 'POD RETURNED':
      return {
        label: 'POD RETURNED',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400',
        pillBg: 'bg-emerald-100/50',
        dotColor: 'bg-emerald-600',
      };
    case 'COMPLETED':
      return {
        label: 'COMPLETED',
        badgeClass: 'bg-green-100 text-green-950 border-green-500 font-extrabold',
        pillBg: 'bg-green-100/60',
        dotColor: 'bg-green-600',
      };
  }
}
