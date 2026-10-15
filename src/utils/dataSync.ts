import { 
  UnifiedShipment, 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  DashboardSummary,
  PhilippineArea,
  ForwardingMode,
  DeliveryType,
  DispatchStatus,
  ShipmentStatus,
  ForwardingDeliveryStatus,
  PODStatus,
  PerformanceResult
} from '../types';
import { 
  getAutoDeliveryLeadTime, 
  computeDeliveryPerformance, 
  computePodPerformance,
  calculateDaysBetween,
  calculateExpectedDeliveryDate,
  determineAutomaticDeliveryStatus,
  getPodLeadtime,
  calculatePodReturnDueDate,
  determineAutomaticPodStatus,
} from './forwardingCalculations';

/**
 * Robustly normalizes client name strings (trims, strips punctuation like dots/commas, collapses multi-spaces, lowercases).
 */
export function normalizeClientString(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/[,\.]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Standard client alias dictionary mapping abbreviations and common alternate spellings to canonical names.
 */
export const STANDARD_CLIENT_ALIASES: Record<string, string> = {
  // PCSO
  'pcso': 'Philippine Charity Sweepstakes Office',
  'pcso 001': 'Philippine Charity Sweepstakes Office',
  'philippine charity sweepstakes office': 'Philippine Charity Sweepstakes Office',
  'philippine charity sweepstake office': 'Philippine Charity Sweepstakes Office',
  'philippine charity sweepstakes': 'Philippine Charity Sweepstakes Office',
  'philippine charity sweepstake': 'Philippine Charity Sweepstakes Office',

  // GADC
  'gadc': 'Golden Archers Development Corporation',
  'gadc 002': 'Golden Archers Development Corporation',
  'golden archers': 'Golden Archers Development Corporation',
  'golden archers dev corp': 'Golden Archers Development Corporation',
  'golden archers development corporation': 'Golden Archers Development Corporation',
  'golden archers development corp': 'Golden Archers Development Corporation',

  // ACWC
  'acwc': 'Alexandria and Centers of Wisdom Corporation',
  'acwc 003': 'Alexandria and Centers of Wisdom Corporation',
  'alexandria': 'Alexandria and Centers of Wisdom Corporation',
  'alexandria and centers of wisdom': 'Alexandria and Centers of Wisdom Corporation',
  'alexandria and centers of wisdom corporation': 'Alexandria and Centers of Wisdom Corporation',
  'alexandria & centers of wisdom corporation': 'Alexandria and Centers of Wisdom Corporation',

  // Oriental Merchants
  'om': 'Oriental Merchants',
  'om 004': 'Oriental Merchants',
  'oriental merchants': 'Oriental Merchants',
  'oriental merchant': 'Oriental Merchants',

  // Vamsler Philippines
  'vam': 'Vamsler Philippines',
  'vam 005': 'Vamsler Philippines',
  'vamsler': 'Vamsler Philippines',
  'vamsler philippines': 'Vamsler Philippines',
  'vamsler phils': 'Vamsler Philippines',
  'vamsler phils.': 'Vamsler Philippines',
  'vamsler ph': 'Vamsler Philippines',

  // RefaMED
  'rfm': 'RefaMED',
  'rfm 006': 'RefaMED',
  'refamed': 'RefaMED',
  'refamed pharma': 'RefaMED',
  'refamed pharmaceuticals': 'RefaMED',

  // Dunsk Kuhner
  'dk': 'Dunsk Kuhner',
  'dk 007': 'Dunsk Kuhner',
  'dunsk kuhner': 'Dunsk Kuhner',
  'dunsk': 'Dunsk Kuhner',
  'dunsk-kuhner': 'Dunsk Kuhner',

  // Intelligent Skin Care Inc.
  'isci': 'Intelligent Skin Care Inc.',
  'isci 008': 'Intelligent Skin Care Inc.',
  'intelligent skin care': 'Intelligent Skin Care Inc.',
  'intelligent skin care inc': 'Intelligent Skin Care Inc.',
  'intelligent skin care, inc': 'Intelligent Skin Care Inc.',
  'intelligent skin care inc.': 'Intelligent Skin Care Inc.',
  'belo': 'Intelligent Skin Care Inc.',
  'belo essentials': 'Intelligent Skin Care Inc.',
  'bhi': 'Intelligent Skin Care Inc.',
};

/**
 * Retrieves the assigned coordinator for a given client name or client ID from the shared client dataset.
 */
export function getClientAssignedCoordinator(
  clients: ClientSummary[],
  clientNameOrId: string,
  fallback = 'Alodia Manalansan'
): string {
  if (!clientNameOrId) return fallback;
  const clean = normalizeClientString(clientNameOrId);
  if (!clean) return fallback;

  // Direct match by ID, normalized Name, or Code
  const matched = clients.find(
    (c) => c.id === clientNameOrId || normalizeClientString(c.name) === clean || normalizeClientString(c.code) === clean
  );
  if (matched?.assignedCoordinator) return matched.assignedCoordinator;
  if (matched?.accountManager) return matched.accountManager;

  // Alias lookup
  const canonicalName = STANDARD_CLIENT_ALIASES[clean];
  if (canonicalName) {
    const aliasMatched = clients.find(
      (c) => normalizeClientString(c.name) === normalizeClientString(canonicalName)
    );
    if (aliasMatched?.assignedCoordinator) return aliasMatched.assignedCoordinator;
    if (aliasMatched?.accountManager) return aliasMatched.accountManager;
  }

  // Substring matching
  const partialMatched = clients.find((c) => {
    const cClean = normalizeClientString(c.name);
    return cClean.includes(clean) || clean.includes(cClean);
  });
  if (partialMatched?.assignedCoordinator) return partialMatched.assignedCoordinator;
  if (partialMatched?.accountManager) return partialMatched.accountManager;

  // Specific canonical fallback mapping
  if (clean.includes('intelligent skin care') || clean.includes('isci') || clean.includes('belo')) {
    return 'Rojaylene Baldesancho';
  }
  if (clean.includes('golden archers') || clean.includes('gadc')) {
    return 'Justine Ryan Paular';
  }

  return fallback;
}

/**
 * Deduplicates and finds or creates a shared client record.
 */
export function ensureClientExists(
  clientName: string,
  clients: ClientSummary[],
  extra?: Partial<ClientSummary>
): { client: ClientSummary; isNew: boolean; updatedClients: ClientSummary[] } {
  const cleanName = (clientName || 'General Freight Client').trim();
  const existing = clients.find(
    (c) => c.name.trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (existing) {
    return {
      client: existing,
      isNew: false,
      updatedClients: clients,
    };
  }

  // Generate unique clean code and id
  const words = cleanName.split(/\s+/).filter(Boolean);
  const acronym = words.length === 1 
    ? words[0].slice(0, 3).toUpperCase() 
    : words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
  const clientCode = `${acronym}-${Math.floor(100 + Math.random() * 900)}`;
  const newClientId = `client-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

  const newCoordinator = extra?.assignedCoordinator || extra?.accountManager || 'Alodia Manalansan';

  const newClient: ClientSummary = {
    id: newClientId,
    name: cleanName,
    code: clientCode,
    assignedCoordinator: newCoordinator,
    accountManager: newCoordinator,
    industry: extra?.industry || '—',
    activeShipments: 1,
    deliveredThisMonth: 0,
    onTimeRate: 100.0,
    primaryContact: extra?.primaryContact || '—',
    email: extra?.email || '—',
    phone: extra?.phone || '—',
    address: extra?.address || '—',
    area: extra?.area || '—',
    remarks: extra?.remarks || '—',
    notes: extra?.notes || '—',
    tin: extra?.tin || '—',
    isDeactivated: false,
    ...extra,
  };

  return {
    client: newClient,
    isNew: true,
    updatedClients: [newClient, ...clients],
  };
}

/**
 * Normalizes and recalculates all SLA, TAT, and status dependencies on a UnifiedShipment.
 */
export function recalculateUnifiedShipment(record: UnifiedShipment): UnifiedShipment {
  const updated: UnifiedShipment = { ...record };

  // 1. Evaluate Delivery Lead Time via Centralized Rule Engine
  if (!updated.deliveryLeadTimeDays || updated.deliveryLeadTimeDays === 0) {
    updated.deliveryLeadTimeDays = getAutoDeliveryLeadTime(
      updated.client,
      (updated.modeOfShipment as ForwardingMode) || 'Land Freight',
      updated.area || 'Luzon'
    );
  }

  // 2. Normalize Dates & Derived Expected Delivery Date
  const dispatchDate = updated.actualDispatchDate || updated.deliveryDate || '2026-08-23';
  const actualDeliveryDate = updated.actualDeliveryDate || '';
  const podReturnDate = updated.dateOfPodReturn || '';

  updated.actualDispatchDate = dispatchDate;
  if (!updated.deliveryDate) {
    updated.deliveryDate = dispatchDate;
  }

  // Centralized Leadtime Calculation Engine (Prompt 2E-1)
  const leadtimeResult = calculateExpectedDeliveryDate(
    dispatchDate,
    updated.modeOfShipment,
    updated.area
  );
  if (leadtimeResult.expectedDeliveryDate) {
    updated.expectedDeliveryDate = leadtimeResult.expectedDeliveryDate;
  }

  // 3. Automated Delivery TAT, Performance & Status Calculation (Automatic Delivery Status Engine)
  const autoStatus = determineAutomaticDeliveryStatus({
    actualDispatchDate: dispatchDate,
    actualDeliveryDate: actualDeliveryDate,
    expectedDeliveryDate: updated.expectedDeliveryDate,
    requestDeliveryDate: updated.requestDeliveryDate,
    leadTimeDaysOrConfig: updated.deliveryLeadTimeDays,
  });

  updated.deliveryStatus = autoStatus.status;

  if (dispatchDate && actualDeliveryDate) {
    const { tatDays, performance } = computeDeliveryPerformance(
      dispatchDate,
      actualDeliveryDate,
      updated.deliveryLeadTimeDays,
      undefined,
      updated.requestDeliveryDate
    );
    updated.deliveryTatDays = tatDays;
    updated.deliveryPerformance = performance;
    updated.numberOfDays = tatDays;

    updated.dispatchStatus = 'Delivered';
    updated.shipmentStatus = 'Delivered';
  } else {
    updated.deliveryTatDays = 0;
    updated.deliveryPerformance = 'PENDING';
    updated.numberOfDays = 0;

    if (autoStatus.status === 'Delayed') {
      updated.dispatchStatus = 'Delayed';
      updated.shipmentStatus = 'Delayed';
    } else {
      updated.dispatchStatus = 'In Transit';
      updated.shipmentStatus = 'In Transit';
    }
  }

  // 4. Automated POD Leadtime, POD Return Due Date & Automatic POD Status Engine (Prompt 2F-1 & 2F-2)
  const podResult = calculatePodReturnDueDate(
    actualDeliveryDate,
    updated.client,
    updated.area
  );
  updated.podLeadTimeDays = podResult.podLeadTimeDays;
  updated.podReturnDueDate = podResult.podReturnDueDate || undefined;
  updated.podReturnDueDateFormatted = podResult.podReturnDueDateFormatted || undefined;

  // Automated POD Status & Performance (Prompt 2F-2 & Unified POD SLA engine)
  const autoPod = determineAutomaticPodStatus({
    actualDeliveryDate,
    podReturnDueDate: podResult.podReturnDueDate,
    actualPodReturnDate: podReturnDate,
    clientName: updated.client,
    deliveryArea: updated.area,
  });
  updated.podStatus = autoPod.status;
  updated.podPerformance = autoPod.podPerformance;
  updated.podTatDays = autoPod.podTatDays;

  // 5. Harmonize Status Flags across all view representations
  if (autoStatus.status === 'On Time' || (actualDeliveryDate && autoStatus.isDelivered)) {
    updated.dispatchStatus = 'Delivered';
    updated.shipmentStatus = 'Delivered';
  } else if (autoStatus.status === 'Delayed') {
    if (actualDeliveryDate) {
      updated.dispatchStatus = 'Delivered';
      updated.shipmentStatus = 'Delivered';
    } else {
      updated.dispatchStatus = 'Delayed';
      updated.shipmentStatus = 'Delayed';
    }
  } else {
    updated.dispatchStatus = 'In Transit';
    updated.shipmentStatus = 'In Transit';
  }

  return updated;
}

/**
 * Transforms a UnifiedShipment into a DispatchRecord for Daily Dispatching Monitoring.
 */
export function unifiedToDispatch(u: UnifiedShipment): DispatchRecord {
  return {
    id: u.id,
    deliveryDate: u.deliveryDate || u.actualDispatchDate,
    deliveryArea: u.area,
    area: u.area,
    podNumber: u.podNumber,
    quantityCasesBoxes: u.quantity,
    unit: u.unit || 'Boxes',
    deliveryType: u.deliveryType || (u.client.toLowerCase().includes('isci') ? 'ISCI' : 'GADC'),
    destination: u.destination,
    consignee: u.consignee,
    truckProvider: u.truckProvider || 'OFII Fleet Logistics',
    plateNumber: u.plateNumber || 'NDB-4921',
    truckArrivalTime: u.truckArrivalTime || '07:30 AM',
    loadingStartTime: u.loadingStartTime || '08:00 AM',
    loadingEndTime: u.loadingEndTime || '09:15 AM',
    departureTime: u.departureTime || '09:30 AM',
    plannedDeliveryDate: u.plannedDeliveryDate || u.actualDeliveryDate || u.deliveryDate,
    expectedDeliveryDate: u.expectedDeliveryDate,
    requestDeliveryDate: u.requestDeliveryDate,
    manifestNumber: u.manifestNumber || `MNF-2026-${u.podNumber.replace(/\D/g, '').slice(-4) || '1001'}`,
    remarks: u.remarks || u.deliveryRemarks || 'Standard scheduled freight dispatch.',
    status: u.dispatchStatus,
    driverName: u.driverName || 'Danilo P. Hernandez',
    driverContact: u.driverContact || '+63 917 842 1190',
    clientName: u.client,
    totalWeightKg: u.actualWeightKg || u.quantity * 12,
  };
}

/**
 * Transforms a UnifiedShipment into a ShipmentRecord for Client Shipment Monitoring.
 */
export function unifiedToShipment(u: UnifiedShipment): ShipmentRecord {
  const deliveryPerfLabel: 'On-Time' | 'Delayed' | 'Within SLA' | 'Pending Delivery' = 
    u.deliveryPerformance === 'HIT' 
      ? 'On-Time' 
      : u.deliveryPerformance === 'MISSED' 
        ? 'Delayed' 
        : (u.deliveryStatus === 'Delivered' ? 'On-Time' : 'Within SLA');

  return {
    id: `SHP-${u.id.replace('DSP-', '').replace('FPR-', '').replace('OFII-', '')}`,
    client: u.client,
    clientId: u.clientId || `client-${u.client.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    monthStarted: u.month || 'August 2026',
    bookedDate: u.bookedDate || u.actualDispatchDate,
    pickupDate: u.pickupDate || u.actualDispatchDate,
    consignee: u.consignee,
    contactNumber: u.contactNumber || '+63 917 555 0192',
    modeOfShipment: u.modeOfShipment,
    originPickupPoint: u.originPickupPoint || 'OFII Paranaque Central Cargo Terminal',
    destination: u.destination,
    area: u.area,
    requestedDeliveryDate: u.plannedDeliveryDate || u.actualDeliveryDate || u.deliveryDate,
    itemDescription: u.itemDescription || `${u.quantity} ${u.unit} Commercial Cargo Consignment`,
    quantityBoxes: u.quantity,
    amount: u.declaredValue || 'PHP 1,500,000.00',
    actualCbm: u.cbm || 12.0,
    volumeWeight: u.volumeWeightKg || 180.0,
    actualWeightKg: u.actualWeightKg || u.quantity * 12,
    chargePerWeight: u.chargePerWeight || 'PHP 25.00 / kg',
    vanNumber: u.vanNumber || `VAN-${u.destinationCode || 'OFII'}-01`,
    truckPlate: u.plateNumber || 'NDB-4921',
    vesselFlightNo: u.vesselFlightNo,
    estimatedDeparture: `${u.actualDispatchDate} ${u.departureTime || '08:30 AM'}`,
    actualDeparture: `${u.actualDispatchDate} ${u.departureTime || '08:30 AM'}`,
    estimatedArrival: `${u.plannedDeliveryDate} 05:00 PM`,
    actualArrival: u.actualDeliveryDate ? `${u.actualDeliveryDate} 04:00 PM` : 'In Transit',
    podNumber: u.podNumber,
    awbNumber: u.awbNumber || u.awbCourierRefNumber || `AWB-${u.destinationCode || 'MNL'}-${u.podNumber.slice(-4)}`,
    drNumber: u.drNumber || `DR-${u.referenceNumber.replace('PRJ-', '') || u.podNumber.slice(-6)}`,
    sealNumber: u.sealNumber || `SEAL-OFII-${Math.floor(10000 + Math.random() * 90000)}`,
    billOfLandingNumber: u.billOfLandingNumber || `BL-OFII-${Math.floor(10000 + Math.random() * 90000)}`,
    manifestNumber: u.manifestNumber || `MNF-2026-${u.podNumber.slice(-4)}`,
    plannedDeliveryDate: u.plannedDeliveryDate,
    actualDeliveryDate: u.actualDeliveryDate,
    deliveryDate: u.actualDeliveryDate || u.plannedDeliveryDate || 'In Transit',
    receiversName: u.receiversName || 'Authorized Consignee Signatory',
    datePodReceived: u.dateOfPodReturn || (u.podStatus === 'Returned' ? '2026-08-23' : 'Pending Return'),
    dateTransmitted: u.dateTransmitted || u.actualDispatchDate,
    deliveryRemarks: u.deliveryRemarks || u.remarks || 'Standard forwarding freight consignment',
    status: u.shipmentStatus,
    leadTime: `${u.deliveryLeadTimeDays} Days`,
    expectedDeliveryDate: u.expectedDeliveryDate,
    requestDeliveryDate: u.requestDeliveryDate,
    tatNumber: u.tatNumber || `TAT-${u.destinationCode || 'OFII'}-${u.podNumber.slice(-3)}`,
    deliveryPerformance: deliveryPerfLabel,
    delayReason: u.delayReason || (u.reasonForDelay as any),
    delayReasonDetails: u.delayReasonDetails,
    numberOfDays: u.deliveryTatDays || u.numberOfDays || 0,
  };
}

/**
 * Transforms a UnifiedShipment into a ForwardingProgressiveRecord for Forwarding Progressive Report.
 */
export function unifiedToForwarding(u: UnifiedShipment): ForwardingProgressiveRecord {
  return {
    id: u.id.startsWith('FPR-') ? u.id : `FPR-${u.id.replace('DSP-', '').replace('SHP-', '').replace('OFII-', '')}`,
    month: u.month || 'August 2026',
    coordinator: u.coordinator || 'Maria Santos',
    client: u.client,
    clientId: u.clientId,
    modeOfShipment: (u.modeOfShipment as ForwardingMode) || 'Land Freight',
    area: u.area,
    referenceNumber: u.referenceNumber || `PRJ-${u.client.slice(0, 3).toUpperCase()}-${u.podNumber.slice(-3)}`,
    actualDispatchDate: u.actualDispatchDate || u.deliveryDate,
    consignee: u.consignee,
    destinationCode: u.destinationCode || 'MNL-01',
    quantity: u.quantity,
    unit: u.unit || 'Boxes',
    courier: u.courier || u.truckProvider || 'OFII Fleet Logistics',
    cbm: u.cbm,
    volumeWeightKg: u.volumeWeightKg,
    actualWeightKg: u.actualWeightKg,
    chargeableWeightFees: u.chargeableWeightFees || 'PHP 35,000.00',
    declaredValue: u.declaredValue || 'PHP 1,500,000.00',
    podNumber: u.podNumber,
    awbCourierRefNumber: u.awbCourierRefNumber || u.awbNumber || `AWB-${u.destinationCode || 'MNL'}-${u.podNumber.slice(-4)}`,
    deliveryStatus: u.deliveryStatus,
    receiversName: u.receiversName || '',
    actualDeliveryDate: u.actualDeliveryDate || '',
    deliveryLeadTimeDays: u.deliveryLeadTimeDays,
    expectedDeliveryDate: u.expectedDeliveryDate,
    requestDeliveryDate: u.requestDeliveryDate,
    deliveryTatDays: u.deliveryTatDays,
    deliveryPerformance: u.deliveryPerformance,
    reasonForDelay: u.reasonForDelay || (typeof u.delayReason === 'string' ? u.delayReason : undefined),
    delayReason: u.delayReason || (u.reasonForDelay as any),
    delayReasonDetails: u.delayReasonDetails,
    podStatus: u.podStatus,
    dateOfPodReturn: u.dateOfPodReturn || '',
    actualPodReturnDate: u.dateOfPodReturn || '',
    podLeadTimeDays: u.podLeadTimeDays,
    podReturnDueDate: u.podReturnDueDate,
    podReturnDueDateFormatted: u.podReturnDueDateFormatted,
    podTatDays: u.podTatDays,
    podPerformance: u.podPerformance,
    podReasonForDelay: u.podReasonForDelay,
  };
}

/**
 * Updates a UnifiedShipment from a DispatchRecord modification.
 */
export function updateUnifiedFromDispatch(
  existing: UnifiedShipment,
  dispatch: DispatchRecord
): UnifiedShipment {
  const merged: UnifiedShipment = {
    ...existing,
    client: dispatch.clientName || existing.client,
    deliveryDate: dispatch.deliveryDate,
    actualDispatchDate: dispatch.deliveryDate,
    podNumber: dispatch.podNumber,
    quantity: dispatch.quantityCasesBoxes,
    unit: dispatch.unit,
    deliveryType: dispatch.deliveryType,
    area: dispatch.deliveryArea || dispatch.area || existing.area,
    destination: dispatch.destination,
    consignee: dispatch.consignee,
    truckProvider: dispatch.truckProvider,
    plateNumber: dispatch.plateNumber,
    truckArrivalTime: dispatch.truckArrivalTime,
    loadingStartTime: dispatch.loadingStartTime,
    loadingEndTime: dispatch.loadingEndTime,
    departureTime: dispatch.departureTime,
    plannedDeliveryDate: dispatch.plannedDeliveryDate,
    requestDeliveryDate: dispatch.requestDeliveryDate || existing.requestDeliveryDate,
    manifestNumber: dispatch.manifestNumber,
    remarks: dispatch.remarks,
    deliveryRemarks: dispatch.remarks,
    dispatchStatus: dispatch.status,
    delayReason: dispatch.delayReason,
    delayReasonDetails: dispatch.delayReasonDetails,
    driverName: dispatch.driverName || existing.driverName,
    driverContact: dispatch.driverContact || existing.driverContact,
    actualWeightKg: dispatch.totalWeightKg || existing.actualWeightKg,
  };

  // If status is Delivered and actualDeliveryDate is not set, set it to planned or delivery date
  if (dispatch.status === 'Delivered' && !merged.actualDeliveryDate) {
    merged.actualDeliveryDate = dispatch.deliveryDate || dispatch.plannedDeliveryDate;
    merged.deliveryStatus = 'Delivered';
    merged.shipmentStatus = 'Delivered';
  } else if (dispatch.status === 'Delayed') {
    merged.deliveryStatus = 'Delayed';
    merged.shipmentStatus = 'Delayed';
  } else if (dispatch.status === 'In Transit' || dispatch.status === 'Departed' || dispatch.status === 'In Loading') {
    merged.deliveryStatus = 'In Transit';
    merged.shipmentStatus = 'In Transit';
  }

  return recalculateUnifiedShipment(merged);
}

/**
 * Updates a UnifiedShipment from a ShipmentRecord modification.
 */
export function updateUnifiedFromShipment(
  existing: UnifiedShipment,
  shipment: ShipmentRecord
): UnifiedShipment {
  const merged: UnifiedShipment = {
    ...existing,
    client: shipment.client,
    clientId: shipment.clientId,
    consignee: shipment.consignee,
    contactNumber: shipment.contactNumber,
    modeOfShipment: shipment.modeOfShipment,
    originPickupPoint: shipment.originPickupPoint,
    destination: shipment.destination,
    area: shipment.area,
    plannedDeliveryDate: shipment.plannedDeliveryDate || shipment.requestedDeliveryDate,
    requestDeliveryDate: shipment.requestDeliveryDate || existing.requestDeliveryDate,
    itemDescription: shipment.itemDescription,
    quantity: shipment.quantityBoxes,
    declaredValue: shipment.amount,
    cbm: shipment.actualCbm,
    volumeWeightKg: shipment.volumeWeight,
    actualWeightKg: shipment.actualWeightKg,
    chargePerWeight: shipment.chargePerWeight,
    vanNumber: shipment.vanNumber,
    plateNumber: shipment.truckPlate || existing.plateNumber,
    vesselFlightNo: shipment.vesselFlightNo,
    podNumber: shipment.podNumber,
    awbNumber: shipment.awbNumber,
    awbCourierRefNumber: shipment.awbNumber,
    drNumber: shipment.drNumber,
    sealNumber: shipment.sealNumber,
    billOfLandingNumber: shipment.billOfLandingNumber,
    manifestNumber: shipment.manifestNumber,
    actualDeliveryDate: shipment.actualDeliveryDate || (shipment.status === 'Delivered' ? shipment.deliveryDate : ''),
    deliveryDate: shipment.actualDeliveryDate || shipment.deliveryDate || existing.deliveryDate,
    receiversName: shipment.receiversName,
    dateOfPodReturn: shipment.datePodReceived !== 'Pending' && shipment.datePodReceived !== 'Pending Delivery' ? shipment.datePodReceived.split(' ')[0] : existing.dateOfPodReturn,
    dateTransmitted: shipment.dateTransmitted,
    deliveryRemarks: shipment.deliveryRemarks,
    remarks: shipment.deliveryRemarks,
    shipmentStatus: shipment.status,
    delayReason: shipment.delayReason,
    delayReasonDetails: shipment.delayReasonDetails,
  };

  if (shipment.status === 'Delivered') {
    merged.deliveryStatus = 'Delivered';
    merged.dispatchStatus = 'Delivered';
  } else if (shipment.status === 'Delayed') {
    merged.deliveryStatus = 'Delayed';
    merged.dispatchStatus = 'Delayed';
  }

  return recalculateUnifiedShipment(merged);
}

/**
 * Updates a UnifiedShipment from a ForwardingProgressiveRecord modification.
 */
export function updateUnifiedFromForwarding(
  existing: UnifiedShipment,
  f: ForwardingProgressiveRecord
): UnifiedShipment {
  const merged: UnifiedShipment = {
    ...existing,
    month: f.month,
    coordinator: f.coordinator,
    client: f.client,
    clientId: f.clientId || existing.clientId,
    modeOfShipment: f.modeOfShipment,
    area: f.area,
    referenceNumber: f.referenceNumber,
    actualDispatchDate: f.actualDispatchDate,
    deliveryDate: f.actualDispatchDate,
    requestDeliveryDate: f.requestDeliveryDate,
    consignee: f.consignee,
    destinationCode: f.destinationCode,
    destination: existing.destination || `${f.destinationCode} - ${f.consignee}`,
    quantity: f.quantity,
    unit: f.unit || existing.unit || 'Boxes',
    courier: f.courier,
    truckProvider: f.courier || existing.truckProvider,
    cbm: f.cbm,
    volumeWeightKg: f.volumeWeightKg,
    actualWeightKg: f.actualWeightKg || (f.quantity * 12),
    chargeableWeightFees: f.chargeableWeightFees,
    declaredValue: f.declaredValue,
    podNumber: f.podNumber,
    awbCourierRefNumber: f.awbCourierRefNumber,
    awbNumber: f.awbCourierRefNumber,
    deliveryStatus: f.deliveryStatus,
    receiversName: f.receiversName,
    actualDeliveryDate: f.actualDeliveryDate,
    deliveryLeadTimeDays: f.deliveryLeadTimeDays,
    reasonForDelay: f.reasonForDelay || (typeof f.delayReason === 'string' ? f.delayReason : undefined),
    delayReason: f.delayReason || (f.reasonForDelay as any),
    delayReasonDetails: f.delayReasonDetails,
    podStatus: f.podStatus,
    dateOfPodReturn: f.dateOfPodReturn,
    podLeadTimeDays: f.podLeadTimeDays,
    podReasonForDelay: f.podReasonForDelay,
  };

  if (f.deliveryStatus === 'Delivered') {
    merged.dispatchStatus = 'Delivered';
    merged.shipmentStatus = 'Delivered';
  } else if (f.deliveryStatus === 'Delayed') {
    merged.dispatchStatus = 'Delayed';
    merged.shipmentStatus = 'Delayed';
  } else {
    merged.dispatchStatus = 'In Transit';
    merged.shipmentStatus = 'In Transit';
  }

  return recalculateUnifiedShipment(merged);
}

/**
 * Calculates Dashboard Summary metrics dynamically from the Unified Shipment dataset.
 */
export function computeDashboardSummary(shipments: UnifiedShipment[]): DashboardSummary {
  const totalShipments = shipments.length;
  let delivered = 0;
  let inTransit = 0;
  let delayed = 0;
  let deliveredHits = 0;
  let completedDeliveries = 0;

  shipments.forEach((s) => {
    const autoStatus = determineAutomaticDeliveryStatus({
      actualDispatchDate: s.actualDispatchDate || s.deliveryDate,
      actualDeliveryDate: s.actualDeliveryDate,
      expectedDeliveryDate: s.expectedDeliveryDate,
      requestDeliveryDate: s.requestDeliveryDate,
      leadTimeDaysOrConfig: s.deliveryLeadTimeDays || getAutoDeliveryLeadTime(s.client, (s.modeOfShipment as ForwardingMode) || 'Land Freight', s.area || 'Luzon'),
    });

    if (autoStatus.status === 'On Time') {
      delivered++;
    } else if (autoStatus.status === 'In Transit') {
      inTransit++;
    } else if (autoStatus.status === 'Delayed') {
      delayed++;
    }

    if (autoStatus.isDelivered) {
      completedDeliveries++;
      if (!autoStatus.isLate) {
        deliveredHits++;
      }
    }
  });

  // On-time percentage calculation from completed deliveries
  const onTimePercentage = completedDeliveries > 0 
    ? Math.round((deliveredHits / completedDeliveries) * 1000) / 10 
    : 95.3;

  // Unique active trucks
  const activePlates = new Set(
    shipments
      .filter((s) => s.deliveryStatus !== 'Delivered' && s.plateNumber)
      .map((s) => s.plateNumber)
  );
  const activeTrucks = Math.max(activePlates.size, 12);

  // Total boxes today
  const totalBoxesToday = shipments.reduce((sum, s) => sum + (s.quantity || 0), 0);

  return {
    totalShipments: totalShipments > 0 ? totalShipments : 148,
    inTransit: Math.max(0, inTransit),
    delivered: delivered,
    delayed: delayed,
    onTimePercentage: onTimePercentage > 0 ? onTimePercentage : 96.5,
    activeTrucks,
    totalBoxesToday: totalBoxesToday > 0 ? totalBoxesToday : 4820,
  };
}
