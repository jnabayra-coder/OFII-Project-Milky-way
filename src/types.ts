export type NavigationTab = 
  | 'dashboard' 
  | 'dispatch' 
  | 'client_management'
  | 'clients' 
  | 'forwarding_report'
  | 'pod_returning'
  | 'reports' 
  | 'trash'
  | 'settings'
  | 'coordinator_portal'
  | 'driver_head_portal'
  | 'truck_planner'
  | 'dispatcher_portal'
  | 'data_audit'
  | 'user_management';

export type DeliveryType = 'GADC' | 'ISCI' | 'XSEED' | 'LTL' | 'FTL' | 'Inter-Island' | 'Air Freight';

export type DispatchStatus = 
  | 'In Loading' 
  | 'Departed' 
  | 'In Transit' 
  | 'Arrived at Hub' 
  | 'Delivered' 
  | 'Delayed' 
  | 'Pending Pickup';

export type ShipmentStatus = 
  | 'Booked' 
  | 'In Transit' 
  | 'Out for Delivery' 
  | 'Delivered' 
  | 'Delayed' 
  | 'Under Customs/Documentation';

export type PhilippineArea = 'Luzon' | 'Visayas' | 'Mindanao' | 'NCR';

export type ForwardingMode = 'Sea Freight' | 'Air Freight' | 'RORO' | 'Land Freight';

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

export type ForwardingDeliveryStatus = 
  | 'On Time' 
  | 'In Transit' 
  | 'Delayed' 
  | 'Delivered' 
  | 'Pending Delivery' 
  | 'Assigned' 
  | 'Out for Delivery'
  | 'Ready for Dispatch'
  | CanonicalDeliveryStatus;

export type AutomaticPodStatus = 'Not Applicable' | 'POD Pending' | 'POD On Time' | 'POD Delayed';

export type PODStatus = 'Returned' | 'Pending Return' | 'Transmitted' | 'Under Review' | AutomaticPodStatus;

export type PerformanceResult = 'HIT' | 'MISSED' | 'PENDING';

export type DelayReason = 
  | 'Client Reschedule'
  | 'Weather Condition'
  | 'Operational Issue'
  | 'Port / Shipping Delay'
  | 'Vehicle Issue'
  | 'Documentation Issue'
  | 'Other';

export const DELAY_REASON_OPTIONS: DelayReason[] = [
  'Client Reschedule',
  'Weather Condition',
  'Operational Issue',
  'Port / Shipping Delay',
  'Vehicle Issue',
  'Documentation Issue',
  'Other',
];

export type ForwardingDispatchNotificationStatus = 'NEW' | 'IN PROGRESS' | 'COMPLETED';

export type PODNotificationType = 
  | 'POD_DUE_SOON'        // 🟡 POD Approaching Due / Due Tomorrow
  | 'POD_OVERDUE'         // 🔴 POD Overdue (Pending & past due date)
  | 'POD_RETURNED_LATE'   // 🔴 POD Returned Late (Entered after due date)
  | 'POD_RETURNED_ONTIME' // 🟢 POD Returned On Time (Entered on or before due date)
  | 'DELIVERY_COMPLETED'; // 🔔 Delivery Completed by Driver

export interface PODNotification {
  id: string;
  dedupKey: string; // Unique deduplication key e.g. `${recordId}_${type}`
  type: PODNotificationType;
  title: string;
  message: string;
  recordId: string;
  client: string;
  clientId?: string;
  coordinator: string;
  referenceNumber: string;
  podNumber?: string;
  consignee: string;
  destination?: string;
  area?: PhilippineArea;
  actualDeliveryDate?: string;
  podReturnDueDate?: string;
  podReturnDueDateFormatted?: string;
  actualPodReturnDate?: string;
  podSla: PerformanceResult;
  podStatus: PODStatus;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  driverName?: string;
  receiverName?: string;
  dateReceived?: string;
  vehicle?: string;
  plateNumber?: string;
  deliveryArea?: string;
}

export interface ForwardingDispatchNotification {
  id: string;
  forwardingRecordId: string;
  client: string;
  clientId?: string;
  consignee: string;
  podNumber: string;
  referenceNumber?: string;
  deliveryDate?: string;
  modeOfShipment?: ForwardingMode;
  area?: PhilippineArea;
  quantity?: number;
  unit?: string;
  destination?: string;
  destinationCode?: string;
  source: 'Forwarding Progressive Report';
  message: string;
  status: ForwardingDispatchNotificationStatus;
  createdAt: string;
  completedAt?: string;
  completedDispatchId?: string;
  isDismissed?: boolean;
}

