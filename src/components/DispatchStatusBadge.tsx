import React from 'react';
import { DispatchOperationalStatus } from '../types';
import { getDispatchStatusInfo } from '../utils/dispatchUtils';

interface DispatchStatusBadgeProps {
  status: DispatchOperationalStatus;
  className?: string;
}

/**
 * Reusable Dispatch Status Badge Component for operational delivery status.
 * Visual representation of the 5 operational dispatch statuses:
 * - READY FOR DISPATCH
 * - ARRIVED
 * - LOADING
 * - LOADING COMPLETED
 * - DEPARTED
 */
export const DispatchStatusBadge: React.FC<DispatchStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const info = getDispatchStatusInfo(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider whitespace-nowrap shadow-2xs border ${info.badgeClass} ${className}`}
      title={`Operational Dispatch Status: ${info.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
      <span>{info.label}</span>
    </span>
  );
};
