import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  ClientSummary, 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ForwardingDispatchNotification,
  BusinessRule,
  DatabaseSyncStatus
} from '../types';
import { 
  initialClients, 
  initialDispatches, 
  initialShipments, 
  initialForwardingRecords, 
  initialDispatchNotifications 
} from '../data/mockData';

// ------------------------------------------------------------------------------
// BROADCAST CHANNEL FOR INSTANT SUB-MILLISECOND MULTI-TAB SYNCHRONIZATION
// ------------------------------------------------------------------------------
const SYNC_CHANNEL_NAME = 'ofii_ops_broadcast_channel';
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[Sync] BroadcastChannel not supported:', e);
}

// ------------------------------------------------------------------------------
// DATABASE MAPPERS (Database snake_case <-> App camelCase)
// ------------------------------------------------------------------------------

export function mapClientFromDb(row: any): ClientSummary {
  return {
    id: row.id,
    name: row.name,
    code: row.code || '',
    accountManager: row.account_manager,
    industry: row.industry,
    activeShipments: row.active_shipments ?? 0,
    deliveredThisMonth: row.delivered_this_month ?? 0,
    onTimeRate: row.on_time_rate !== null ? Number(row.on_time_rate) : 98.0,
    primaryContact: row.primary_contact || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    area: row.area || '',
    remarks: row.remarks || '',
    notes: row.notes || '',
    tin: row.tin || '',
    isDeactivated: Boolean(row.is_deactivated),
    deactivatedAt: row.deactivated_at,
    deactivatedBy: row.deactivated_by,
    deactivationReason: row.deactivation_reason,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

export function mapClientToDb(c: ClientSummary) {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    account_manager: c.accountManager,
    industry: c.industry,
    active_shipments: c.activeShipments,
    delivered_this_month: c.deliveredThisMonth,
    on_time_rate: c.onTimeRate,
    primary_contact: c.primaryContact,
    email: c.email,
    phone: c.phone,
    address: c.address,
    area: c.area,
    remarks: c.remarks,
    notes: c.notes,
    tin: c.tin,
    is_deactivated: Boolean(c.isDeactivated),
    deactivated_at: c.deactivatedAt || null,
    deactivated_by: c.deactivatedBy || null,
    deactivation_reason: c.deactivationReason || null,
    is_deleted: Boolean(c.isDeleted),
    deleted_at: c.deletedAt || null,
    deleted_by: c.deletedBy || null,
    delete_reason: c.deleteReason || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDispatchFromDb(row: any): DispatchRecord {
  return {
    id: row.id,
    deliveryDate: row.delivery_date || '',
    deliveryArea: row.delivery_area || row.area || 'Luzon',
    area: row.delivery_area || row.area || 'Luzon',
    podNumber: row.pod_number || '',
    quantityCasesBoxes: Number(row.quantity_cases_boxes ?? 0),
    unit: row.unit || 'Boxes',
    deliveryType: row.delivery_type || 'GADC',
    destination: row.destination || '',
    consignee: row.consignee || '',
    truckProvider: row.truck_provider || 'OFII Fleet Logistics',
    plateNumber: row.plate_number || '',
    truckArrivalTime: row.truck_arrival_time || '',
    loadingStartTime: row.loading_start_time || '',
    loadingEndTime: row.loading_end_time || '',
    departureTime: row.departure_time || '',
    plannedDeliveryDate: row.planned_delivery_date || '',
    manifestNumber: row.manifest_number || '',
    remarks: row.remarks || '',
    status: row.status || 'In Transit',
    driverName: row.driver_name,
    driverContact: row.driver_contact,
    clientName: row.client_name || '',
    totalWeightKg: row.total_weight_kg !== null ? Number(row.total_weight_kg) : undefined,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

export function mapDispatchToDb(d: DispatchRecord) {
  return {
    id: d.id,
    client_name: d.clientName,
    delivery_date: d.deliveryDate,
    delivery_area: d.deliveryArea || d.area || null,
    area: d.deliveryArea || d.area || null,
    pod_number: d.podNumber,
    quantity_cases_boxes: d.quantityCasesBoxes,
    unit: d.unit,
    delivery_type: d.deliveryType,
    destination: d.destination,
    consignee: d.consignee,
    truck_provider: d.truckProvider,
    plate_number: d.plateNumber,
    truck_arrival_time: d.truckArrivalTime,
    loading_start_time: d.loadingStartTime,
    loading_end_time: d.loadingEndTime,
    departure_time: d.departureTime,
    planned_delivery_date: d.plannedDeliveryDate,
    manifest_number: d.manifestNumber,
    remarks: d.remarks,
    status: d.status,
    driver_name: d.driverName,
    driver_contact: d.driverContact,
    total_weight_kg: d.totalWeightKg,
    is_deleted: Boolean(d.isDeleted),
    deleted_at: d.deletedAt || null,
    deleted_by: d.deletedBy || null,
    delete_reason: d.deleteReason || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapShipmentFromDb(row: any): ShipmentRecord {
  return {
    id: row.id,
    client: row.client,
    clientId: row.client_id || '',
    monthStarted: row.month || 'August 2026',
    bookedDate: row.booked_date || '',
    pickupDate: row.pickup_date || '',
    consignee: row.consignee || '',
    contactNumber: row.contact_number || '',
    modeOfShipment: row.mode_of_shipment || 'Land Freight',
    originPickupPoint: row.origin_pickup_point || 'OFII Paranaque Central Cargo Terminal',
    destination: row.destination || '',
    area: row.area || 'Luzon',
    requestedDeliveryDate: row.planned_delivery_date || row.delivery_date || '',
    itemDescription: row.item_description || '',
    quantityBoxes: Number(row.quantity ?? 0),
    amount: row.declared_value || 'PHP 1,000,000.00',
    actualCbm: Number(row.cbm ?? 10),
    volumeWeight: Number(row.volume_weight_kg ?? 150),
    actualWeightKg: Number(row.actual_weight_kg ?? 200),
    chargePerWeight: row.charge_per_weight || 'PHP 25.00 / kg',
    vanNumber: row.van_number || '',
    truckPlate: row.plate_number,
    vesselFlightNo: row.vessel_flight_no,
    estimatedDeparture: `${row.actual_dispatch_date || ''} ${row.departure_time || '08:30 AM'}`,
    actualDeparture: `${row.actual_dispatch_date || ''} ${row.departure_time || '08:30 AM'}`,
    estimatedArrival: `${row.planned_delivery_date || ''} 05:00 PM`,
    actualArrival: row.actual_delivery_date ? `${row.actual_delivery_date} 04:00 PM` : 'In Transit',
    podNumber: row.pod_number || '',
    awbNumber: row.awb_number || row.awb_courier_ref_number || '',
    drNumber: row.dr_number || '',
    sealNumber: row.seal_number || '',
    billOfLandingNumber: row.bill_of_landing_number || '',
    manifestNumber: row.manifest_number || '',
    plannedDeliveryDate: row.planned_delivery_date || '',
    actualDeliveryDate: row.actual_delivery_date || '',
    deliveryDate: row.delivery_date || row.actual_delivery_date || '',
    receiversName: row.receivers_name || '',
    datePodReceived: row.date_of_pod_return || (row.pod_status === 'Returned' ? 'Returned' : 'Pending Return'),
    dateTransmitted: row.date_transmitted || '',
    deliveryRemarks: row.delivery_remarks || row.remarks || '',
    status: row.shipment_status || 'In Transit',
    leadTime: `${row.delivery_lead_time_days ?? 0} Days`,
    tatNumber: row.tat_number || '',
    deliveryPerformance: row.delivery_performance === 'HIT' ? 'On-Time' : (row.delivery_performance === 'MISSED' ? 'Delayed' : 'Within SLA'),
    numberOfDays: Number(row.delivery_tat_days ?? row.number_of_days ?? 0),
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

export function mapShipmentToDb(s: ShipmentRecord) {
  return {
    id: s.id,
    client: s.client,
    client_id: s.clientId,
    month: s.monthStarted,
    booked_date: s.bookedDate,
    pickup_date: s.pickupDate,
    consignee: s.consignee,
    contact_number: s.contactNumber,
    mode_of_shipment: s.modeOfShipment,
    origin_pickup_point: s.originPickupPoint,
    destination: s.destination,
    area: s.area,
    planned_delivery_date: s.plannedDeliveryDate || s.requestedDeliveryDate,
    delivery_date: s.deliveryDate,
    actual_delivery_date: s.actualDeliveryDate,
    item_description: s.itemDescription,
    quantity: s.quantityBoxes,
    declared_value: s.amount,
    cbm: s.actualCbm,
    volume_weight_kg: s.volumeWeight,
    actual_weight_kg: s.actualWeightKg,
    charge_per_weight: s.chargePerWeight,
    van_number: s.vanNumber,
    plate_number: s.truckPlate,
    vessel_flight_no: s.vesselFlightNo,
    pod_number: s.podNumber,
    awb_number: s.awbNumber,
    dr_number: s.drNumber,
    seal_number: s.sealNumber,
    bill_of_landing_number: s.billOfLandingNumber,
    manifest_number: s.manifestNumber,
    receivers_name: s.receiversName,
    date_of_pod_return: s.datePodReceived,
    date_transmitted: s.dateTransmitted,
    delivery_remarks: s.deliveryRemarks,
    shipment_status: s.status,
    delivery_performance: s.deliveryPerformance === 'On-Time' ? 'HIT' : (s.deliveryPerformance === 'Delayed' ? 'MISSED' : 'PENDING'),
    delivery_tat_days: s.numberOfDays,
    number_of_days: s.numberOfDays,
    tat_number: s.tatNumber,
    is_deleted: Boolean(s.isDeleted),
    deleted_at: s.deletedAt || null,
    deleted_by: s.deletedBy || null,
    delete_reason: s.deleteReason || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapForwardingFromDb(row: any): ForwardingProgressiveRecord {
  return {
    id: row.id,
    month: row.month || 'August 2026',
    coordinator: row.coordinator || 'Maria Santos',
    client: row.client || '',
    clientId: row.client_id,
    modeOfShipment: row.mode_of_shipment || 'Land Freight',
    area: row.area || 'Luzon',
    referenceNumber: row.reference_number || '',
    actualDispatchDate: row.actual_dispatch_date || '',
    consignee: row.consignee || '',
    destinationCode: row.destination_code || 'MNL-01',
    quantity: Number(row.quantity ?? 0),
    unit: row.unit || 'Boxes',
    courier: row.courier || 'OFII Fleet Logistics',
    cbm: row.cbm !== null ? Number(row.cbm) : undefined,
    volumeWeightKg: row.volume_weight_kg !== null ? Number(row.volume_weight_kg) : undefined,
    actualWeightKg: row.actual_weight_kg !== null ? Number(row.actual_weight_kg) : undefined,
    chargeableWeightFees: row.chargeable_weight_fees || 'PHP 0.00',
    declaredValue: row.declared_value || 'PHP 0.00',
    podNumber: row.pod_number || '',
    awbCourierRefNumber: row.awb_courier_ref_number || '',
    deliveryStatus: row.delivery_status || 'In Transit',
    receiversName: row.receivers_name || '',
    actualDeliveryDate: row.actual_delivery_date || '',
    deliveryLeadTimeDays: Number(row.delivery_lead_time_days ?? 0),
    expectedDeliveryDate: row.expected_delivery_date || undefined,
    requestDeliveryDate: row.request_delivery_date || row.rdd || undefined,
    deliveryTatDays: Number(row.delivery_tat_days ?? 0),
    deliveryPerformance: row.delivery_performance || 'PENDING',
    reasonForDelay: row.reason_for_delay,
    podStatus: row.pod_status || 'Pending Return',
    dateOfPodReturn: row.date_of_pod_return || '',
    podLeadTimeDays: Number(row.pod_lead_time_days ?? 3),
    podTatDays: Number(row.pod_tat_days ?? 0),
    podPerformance: row.pod_performance || 'PENDING',
    podReasonForDelay: row.pod_reason_for_delay,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deleteReason: row.delete_reason,
  };
}

export function mapForwardingToDb(f: ForwardingProgressiveRecord) {
  return {
    id: f.id,
    month: f.month,
    coordinator: f.coordinator,
    client: f.client,
    client_id: f.clientId || null,
    mode_of_shipment: f.modeOfShipment,
    area: f.area,
    reference_number: f.referenceNumber,
    actual_dispatch_date: f.actualDispatchDate,
    consignee: f.consignee,
    destination_code: f.destinationCode,
    quantity: f.quantity,
    unit: f.unit,
    courier: f.courier,
    cbm: f.cbm,
    volume_weight_kg: f.volumeWeightKg,
    actual_weight_kg: f.actualWeightKg,
    chargeable_weight_fees: f.chargeableWeightFees,
    declared_value: f.declaredValue,
    pod_number: f.podNumber,
    awb_courier_ref_number: f.awbCourierRefNumber,
    delivery_status: f.deliveryStatus,
    receivers_name: f.receiversName,
    actual_delivery_date: f.actualDeliveryDate,
    delivery_lead_time_days: f.deliveryLeadTimeDays,
    expected_delivery_date: f.expectedDeliveryDate || null,
    request_delivery_date: f.requestDeliveryDate || null,
    delivery_tat_days: f.deliveryTatDays,
    delivery_performance: f.deliveryPerformance,
    reason_for_delay: f.reasonForDelay || null,
    pod_status: f.podStatus,
    date_of_pod_return: f.dateOfPodReturn,
    pod_lead_time_days: f.podLeadTimeDays,
    pod_tat_days: f.podTatDays,
    pod_performance: f.podPerformance,
    pod_reason_for_delay: f.podReasonForDelay || null,
    is_deleted: Boolean(f.isDeleted),
    deleted_at: f.deletedAt || null,
    deleted_by: f.deletedBy || null,
    delete_reason: f.deleteReason || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapNotificationFromDb(row: any): ForwardingDispatchNotification {
  return {
    id: row.id,
    forwardingRecordId: row.forwarding_record_id || '',
    client: row.client || '',
    clientId: row.client_id,
    consignee: row.consignee || '',
    podNumber: row.pod_number || '',
    referenceNumber: row.reference_number,
    deliveryDate: row.delivery_date,
    modeOfShipment: row.mode_of_shipment,
    area: row.area,
    quantity: row.quantity,
    unit: row.unit,
    destination: row.destination,
    destinationCode: row.destination_code,
    source: 'Forwarding Progressive Report',
    message: row.message || '',
    status: row.status || 'NEW',
    createdAt: row.created_at || new Date().toISOString(),
    completedAt: row.completed_at,
    completedDispatchId: row.completed_dispatch_id,
    isDismissed: Boolean(row.is_dismissed),
  };
}

export function mapNotificationToDb(n: ForwardingDispatchNotification) {
  return {
    id: n.id,
    forwarding_record_id: n.forwardingRecordId,
    client: n.client,
    client_id: n.clientId || null,
    consignee: n.consignee,
    pod_number: n.podNumber,
    reference_number: n.referenceNumber,
    delivery_date: n.deliveryDate,
    mode_of_shipment: n.modeOfShipment,
    area: n.area,
    quantity: n.quantity,
    unit: n.unit,
    destination: n.destination,
    destination_code: n.destinationCode,
    source: n.source,
    message: n.message,
    status: n.status,
    completed_at: n.completedAt || null,
    completed_dispatch_id: n.completedDispatchId || null,
    is_dismissed: Boolean(n.isDismissed),
    updated_at: new Date().toISOString(),
  };
}

export function mapBusinessRuleFromDb(row: any): BusinessRule {
  return {
    id: row.id,
    clientName: row.client_name,
    modeOfShipment: row.mode_of_shipment,
    area: row.area,
    deliveryMethod: row.delivery_method,
    deliveryLeadTimeDays: Number(row.delivery_lead_time_days ?? 0),
    podLeadTimeDays: Number(row.pod_lead_time_days ?? 3),
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ------------------------------------------------------------------------------
// DATABASE INITIAL SEED LOGIC (Runs ONLY on empty tables to populate baseline data)
// ------------------------------------------------------------------------------
let isDatabaseSeeded = false;

export async function checkAndSeedInitialData(): Promise<void> {
  if (!supabase || isDatabaseSeeded) return;

  try {
    // Check if clients table has any records
    const { count: clientCount, error: countErr } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.warn('[Supabase Seed] Count error (schema may need setup):', countErr.message);
      return;
    }

    if (clientCount === 0) {
      console.log('[Supabase Seed] Seeding initial database records...');
      // 1. Seed Clients
      const clientPayload = initialClients.map(mapClientToDb);
      await supabase.from('clients').insert(clientPayload);

      // 2. Seed Dispatches
      const dispatchPayload = initialDispatches.map(mapDispatchToDb);
      await supabase.from('dispatches').insert(dispatchPayload);

      // 3. Seed Shipments
      const shipmentPayload = initialShipments.map(mapShipmentToDb);
      await supabase.from('shipments').insert(shipmentPayload);

      // 4. Seed Forwarding Records
      const forwardingPayload = initialForwardingRecords.map(mapForwardingToDb);
      await supabase.from('forwarding_records').insert(forwardingPayload);

      // 5. Seed Notifications
      const notifPayload = initialDispatchNotifications.map(mapNotificationToDb);
      await supabase.from('notifications').insert(notifPayload);

      console.log('[Supabase Seed] Baseline data successfully seeded.');
    }
    isDatabaseSeeded = true;
  } catch (err) {
    console.warn('[Supabase Seed] Failed to seed baseline data:', err);
  }
}

// ------------------------------------------------------------------------------
// BROADCAST NOTIFICATION HELPER
// ------------------------------------------------------------------------------
export function broadcastDataChange(type: string, payload?: any) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type,
        payload,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('[Sync] Broadcast postMessage error:', e);
    }
  }
}

export function subscribeToCrossTabChanges(callback: (event: { type: string; payload: any }) => void) {
  if (!broadcastChannel) return () => {};
  const handler = (msg: MessageEvent) => {
    if (msg.data) {
      callback(msg.data);
    }
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}