export interface DriverAssignmentNotification {
  id: string;
  driverName: string;
  driverId?: string;
  assignedDriverId?: string;
  assignedHelperId?: string;
  helperName?: string;
  assignedHelper?: string;
  recordId: string;
  deliveryId?: string;
  truckRunNumber?: string;
  truckRunId?: string;
  batchName?: string;
  batchId?: string;
  plannedDispatchDate?: string;
  truckName?: string;
  assignedDriver?: string;
  podNumber: string;
  referenceNumber?: string;
  client: string;
  consignee: string;
  area: PhilippineArea | string;
  destination?: string;
  deliveryDate?: string;
  dispatchTime?: string;
  vehicle?: string;
  plateNumber?: string;
  quantity?: number;
  unit?: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
}

export type CanonicalRole =
  | 'ADMIN'
  | 'ENCODER'
  | 'COORDINATOR'
  | 'DRIVER'
  | 'VIEWER'
  | 'MANAGEMENT'
  | 'TRUCK_PLANNER'
  | 'DISPATCHER'
  // Backward compatibility aliases:
  | 'HEAD_STAFF'
  | 'DRIVER_HELPER';

export type UserRole = 
  | 'admin'
  | 'encoder'
  | 'coordinator'
  | 'driver'
  | 'viewer'
  | 'management'
  | 'supervisor'
  | 'ADMIN'
  | 'ENCODER'
  | 'COORDINATOR'
  | 'DRIVER'
  | 'VIEWER'
  | 'MANAGEMENT'
  // Legacy aliases
  | 'office_head'
  | 'truck_planner'
  | 'dispatcher'
  | 'driver_head'
  | 'driver_helper'
  | 'HEAD_STAFF'
  | 'TRUCK_PLANNER'
  | 'DISPATCHER'
  | 'DRIVER_HELPER';

export interface OFIIDriver {
  id: string;
  name: string;
  contactNumber: string;
  defaultPlate: string;
  vehicleType: string;
  status: 'Active' | 'On Delivery' | 'Available';
}

export interface OFIIHelper {
  id: string;
  name: string;
  contactNumber: string;
  status: 'Active' | 'Assigned' | 'Available';
}

/**
 * Phase 1 Delivery Assignment entity
 * Represents a separate assignment record linked to an existing Coordinator-created Delivery.
 */
export type DeliveryAssignmentStatus = 'ASSIGNED' | 'CANCELLED';

export interface DeliveryAssignment {
  id: string; // Unique Assignment ID
  assignmentId: string; // Assignment ID (e.g. ASG-0001)
  originalDeliveryId: string; // Original Delivery ID (foreign reference to Master Delivery)
  driver: string; // Driver Name
  driverId?: string;
  helper: string; // Helper Name
  helperId?: string;
  vehicle: string; // Vehicle / Truck
  plateNumber: string; // Plate Number
  assignmentDate: string; // Assignment Date (YYYY-MM-DD)
  assignmentTime: string; // Assignment Time (e.g. 08:30 AM or HH:mm)
  assignmentStatus: DeliveryAssignmentStatus | 'ASSIGNED' | string; // Assignment Status (ASSIGNED)
  createdAt?: string;
  createdBy?: string;
  notes?: string;
}

/**
 * Phase 1 Delivery Name / Delivery Batch Concept
 * One Delivery Name represents ONE LARGE BATCH/GROUP of deliveries.
 */
export type DeliveryBatchStatus = 'Draft' | 'Active' | 'Completed';

export interface DeliveryBatch {
  id: string; // e.g. BATCH-001
  name: string; // Delivery Name / Project Name (e.g. "GADC AUGUST 2026 BATCH A")
  client: string; // Client Name from Client Management
  clientId?: string;
  coordinator: string; // Auto-assigned coordinator based on Client
  createdDate: string; // YYYY-MM-DD
  status: DeliveryBatchStatus; // 'Draft' | 'Active' | 'Completed'
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Recipient Name Change Audit History Entry
 * Records modifications made by the Encoder to the original Driver-entered recipient name.
 */
export interface RecipientNameHistoryEntry {
  id?: string;
  originalRecipientName: string; // Original Driver-entered recipient name (never deleted)
  finalRecipientName: string; // Final Encoder-confirmed recipient name
  editedBy: string; // Name of Encoder who made the confirmation/edit
  editedAt: string; // ISO date and time of edit
  editReason?: string; // Optional reason for the edit
}

/**
 * Phase 1 Individual Delivery
 * Belongs to one specific DeliveryBatch. Has its own separate Delivery ID and POD number.
 */
export interface IndividualDelivery {
  id: string; // Internal Delivery ID (e.g. DEL-0001)
  deliveryId: string; // Formatted Delivery ID (e.g. DEL-001 or DEL-87890)
  batchId: string; // Parent Delivery Batch ID
  batchName: string; // Parent Delivery Batch Name
  client: string;
  clientId?: string;
  coordinator: string;
  consignee: string; // Store / Consignee
  individualDeliveryPod: string; // Individual Delivery POD Number (unique to this delivery)
  destinationCode: string; // Destination Code (e.g. ANT-01)
  area: string; // Delivery Area: Luzon, Visayas, Mindanao, NCR
  destination?: string; // Place / Location
  quantity: number; // Cargo Quantity
  unit?: string; // cases, boxes, crates, etc.
  modeOfShipment: string; // Land Freight, Air Freight, Sea Freight, RORO
  rdd?: string; // Request Delivery Date (YYYY-MM-DD)
  referenceNumber: string; // Reference Number / Code
  status?: string; // CanonicalDeliveryStatus or legacy status string
  actualDispatchDate?: string;
  actualDeliveryDate?: string;
  podStatus?: string;
  podReturnDate?: string;
  receiversName?: string;
  recipientName?: string; // Recipient Name — Full name of the person who physically received the delivery
  driverRecipientName?: string; // Original Driver-entered Recipient Name (never deleted)
  recipientNameHistory?: RecipientNameHistoryEntry[]; // Edit history of Recipient Name changes made by Encoder
  deliveryStatus?: CanonicalDeliveryStatus | string;
  drNumber?: string;
  sealNumber?: string;
  itemDescription?: string;
  createdAt?: string;

  // Phase 2: Truck Run assignment relationship (Additive ONLY)
  truckRunId?: string; // ID of assigned TruckRun
  truckRunNumber?: string; // e.g. "TRUCK RUN #001"
  truckDispatchPod?: string; // e.g. "TRK-001" (SEPARATE from individualDeliveryPod)
  assignedToTruckRunAt?: string;

  // Phase 3B.3 & 3B.4: Operational Dispatch Fields (Additive ONLY)
  dispatchOperationalStatus?: DispatchOperationalStatus;
  timeArrived?: string;
  truckName?: string;
  plateNumber?: string;
  driver?: string;
  driverId?: string;
  assignedDriverId?: string;
  helper?: string;
  helperId?: string;
  assignedHelperId?: string;
  truckerContact?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDeparture?: string;
  transportDispatcher?: string;
  remarks?: string;
  isDispatched?: boolean;
  dispatchedAt?: string;

  // Phase 4: Delivery Execution Fields
  currentLocation?: string;
  driverProgressStatus?: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered';
  progressUpdatedAt?: string;
  dateReceived?: string;
  receiverSignature?: string;
  deliveryRemarks?: string;
}

export interface DeliveryDispatchData {
  timeArrived?: string;
  truckName?: string;
  plateNumber?: string;
  driver?: string;
  helper?: string;
  truckerContact?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDeparture?: string;
  transportDispatcher?: string;
  truckDispatchPod?: string;
  remarks?: string;
}

/**
 * Phase 2: Truck Run / Dispatch entity
 * Consolidates multiple IndividualDeliveries served by one truck.
 * Has its own separate Truck/Dispatch POD that never overwrites individual consignment PODs.
 */
export type TruckRunStatus = 'Planned' | 'Ready for Dispatch' | 'Dispatched' | 'Completed' | 'Cancelled';

export type DispatchOperationalStatus = 
  | 'READY FOR DISPATCH' 
  | 'ARRIVED' 
  | 'LOADING' 
  | 'LOADING COMPLETED' 
  | 'DEPARTED';

export interface TruckRun {
  id: string; // e.g. "TRK-RUN-001"
  truckRunNumber: string; // e.g. "TRUCK RUN #001"
  truckDispatchPod: string; // e.g. "TRK-001" (Truck/Dispatch POD - separate from individual delivery PODs)
  plannedDispatchDate: string; // YYYY-MM-DD
  clients: string[]; // Associated clients
  client?: string; // Primary associated client
  clientId?: string; // Primary associated client ID
  deliveryBatchNames: string[]; // Names of batches involved
  batchId?: string; // Associated primary batch if single batch
  batchName?: string; // Primary batch name if single batch
  deliveryArea: string; // Luzon, Visayas, Mindanao, NCR
  routeLocation: string; // Route / Location (e.g. "Antipolo - Cainta Corridor")
  truckSource: string; // e.g. "OFII Dedicated Fleet", "AB Braza Trucking", "3PL Freight"
  plateNumber: string; // Plate Number
  driver: string; // Driver name
  driverId?: string; // Driver unique ID (e.g. DRV-001, DRV-A)
  assignedDriverId?: string;
  driverContact?: string;
  helper?: string; // Helper name
  helperId?: string; // Helper unique ID (e.g. HLP-001, HLP-A)
  assignedHelperId?: string;
  helperContact?: string;
  remarks?: string;
  status: TruckRunStatus;
  deliveryIds: string[]; // List of assigned IndividualDelivery IDs
  totalDeliveries?: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;

  // Phase 3B: Dispatcher Portal Operational Encoding Fields (Additive)
  truckName?: string; // Fleet / Vehicle name (e.g. "OFII Dedicated 6-Wheeler")
  truckerContact?: string; // Trucker's Contact Number
  timeArrived?: string; // Arrival at dispatch bay / hub (e.g. "07:30 AM")
  startLoadingTime?: string; // Start loading cargo (e.g. "08:00 AM")
  endLoadingTime?: string; // Loading completed (e.g. "09:15 AM")
  actualDeparture?: string; // Gate departure time (e.g. "09:30 AM")
  transportDispatcher?: string; // Name of Transport Dispatcher who handled dispatch
  dispatchOperationalStatus?: DispatchOperationalStatus; // Operational status derived from time fields
}

/**
 * Phase 2.5: Office-Side New Delivery Notification for Truck Planner
 * Alerts Truck Planners when a Delivery Name / Batch has new individual deliveries ready for truck planning.
 */
export type TruckPlannerNotificationType = 'NEW_PROJECT_CREATED' | 'NEW_DELIVERIES_AVAILABLE';

export interface TruckPlannerNotification {
  id: string; // e.g. "TP-NOTIF-1725900000-001"
  type: TruckPlannerNotificationType;
  title: string; // e.g. "🔔 New Project Created" or "🔔 New Deliveries Available"
  batchId: string; // Associated Delivery Batch ID
  batchName: string; // Delivery Name (e.g. "GADC AUGUST 2026 BATCH A")
  client: string; // Client name
  newDeliveriesCount: number; // Number of new individual deliveries added (0 if new project with no initial deliveries)
  deliveryIds: string[]; // List of created/imported IndividualDelivery IDs
  createdAt: string; // ISO timestamp
  isRead: boolean;
  source: 'PROJECT_CREATE' | 'MANUAL_CREATE' | 'MANUAL_ADD' | 'EXCEL_IMPORT';
  message?: string; // e.g. "The project is ready for delivery processing." or "25 new individual deliveries are ready for Truck Planning."
}

/**
 * Phase 3B.8: Dispatcher to Encoder Notification
 * Alerts the ENCODER role when an individual delivery has been dispatched and is ready for Daily Dispatching Monitoring review.
 */
export interface EncoderDispatchNotification {
  id: string; // e.g. "ENC-NOTIF-DEL-1001-1725900000"
  title: string; // "Dispatch Ready for Daily Monitoring"
  message: string; // e.g. "Dispatch information for DEL-1001 is ready for Encoder review in Daily Dispatching Monitoring."
  deliveryId: string; // e.g. "DEL-1001"
  individualDeliveryId: string;
  batchId?: string;
  batchName: string; // Delivery Name / Batch (e.g. "Project 1")
  client: string;
  consignee: string;
  place: string; // Destination / Location (e.g. "Antipolo City, Rizal")
  deliveryArea?: string; // Delivery Area e.g. "Luzon"
  quantity?: number; // Quantity
  individualDeliveryPod: string; // e.g. "87890"
  truckDispatchPod?: string; // Truck / Dispatch POD, if available
  actualDeparture?: string; // e.g. "08:15 AM"
  truckDispatchNumber?: string; // Truck Run / Dispatch Number e.g. "TRUCK RUN #001" / "TRK-2026-001"
  dispatchRecordId?: string; // Linked Daily Dispatching Monitoring Record ID
  forwardingRecordId?: string; // Linked Forwarding Progressive Record ID (Optional legacy ref)
  isRead: boolean;
  readAt?: string;
  createdAt: string; // ISO string
  updatedAt?: string;
}

/**
 * Phase 5.1: Driver Delivery Confirmation Notification for Encoder (POD Returning Module)
 * Automatically created when an assigned Driver marks an Individual Delivery as DELIVERED.
 * Strictly placed inside the POD RETURNING module.
 */
export interface PodReturningNotification {
  id: string; // e.g. "POD-RET-NOTIF-DEL-1001-1725900000"
  title: string; // "Delivery Completed — POD Return Pending"
  message: string; // "Driver has marked Delivery DEL-1001 as delivered. Please monitor and encode the POD return."
  deliveryId: string; // Delivery ID e.g. "DEL-1001"
  recordId: string; // Linked Forwarding / Individual Delivery Record ID
  batchId?: string;
  batchName: string; // Delivery Name / Batch
  client: string;
  consignee: string;
  place: string; // Place / Destination
  quantity: number;
  unit?: string;
  individualDeliveryPod: string; // Individual Delivery POD Number (read-only)
  truckRunNumber: string; // Truck Run Number
  assignedDriver: string; // Assigned Driver
  recipientName?: string; // Recipient Name — Full name of the person who physically received the delivery
  driverRecipientName?: string; // Original Driver-entered recipient name (never deleted)
  recipientNameHistory?: RecipientNameHistoryEntry[]; // History of Recipient Name changes
  receiversName?: string;
  actualDeliveryDate: string; // Actual Delivery Date
  dateReceived?: string;
  deliveryStatus: 'DELIVERED';
  podStatus: 'PENDING' | 'HIT' | 'MISSED';
  podReturnDueDate?: string;
  podReturnDueDateFormatted?: string;
  podReturnDate?: string;
  podRemarks?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ForwardingProgressiveRecord {
  id: string;
  // Linked Individual Delivery & Operational Identification (Phase 3B.7)
  deliveryId?: string;
  batchId?: string;
  batchName?: string;
  individualDeliveryId?: string;
  individualDeliveryPod?: string;
  truckRunNumber?: string;
  truckDispatchPod?: string;
  transportDispatcher?: string;
  truckName?: string;
  truckerContact?: string;
  dispatchOperationalStatus?: DispatchOperationalStatus;

  // 1. PROJECT / CLIENT INFORMATION
  month: string;
  coordinator: string;
  client: string;
  clientId?: string;
  modeOfShipment: ForwardingMode;
  area: PhilippineArea;
  referenceNumber: string; // Project Code / Ref

  // 2. DISPATCH & DESTINATION
  actualDispatchDate: string;
  consignee: string;
  destinationCode: string;
  destination?: string;
  plannedDeliveryDate?: string;
  expectedDeliveryDate?: string; // Centralized Leadtime Calculation Result (Prompt 2E-1)
  expectedDeliveryDateFormatted?: string;
  requestDeliveryDate?: string; // Request Delivery Date (RDD - Prompt 2E-2: Client Specific Requirement, Optional)
  leadtimeStatus?: string;
  leadtimeMessage?: string;
  quantity: number;
  unit?: string;
  courier: string;
  vehicle?: string;
  truckProvider?: string;
  plateNumber?: string;
  driverName?: string;
  assignedDriver?: string;
  assignedDriverId?: string;
  helperName?: string;
  assignedHelper?: string;
  assignedHelperId?: string;
  assignmentStatus?: 'Unassigned' | 'Assigned';
  assignmentDate?: string;
  deliveryType?: DeliveryType;
  timeArrived?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDepartureTime?: string;
  truckArrivalTime?: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  departureTime?: string;

  // 3. CARGO INFORMATION (Conditional)
  cbm?: number; // Sea Freight
  volumeWeightKg?: number; // Air Freight
  actualWeightKg?: number; // Air Freight / General
  chargeableWeightFees: string;
  declaredValue: string;

  // 4. SHIPMENT REFERENCES
  podNumber: string;
  awbCourierRefNumber: string;
  drNumber?: string;
  sealNumber?: string;
  itemDescription?: string;

  // 5. DELIVERY INFORMATION
  deliveryStatus: ForwardingDeliveryStatus;
  receiversName: string;
  recipientName?: string; // Recipient Name — Full name of the person who physically received the delivery
  driverRecipientName?: string; // Original Driver-entered recipient name (never deleted)
  recipientNameHistory?: RecipientNameHistoryEntry[]; // History of Recipient Name changes
  actualDeliveryDate: string;
  deliveryDate?: string;
  remarks?: string;
  deliveryRemarks?: string;
  currentLocation?: string;
  driverProgressStatus?: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered';
  progressUpdatedAt?: string;
  dateReceived?: string;
  receiverSignature?: string;

  // 6. DELIVERY PERFORMANCE (Calculated)
  deliveryLeadTimeDays: number;
  deliveryTatDays: number;
  deliveryPerformance: PerformanceResult;
  reasonForDelay?: string;
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;

  // 7. POD MONITORING (Calculated)
  podStatus: PODStatus;
  dateOfPodReturn: string;
  actualPodReturnDate?: string;
  podLeadTimeDays: number;
  podReturnDueDate?: string; // YYYY-MM-DD
  podReturnDueDateFormatted?: string;
  podTatDays: number;
  podPerformance: PerformanceResult;
  podReasonForDelay?: string;

  // 8. SAFE DELETE & RECOVERY AUDIT
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;

  // 9. IMPORT SOURCE & AUDIT
  importSource?: 'Manual Entry' | 'Excel Import';
  importedAt?: string;
}

export interface UnifiedShipment {
  id: string; // e.g. "DSP-2026-0801" or "FPR-2026-001"
  
  // 1. Account & Consignment Identification
  client: string;
  clientId?: string;
  coordinator?: string;
  month?: string;
  deliveryType?: DeliveryType;
  modeOfShipment: ForwardingMode | 'Multimodal';
  area: PhilippineArea;
  referenceNumber: string;

  // 2. Dispatch & Origin / Destination
  originPickupPoint?: string;
  destination: string;
  destinationCode?: string;
  consignee: string;
  contactNumber?: string;
  
  // 3. Cargo Details
  itemDescription?: string;
  quantity: number;
  unit: string;
  declaredValue?: string;
  chargeableWeightFees?: string;
  chargePerWeight?: string;
  cbm?: number;
  volumeWeightKg?: number;
  actualWeightKg?: number;

  // 4. Transport & Equipment Assignment
  truckProvider?: string;
  courier?: string;
  plateNumber?: string;
  vanNumber?: string;
  driverName?: string;
  assignedDriver?: string;
  driverContact?: string;
  vesselFlightNo?: string;

  // 5. Operational Timeline & Clock
  bookedDate?: string;
  pickupDate?: string;
  actualDispatchDate: string;
  deliveryDate?: string;
  plannedDeliveryDate: string;
  expectedDeliveryDate?: string;
  requestDeliveryDate?: string; // Request Delivery Date (RDD - Client Specific Requirement, Optional)
  actualDeliveryDate?: string;
  truckArrivalTime?: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  departureTime?: string;
  timeArrived?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDepartureTime?: string;
  dateTransmitted?: string;

  // 6. Documentation References
  podNumber: string;
  manifestNumber?: string;
  awbNumber?: string;
  awbCourierRefNumber?: string;
  drNumber?: string;
  sealNumber?: string;
  billOfLandingNumber?: string;
  remarks?: string;
  deliveryRemarks?: string;

  // 7. Multi-View Operational Statuses
  dispatchStatus: DispatchStatus;
  shipmentStatus: ShipmentStatus;
  deliveryStatus: ForwardingDeliveryStatus;
  receiversName?: string;
  currentLocation?: string;
  driverProgressStatus?: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered';
  progressUpdatedAt?: string;
  dateReceived?: string;
  receiverSignature?: string;

  // 8. Automated Performance & SLA Metrics
  deliveryLeadTimeDays: number;
  deliveryTatDays: number;
  deliveryPerformance: PerformanceResult;
  reasonForDelay?: string;
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;
  numberOfDays?: number;
  tatNumber?: string;

  // 9. Automated POD Return Monitoring
  podStatus: PODStatus;
  dateOfPodReturn?: string;
  actualPodReturnDate?: string;
  podLeadTimeDays: number;
  podReturnDueDate?: string; // YYYY-MM-DD
  podReturnDueDateFormatted?: string;
  podTatDays: number;
  podPerformance: PerformanceResult;
  podReasonForDelay?: string;

  // 10. Safe Delete & Audit
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export interface DispatchRecord {
  id: string;
  deliveryDate: string;
  deliveryArea?: PhilippineArea;
  area?: PhilippineArea;
  modeOfShipment?: ForwardingMode | string;
  podNumber: string;
  truckDispatchPod?: string;
  dispatchPod?: string;
  truckRunNumber?: string;
  truckRunId?: string;
  batchId?: string;
  batchName?: string;
  individualDeliveryId?: string;
  deliveryId?: string;
  client?: string;
  clientId?: string;
  quantityCasesBoxes: number;
  unit: string;
  deliveryType: DeliveryType;
  destination: string;
  consignee: string;
  truckProvider: string;
  truckName?: string;
  vehicle?: string;
  plateNumber: string;
  truckArrivalTime?: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  departureTime?: string;
  timeArrived?: string;
  startLoadingTime?: string;
  endLoadingTime?: string;
  actualDepartureTime?: string;
  plannedDeliveryDate: string;
  actualDeliveryDate?: string;
  dispatchDate?: string;
  drNumber?: string;
  sealNumber?: string;
  itemDescription?: string;
  expectedDeliveryDate?: string;
  requestDeliveryDate?: string;
  manifestNumber: string;
  remarks: string;
  status: DispatchStatus;
  dispatchOperationalStatus?: DispatchOperationalStatus | string;
  currentLocation?: string;
  driverProgressStatus?: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered';
  progressUpdatedAt?: string;
  receiversName?: string;
  dateReceived?: string;
  receiverSignature?: string;
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;
  driverName?: string;
  assignedDriver?: string;
  assignedDriverId?: string;
  helperName?: string;
  assignedHelper?: string;
  assignedHelperId?: string;
  assignmentStatus?: 'Unassigned' | 'Assigned';
  assignmentDate?: string;
  driverContact?: string;
  clientName: string;
  totalWeightKg?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  importSource?: 'Manual Entry' | 'Excel Import';
  importedAt?: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  code: string;
  assignedCoordinator?: string;
  accountManager?: string;
  industry?: string;
  activeShipments?: number;
  deliveredThisMonth?: number;
  onTimeRate?: number; // e.g. 98.4%
  primaryContact: string;
  email: string;
  phone: string;
  address?: string;
  area?: string;
  remarks?: string;
  notes?: string;
  tin?: string;
  isDeactivated?: boolean;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export interface ShipmentRecord {
  id: string;
  // 1. Booking / Client Information
  client: string;
  clientId: string;
  monthStarted: string;
  bookedDate: string;
  pickupDate: string;
  consignee: string;
  contactNumber?: string;
  modeOfShipment: ForwardingMode | 'Multimodal';
  
  // 2. Origin and Destination
  originPickupPoint?: string;
  destination: string;
  area: PhilippineArea;
  requestedDeliveryDate?: string; // RDD
  
  // 3. Cargo Information
  itemDescription?: string;
  quantityBoxes: number;
  amount?: string;
  actualCbm?: number;
  volumeWeight?: number;
  actualWeightKg: number;
  chargePerWeight?: string;

  // 4. Transport Information
  vanNumber?: string;
  truckPlate?: string;
  plateNumber?: string;
  driverName?: string;
  assignedDriver?: string;
  assignedDriverId?: string;
  helperName?: string;
  assignedHelper?: string;
  assignedHelperId?: string;
  assignmentStatus?: 'Unassigned' | 'Assigned';
  assignmentDate?: string;
  vesselFlightNo?: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  estimatedArrival?: string;
  actualArrival?: string;

  // 5. Delivery and Documentation
  podNumber: string;
  awbNumber?: string;
  drNumber?: string;
  sealNumber?: string;
  billOfLandingNumber?: string;
  manifestNumber?: string;
  plannedDeliveryDate?: string; // Planned Delivery Date
  expectedDeliveryDate?: string; // Centralized Leadtime Calculation Result
  requestDeliveryDate?: string; // Request Delivery Date (RDD)
  actualDeliveryDate?: string;  // Actual Delivery Date
  deliveryDate: string;        // Delivery Date / Actual Delivery Date reference
  receiversName?: string;
  currentLocation?: string;
  driverProgressStatus?: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered';
  progressUpdatedAt?: string;
  dateReceived?: string;
  receiverSignature?: string;
  datePodReceived?: string;
  dateTransmitted?: string;
  deliveryRemarks?: string;

  // 6. Performance
  status: ShipmentStatus;
  podStatus?: PODStatus;
  leadTime?: string; // e.g. "3 Days"
  podLeadTimeDays?: number;
  podReturnDueDate?: string;
  podReturnDueDateFormatted?: string;
  tatNumber?: string; // Turn Around Time e.g. "TAT-0482"
  deliveryPerformance?: 'On-Time' | 'Delayed' | 'Within SLA' | 'Pending Delivery';
  delayReason?: DelayReason | string;
  delayReasonDetails?: string;
  numberOfDays?: number;

  // 7. Safe Delete & Audit
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export type OperationalRecordType = 'dispatch' | 'shipment' | 'forwarding_report' | 'client';

export interface TrashItem {
  id: string;
  recordType: OperationalRecordType;
  recordIdentifier: string; // e.g. POD-884920, PRJ-ISCI-049, or Client Code
  title: string;
  clientName: string;
  originalDate?: string;
  originalStatus?: string;
  deletedAt: string;
  deletedBy: string;
  deleteReason?: string;
  additionalDetails?: string;
}

export interface DashboardSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  onTimePercentage: number;
  activeTrucks: number;
  totalBoxesToday: number;
}

export type AccountRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AccountRegistrationRequest {
  id: string;
  name: string;
  loginId: string;
  username?: string;
  email: string;
  employeeId?: string;
  department?: string;
  requestedRole: CanonicalRole;
  approvedRole?: CanonicalRole;
  status: AccountRequestStatus;
  createdAt: string;
  createdTimestamp: number;
  passwordHash: string;
  password?: string;
  assignedClients?: string[];
  vehiclePlate?: string;
  contactNumber?: string;
  hubLocation?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reviewNotes?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  role: string;
  userRole?: UserRole;
  department: string;
  email: string;
  employeeId: string;
  hubLocation: string;
  isActive?: boolean;
  driverName?: string;
  driverId?: string;
  vehiclePlate?: string;
  assignedVehicle?: string;
  licenseNumber?: string;
  contactNumber?: string;
  username?: string;
  loginId?: string;
  password?: string;
  passwordHash?: string;
  assignedClients?: string[];
  createdAt?: string;
  createdBy?: string;
  accountStatus?: 'Active' | 'Disabled';
  approvalStatus?: AccountRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface BusinessRule {
  id: string;
  clientName?: string;
  modeOfShipment?: ForwardingMode | string;
  area?: PhilippineArea | string;
  deliveryMethod?: string;
  deliveryLeadTimeDays: number;
  podLeadTimeDays?: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  provider: 'supabase' | 'shared-cloud-sync';
  errorMessage?: string | null;
}

export interface ImportHistoryRecord {
  id: string;
  fileName: string;
  fileSize?: string;
  importedAt: string;
  importedBy: string;
  totalRows: number;
  successfullyImported: number;
  warnings: number;
  skipped: number;
  status: 'Completed' | 'Partially Completed' | 'Failed';
  details?: string;
}

export type OFIIFieldKey =
  | 'none'
  | 'month'
  | 'coordinator'
  | 'client'
  | 'modeOfShipment'
  | 'area'
  | 'actualDispatchDate'
  | 'expectedDeliveryDate'
  | 'requestDeliveryDate'
  | 'plannedDeliveryDate'
  | 'consignee'
  | 'destination'
  | 'destinationCode'
  | 'quantity'
  | 'unit'
  | 'cbm'
  | 'referenceNumber'
  | 'volumeWeightKg'
  | 'actualWeightKg'
  | 'chargeableWeightFees'
  | 'declaredValue'
  | 'courier'
  | 'truckProvider'
  | 'plateNumber'
  | 'driverName'
  | 'podNumber'
  | 'awbCourierRefNumber'
  | 'deliveryStatus'
  | 'receiversName'
  | 'actualDeliveryDate'
  | 'podStatus'
  | 'dateOfPodReturn'
  | 'deliveryTatDays'
  | 'deliveryLeadTimeDays'
  | 'deliveryPerformance'
  | 'reasonForDelay'
  | 'podTatDays'
  | 'podLeadTimeDays'
  | 'podPerformance'
  | 'podReasonForDelay'
  | 'timeArrived'
  | 'startLoadingTime'
  | 'endLoadingTime'
  | 'actualDepartureTime'
  | 'truckArrivalTime'
  | 'loadingStartTime'
  | 'loadingEndTime'
  | 'departureTime'
  | 'deliveryType'
  | 'drNumber'
  | 'sealNumber'
  | 'itemDescription';

