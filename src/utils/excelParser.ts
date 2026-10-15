import * as XLSX from 'xlsx';
import { OFIIFieldKey, ClientSummary, DispatchRecord, ForwardingProgressiveRecord } from '../types';

export interface OFIISharedColumnDefinition {
  excelHeader: string;
  systemField: OFIIFieldKey;
  label: string;
  required: boolean;
  category: 'Required' | 'Identification' | 'Cargo' | 'Delivery' | 'POD';
  dataType: 'string' | 'number' | 'date' | 'time';
  description: string;
  aliases: string[];
  modules: ('forwarding' | 'dispatch')[];
  columnWidth: number;
  sampleValueForwarding?: any;
  sampleValueDispatch?: any;
}

export interface OFIIFieldDefinition {
  key: OFIIFieldKey;
  label: string;
  required: boolean;
  category: 'Required' | 'Identification' | 'Cargo' | 'Delivery' | 'POD';
  description: string;
  aliases: string[];
}

/**
 * DAILY DISPATCHING MONITORING EXCEL SCHEMA
 * Strictly contains the 17 fields relevant to Daily Dispatching.
 * No Forwarding-specific columns. No Record Type column.
 */
export const DAILY_DISPATCH_SCHEMA: OFIISharedColumnDefinition[] = [
  {
    excelHeader: 'S.I / POD Number',
    systemField: 'podNumber',
    label: 'S.I / POD Number',
    required: true,
    category: 'POD',
    dataType: 'string',
    description: 'Proof of Delivery document or Sales Invoice number',
    aliases: ['s.i / pod number', 's.i / pod', 's.i/pod number', 'si / pod number', 'si/pod', 'pod', 'pod number', 'pod no', 'pod no.', 's.i number', 'si number'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: 'POD-88101',
  },
  {
    excelHeader: 'DR Number',
    systemField: 'drNumber',
    label: 'DR Number',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Delivery Receipt tracking number',
    aliases: ['dr number', 'dr no', 'dr no.', 'delivery receipt', 'dr', 'delivery receipt number'],
    modules: ['dispatch'],
    columnWidth: 16,
    sampleValueDispatch: 'DR-99201',
  },
  {
    excelHeader: 'Seal Number',
    systemField: 'sealNumber',
    label: 'Seal Number',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Container or truck security seal identifier',
    aliases: ['seal number', 'seal no', 'seal no.', 'seal', 'security seal', 'container seal'],
    modules: ['dispatch'],
    columnWidth: 16,
    sampleValueDispatch: 'SL-77821',
  },
  {
    excelHeader: 'Client Name',
    systemField: 'client',
    label: 'Client Name',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Registered client enterprise (e.g. Philippine Charity Sweepstakes Office)',
    aliases: ['client name', 'client', 'customer', 'customer name', 'account', 'shipper', 'principal'],
    modules: ['dispatch'],
    columnWidth: 38,
    sampleValueDispatch: 'Philippine Charity Sweepstakes Office',
  },
  {
    excelHeader: 'Item Description',
    systemField: 'itemDescription',
    label: 'Item Description',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Brief description of cargo, materials, or pharmaceutical products',
    aliases: ['item description', 'description', 'item', 'cargo description', 'commodity', 'goods description'],
    modules: ['dispatch'],
    columnWidth: 28,
    sampleValueDispatch: 'Pharmaceutical Supplies & Medical Kits',
  },
  {
    excelHeader: 'Planned Delivery Date',
    systemField: 'plannedDeliveryDate',
    label: 'Planned Delivery Date',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Target or scheduled delivery arrival date (MM/DD/YYYY)',
    aliases: ['planned delivery date', 'planned delivery', 'target delivery date', 'scheduled delivery date', 'scheduled date', 'target date', 'pdd'],
    modules: ['dispatch'],
    columnWidth: 22,
    sampleValueDispatch: '08/28/2026',
  },
  {
    excelHeader: 'Actual Delivery Date',
    systemField: 'actualDeliveryDate',
    label: 'Actual Delivery Date',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Actual date received by consignee (MM/DD/YYYY)',
    aliases: ['actual delivery date', 'delivery date', 'date delivered', 'delivered date'],
    modules: ['dispatch'],
    columnWidth: 22,
    sampleValueDispatch: '08/28/2026',
  },
  {
    excelHeader: 'Quantity',
    systemField: 'quantity',
    label: 'Quantity',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Number of units, boxes, or cases loaded',
    aliases: ['quantity', 'qty', 'cases', 'boxes', 'packages', 'quantity cases boxes', 'total cases'],
    modules: ['dispatch'],
    columnWidth: 12,
    sampleValueDispatch: 120,
  },
  {
    excelHeader: 'Delivery Type',
    systemField: 'deliveryType',
    label: 'Delivery Type',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Delivery category: Land Freight, Sea Freight, Air Freight, FTL, LTL',
    aliases: ['delivery type', 'type', 'service type', 'shipment type', 'freight type'],
    modules: ['dispatch'],
    columnWidth: 16,
    sampleValueDispatch: 'FTL',
  },
  {
    excelHeader: 'Place / Delivery Area',
    systemField: 'area',
    label: 'Place / Delivery Area',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Philippine destination zone (Luzon, Visayas, Mindanao) or terminal place',
    aliases: ['place / delivery area', 'place', 'delivery area', 'area', 'region', 'destination area', 'zone', 'place delivery area'],
    modules: ['dispatch'],
    columnWidth: 22,
    sampleValueDispatch: 'Luzon',
  },
  {
    excelHeader: 'Consignee',
    systemField: 'consignee',
    label: 'Consignee',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Receiving party, store, hospital, or regional distributor',
    aliases: ['consignee', 'consignee name', 'receiver', 'recipient', 'deliver to'],
    modules: ['dispatch'],
    columnWidth: 36,
    sampleValueDispatch: 'Mercury Drug - Cebu Main',
  },
  {
    excelHeader: 'Truck',
    systemField: 'courier',
    label: 'Truck',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Vehicle type or assigned hauling provider (e.g. 10W Wing Van, 4W Closed Van)',
    aliases: ['truck', 'truck used', 'vehicle', 'hauler', 'truck provider', 'carrier', 'courier'],
    modules: ['dispatch'],
    columnWidth: 20,
    sampleValueDispatch: '10W Wing Van',
  },
  {
    excelHeader: 'Plate Number',
    systemField: 'plateNumber',
    label: 'Plate Number',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Vehicle license plate number (e.g. NDB-4921)',
    aliases: ['plate number', 'plate no', 'plate no.', 'truck plate', 'vehicle plate'],
    modules: ['dispatch'],
    columnWidth: 16,
    sampleValueDispatch: 'NDB-4921',
  },
  {
    excelHeader: 'Truck Arrival Time',
    systemField: 'timeArrived',
    label: 'Truck Arrival Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time vehicle arrived at compound (e.g. 07:30 AM)',
    aliases: ['truck arrival time', 'truck arrival', 'time arrived', 'arrival time', 'time in', 'gate in'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: '07:30 AM',
  },
  {
    excelHeader: 'Start Loading Time',
    systemField: 'startLoadingTime',
    label: 'Start Loading Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time loading operations started (e.g. 08:00 AM)',
    aliases: ['start loading time', 'start loading', 'loading start', 'loading start time', 'started loading'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: '08:00 AM',
  },
  {
    excelHeader: 'End Loading Time',
    systemField: 'endLoadingTime',
    label: 'End Loading Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time loading operations finished (e.g. 09:15 AM)',
    aliases: ['end loading time', 'end loading', 'loading end', 'loading end time', 'loading finished'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: '09:15 AM',
  },
  {
    excelHeader: 'Actual Departure Time',
    systemField: 'actualDepartureTime',
    label: 'Actual Departure Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time vehicle departed from compound (e.g. 09:45 AM)',
    aliases: ['actual departure time', 'actual departure', 'departure time', 'truck departure', 'time out', 'gate out'],
    modules: ['dispatch'],
    columnWidth: 20,
    sampleValueDispatch: '09:45 AM',
  },
  {
    excelHeader: 'Dispatch Date',
    systemField: 'actualDispatchDate',
    label: 'Dispatch Date',
    required: true,
    category: 'Required',
    dataType: 'date',
    description: 'Actual dispatch date (MM/DD/YYYY)',
    aliases: ['dispatch date', 'date / dispatch date', 'date', 'actual dispatch date', 'date dispatched'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: '08/25/2026',
  },
  {
    excelHeader: 'Manifest Number',
    systemField: 'referenceNumber',
    label: 'Manifest Number',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Trip manifest or dispatch reference identifier',
    aliases: ['manifest number', 'manifest no', 'manifest', 'manifest ref', 'trip number', 'trip no'],
    modules: ['dispatch'],
    columnWidth: 28,
    sampleValueDispatch: 'MNF-2026-0825 [SAMPLE — DELETE BEFORE IMPORT]',
  },
  {
    excelHeader: 'Remarks',
    systemField: 'reasonForDelay',
    label: 'Remarks',
    required: false,
    category: 'Delivery',
    dataType: 'string',
    description: 'Operational notes or special handling remarks',
    aliases: ['remarks', 'remark', 'notes', 'comments', 'special instructions'],
    modules: ['dispatch'],
    columnWidth: 32,
    sampleValueDispatch: 'SAMPLE — DELETE BEFORE IMPORT',
  },
];

/**
 * FORWARDING PROGRESSIVE REPORT EXCEL SCHEMA
 * Strictly contains the 18 fields relevant to Forwarding Progressive Report.
 * No Daily Dispatching-specific columns. No Record Type column.
 */
export const FORWARDING_PROGRESSIVE_SCHEMA: OFIISharedColumnDefinition[] = [
  {
    excelHeader: 'Month',
    systemField: 'month',
    label: 'Month',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Operational tracking month (e.g. August 2026)',
    aliases: ['month', 'billing month', 'period', 'cycle', 'month started'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 'August 2026',
  },
  {
    excelHeader: 'Client Name',
    systemField: 'client',
    label: 'Client Name',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Registered client enterprise (e.g. Intelligent Skin Care Inc., Philippine Charity Sweepstakes Office)',
    aliases: ['client name', 'client', 'customer', 'customer name', 'account', 'shipper', 'principal'],
    modules: ['forwarding'],
    columnWidth: 38,
    sampleValueForwarding: 'Intelligent Skin Care Inc.',
  },
  {
    excelHeader: 'Coordinator',
    systemField: 'coordinator',
    label: 'Coordinator',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Account coordinator (Auto-assigned from Client Name if omitted)',
    aliases: ['coordinator', 'account coordinator', 'assigned coordinator', 'ops coordinator', 'coordinator name'],
    modules: ['forwarding'],
    columnWidth: 22,
    sampleValueForwarding: 'Rojaylene Baldesancho',
  },
  {
    excelHeader: 'Mode of Shipment',
    systemField: 'modeOfShipment',
    label: 'Mode of Shipment',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Transport method: Air, Land, Sea, or RORO',
    aliases: ['mode of shipment', 'mode', 'shipment mode', 'transport mode', 'freight mode', 'shipping mode'],
    modules: ['forwarding'],
    columnWidth: 18,
    sampleValueForwarding: 'Air',
  },
  {
    excelHeader: 'Delivery Area',
    systemField: 'area',
    label: 'Delivery Area',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Philippine destination zone: Luzon, Visayas, or Mindanao',
    aliases: ['delivery area', 'area', 'region', 'destination area', 'zone', 'island group'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 'Luzon',
  },
  {
    excelHeader: 'Actual Dispatched Date',
    systemField: 'actualDispatchDate',
    label: 'Actual Dispatched Date',
    required: true,
    category: 'Required',
    dataType: 'date',
    description: 'Dispatch date from origin warehouse (MM/DD/YYYY)',
    aliases: ['actual dispatched date', 'actual dispatch date', 'dispatch date', 'date dispatched', 'date'],
    modules: ['forwarding'],
    columnWidth: 22,
    sampleValueForwarding: '08/25/2026',
  },
  {
    excelHeader: 'Consignee',
    systemField: 'consignee',
    label: 'Consignee',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Receiving party, store, or consignee hub',
    aliases: ['consignee', 'consignee name', 'receiver', 'recipient', 'deliver to'],
    modules: ['forwarding'],
    columnWidth: 36,
    sampleValueForwarding: 'Watsons Personal Care Stores - SM Megamall',
  },
  {
    excelHeader: 'Destination Code',
    systemField: 'destinationCode',
    label: 'Destination Code',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Hub code or port identifier (e.g. MNL-01, CEB-02)',
    aliases: ['destination code', 'dest code', 'destination', 'port code', 'hub code', 'code'],
    modules: ['forwarding'],
    columnWidth: 18,
    sampleValueForwarding: 'MNL-01',
  },
  {
    excelHeader: 'Quantity',
    systemField: 'quantity',
    label: 'Quantity',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Total units / boxes count',
    aliases: ['quantity', 'qty', 'boxes', 'cases', 'cartons'],
    modules: ['forwarding'],
    columnWidth: 12,
    sampleValueForwarding: 150,
  },
  {
    excelHeader: 'CBM',
    systemField: 'cbm',
    label: 'CBM',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Cubic meters volume measurement (e.g. 4.5)',
    aliases: ['cbm', 'volume cbm', 'cubic meter', 'cubic meters'],
    modules: ['forwarding'],
    columnWidth: 12,
    sampleValueForwarding: 4.5,
  },
  {
    excelHeader: 'Reference Number',
    systemField: 'referenceNumber',
    label: 'Reference Number',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Client project code or reference identifier (e.g. PRJ-ISCI-901)',
    aliases: ['reference number', 'ref no', 'ref no.', 'project code', 'reference no', 'reference'],
    modules: ['forwarding'],
    columnWidth: 42,
    sampleValueForwarding: 'PRJ-ISCI-901 [SAMPLE — DELETE BEFORE IMPORT]',
  },
  {
    excelHeader: 'Volume Weight',
    systemField: 'volumeWeightKg',
    label: 'Volume Weight',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Volumetric weight in kilograms',
    aliases: ['volume weight', 'vol weight', 'volumetric weight', 'volume weight kg'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 750,
  },
  {
    excelHeader: 'Actual Weight',
    systemField: 'actualWeightKg',
    label: 'Actual Weight',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Scale gross weight in kilograms (e.g. 1200)',
    aliases: ['actual weight', 'gross weight', 'scale weight', 'weight kg', 'actual weight kg'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 1200,
  },
  {
    excelHeader: 'Fees',
    systemField: 'chargeableWeightFees',
    label: 'Fees',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Chargeable freight rate or billed amount (e.g. PHP 35,000.00)',
    aliases: ['fees', 'chargeable fees', 'freight charges', 'rate', 'freight fee', 'amount'],
    modules: ['forwarding'],
    columnWidth: 18,
    sampleValueForwarding: 'PHP 35,000.00',
  },
  {
    excelHeader: 'RDD',
    systemField: 'requestDeliveryDate',
    label: 'RDD',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Client-agreed Request Delivery Date (MM/DD/YYYY)',
    aliases: ['rdd', 'request delivery date', 'requested delivery date', 'client rdd'],
    modules: ['forwarding'],
    columnWidth: 14,
    sampleValueForwarding: '08/30/2026',
  },
  {
    excelHeader: 'Actual Delivery Date',
    systemField: 'actualDeliveryDate',
    label: 'Actual Delivery Date',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Date cargo arrived and was received at consignee (MM/DD/YYYY)',
    aliases: ['actual delivery date', 'delivery date', 'date delivered', 'delivered date'],
    modules: ['forwarding'],
    columnWidth: 20,
    sampleValueForwarding: '08/29/2026',
  },
  {
    excelHeader: 'POD Number',
    systemField: 'podNumber',
    label: 'POD Number',
    required: false,
    category: 'POD',
    dataType: 'string',
    description: 'Proof of Delivery hardcopy document number',
    aliases: ['pod number', 'pod no', 'pod no.', 'pod'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 'POD-94108',
  },
  {
    excelHeader: 'Actual POD Return Date',
    systemField: 'dateOfPodReturn',
    label: 'Actual POD Return Date',
    required: false,
    category: 'POD',
    dataType: 'date',
    description: 'Date signed hardcopy POD was received back at OFII hub (MM/DD/YYYY)',
    aliases: ['actual pod return date', 'pod return date', 'date of pod return', 'pod returned date', 'actual return date'],
    modules: ['forwarding'],
    columnWidth: 22,
    sampleValueForwarding: '09/01/2026',
  },
];

/**
 * Single Unified Column Schema for both Template Generation and Importer Column Mapping.
 */
export const OFII_SHARED_SCHEMA: OFIISharedColumnDefinition[] = [
  // 1. Forwarding & Core Shared Columns
  {
    excelHeader: 'Month',
    systemField: 'month',
    label: 'Month',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Operational tracking month (e.g. August 2026)',
    aliases: ['month', 'billing month', 'period', 'cycle', 'month started'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 'August 2026',
  },
  {
    excelHeader: 'Coordinator',
    systemField: 'coordinator',
    label: 'Coordinator',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Account coordinator (Auto-assigned from Client Name if omitted)',
    aliases: ['coordinator', 'account coordinator', 'assigned coordinator', 'ops coordinator', 'coordinator name'],
    modules: ['forwarding'],
    columnWidth: 22,
    sampleValueForwarding: 'Rojaylene Baldesancho',
  },
  {
    excelHeader: 'Client Name',
    systemField: 'client',
    label: 'Client Name',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Registered client enterprise (e.g. Intelligent Skin Care Inc., Philippine Charity Sweepstakes Office, RefaMED)',
    aliases: ['client name', 'client', 'customer', 'customer name', 'account', 'shipper', 'principal', 'client / account', 'client_name'],
    modules: ['forwarding', 'dispatch'],
    columnWidth: 38,
    sampleValueForwarding: 'Intelligent Skin Care Inc.',
    sampleValueDispatch: 'Philippine Charity Sweepstakes Office',
  },
  {
    excelHeader: 'Mode of Shipment',
    systemField: 'modeOfShipment',
    label: 'Mode of Shipment',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Transport method: Air, Land, Sea, or RORO',
    aliases: ['mode of shipment', 'mode', 'shipment mode', 'transport mode', 'freight mode', 'service type', 'shipping mode', 'delivery type', 'delivery mode', 'freight type'],
    modules: ['forwarding'],
    columnWidth: 18,
    sampleValueForwarding: 'Air',
  },
  {
    excelHeader: 'Delivery Area',
    systemField: 'area',
    label: 'Delivery Area',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Philippine destination zone: Luzon, Visayas, or Mindanao',
    aliases: ['delivery area', 'area', 'region', 'destination area', 'zone', 'island group', 'philippine area'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 'Luzon',
  },
  {
    excelHeader: 'Actual Dispatched Date',
    systemField: 'actualDispatchDate',
    label: 'Actual Dispatched Date',
    required: true,
    category: 'Required',
    dataType: 'date',
    description: 'Date freight left origin hub (MM/DD/YYYY or YYYY-MM-DD)',
    aliases: ['actual dispatched date', 'actual dispatch date', 'dispatch date', 'dispatched date', 'departure date', 'date dispatched', 'ship date', 'etd', 'dispatching date'],
    modules: ['forwarding'],
    columnWidth: 22,
    sampleValueForwarding: '08/25/2026',
  },
  {
    excelHeader: 'Consignee',
    systemField: 'consignee',
    label: 'Consignee',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Recipient business or store name',
    aliases: ['consignee', 'receiver', 'recipient', 'deliver to', 'consignee name', 'destination store', 'store'],
    modules: ['forwarding', 'dispatch'],
    columnWidth: 36,
    sampleValueForwarding: 'Watsons Personal Care Stores - SM Megamall',
    sampleValueDispatch: 'Mercury Drug - Cebu Main',
  },
  {
    excelHeader: 'Destination Code',
    systemField: 'destinationCode',
    label: 'Destination Code',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Specific port or city code (e.g. MNL-01, CDO-01, CEB-01, DVO-01)',
    aliases: ['destination code', 'dest code', 'port code', 'city code', 'hub', 'destination city', 'terminal code'],
    modules: ['forwarding'],
    columnWidth: 18,
    sampleValueForwarding: 'MNL-01',
  },
  {
    excelHeader: 'Quantity',
    systemField: 'quantity',
    label: 'Quantity',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Number of boxes or packages',
    aliases: ['quantity', 'qty', 'cases', 'boxes', 'packages', 'pkgs', 'pieces', 'units', 'cartons', 'quantity cases boxes'],
    modules: ['forwarding', 'dispatch'],
    columnWidth: 12,
    sampleValueForwarding: 150,
    sampleValueDispatch: 120,
  },
  {
    excelHeader: 'CBM',
    systemField: 'cbm',
    label: 'CBM',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Cubic volume for Sea / Air Freight',
    aliases: ['cbm', 'volume cbm', 'cubic meter', 'cubic meters'],
    modules: ['forwarding'],
    columnWidth: 10,
    sampleValueForwarding: 4.5,
  },
  {
    excelHeader: 'Reference Number',
    systemField: 'referenceNumber',
    label: 'Reference Number',
    required: true,
    category: 'Required',
    dataType: 'string',
    description: 'Unique project code or shipment reference (e.g. PRJ-ISCI-901)',
    aliases: ['reference number', 'ref no', 'ref no.', 'ref number', 'reference no', 'reference no.', 'project code', 'ref', 'so number', 'sales order'],
    modules: ['forwarding'],
    columnWidth: 42,
    sampleValueForwarding: 'PRJ-ISCI-901 [SAMPLE — DELETE BEFORE IMPORT]',
  },
  {
    excelHeader: 'Volume Weight',
    systemField: 'volumeWeightKg',
    label: 'Volume Weight',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Volumetric weight for Air Freight in kilograms',
    aliases: ['volume weight', 'volumetric weight', 'vol weight', 'volume weight kg', 'volume weight (kg)'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 750,
  },
  {
    excelHeader: 'Actual Weight',
    systemField: 'actualWeightKg',
    label: 'Actual Weight',
    required: false,
    category: 'Cargo',
    dataType: 'number',
    description: 'Gross cargo weight in kilograms',
    aliases: ['actual weight', 'weight', 'weight kg', 'weight (kg)', 'gross weight', 'actual weight kg', 'total weight kg', 'actual weight (kg)'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 1200,
  },
  {
    excelHeader: 'Fees',
    systemField: 'chargeableWeightFees',
    label: 'Fees / Chargeable Weight',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Billed amount or chargeable rate (e.g. PHP 35,000.00)',
    aliases: ['fees', 'chargeable fees', 'freight fee', 'rate', 'freight charges', 'chargeable weight fees', 'billing amount', 'amount', 'fees chargeable weight'],
    modules: ['forwarding'],
    columnWidth: 18,
    sampleValueForwarding: 'PHP 35,000.00',
  },
  {
    excelHeader: 'RDD',
    systemField: 'requestDeliveryDate',
    label: 'Request Delivery Date (RDD)',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Client-specific requested delivery deadline (MM/DD/YYYY or YYYY-MM-DD)',
    aliases: ['rdd', 'request delivery date', 'requested delivery date', 'client requested delivery date', 'client rdd', 'required delivery date', 'client delivery requirement', 'client deadline'],
    modules: ['forwarding'],
    columnWidth: 14,
    sampleValueForwarding: '08/30/2026',
  },
  {
    excelHeader: 'Actual Delivery Date',
    systemField: 'actualDeliveryDate',
    label: 'Delivery Date',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Date package was received by consignee (MM/DD/YYYY or YYYY-MM-DD)',
    aliases: ['actual delivery date', 'delivery date', 'date delivered', 'delivered date', 'received date'],
    modules: ['forwarding'],
    columnWidth: 20,
    sampleValueForwarding: '08/29/2026',
  },
  {
    excelHeader: 'POD Number',
    systemField: 'podNumber',
    label: 'POD Number',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Proof of Delivery document number (e.g. POD-94108)',
    aliases: ['pod number', 'pod', 'pod no', 'pod no.', 'dr number', 'dr no', 'delivery receipt'],
    modules: ['forwarding'],
    columnWidth: 16,
    sampleValueForwarding: 'POD-94108',
  },
  {
    excelHeader: 'Actual POD Return Date',
    systemField: 'dateOfPodReturn',
    label: 'POD Return Date',
    required: false,
    category: 'POD',
    dataType: 'date',
    description: 'Date signed hardcopy POD was returned to OFII hub',
    aliases: ['actual pod return date', 'pod return date', 'date of pod return', 'pod date', 'pod received date', 'date pod returned', 'actual pod return'],
    modules: ['forwarding'],
    columnWidth: 22,
    sampleValueForwarding: '09/01/2026',
  },

  // 2. Daily Dispatch Monitoring Columns
  {
    excelHeader: 'Date',
    systemField: 'actualDispatchDate',
    label: 'Dispatch Date',
    required: true,
    category: 'Required',
    dataType: 'date',
    description: 'Date of vehicle dispatch (MM/DD/YYYY or YYYY-MM-DD)',
    aliases: ['date', 'dispatch date', 'actual dispatch date', 'date dispatched', 'trip date'],
    modules: ['dispatch'],
    columnWidth: 15,
    sampleValueDispatch: '08/25/2026',
  },
  {
    excelHeader: 'POD',
    systemField: 'podNumber',
    label: 'POD Number',
    required: true,
    category: 'Identification',
    dataType: 'string',
    description: 'Proof of delivery / dispatch number (e.g. POD-88101)',
    aliases: ['pod', 'pod number', 'pod no', 'pod no.', 'dr number', 'dr no'],
    modules: ['dispatch'],
    columnWidth: 15,
    sampleValueDispatch: 'POD-88101',
  },
  {
    excelHeader: 'Delivery Type',
    systemField: 'modeOfShipment',
    label: 'Delivery Type / Mode',
    required: false,
    category: 'Required',
    dataType: 'string',
    description: 'Delivery classification or mode (e.g. Land Freight, Sea Freight, Air Freight)',
    aliases: ['delivery type', 'delivery mode', 'service type', 'freight mode'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: 'Sea Freight',
  },
  {
    excelHeader: 'Place',
    systemField: 'destination',
    label: 'Place / Destination',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Drop-off location / city / terminal destination',
    aliases: ['place', 'destination', 'location', 'delivery destination', 'destination address'],
    modules: ['dispatch'],
    columnWidth: 32,
    sampleValueDispatch: 'Cebu Fuente Osmena Terminal',
  },
  {
    excelHeader: 'Truck Used',
    systemField: 'courier',
    label: 'Truck Used / Provider',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Type of vehicle or carrier provider',
    aliases: ['truck used', 'truck type', 'vehicle type', 'truck provider', 'carrier', 'hauler', 'courier'],
    modules: ['dispatch'],
    columnWidth: 20,
    sampleValueDispatch: '10W Wing Van',
  },
  {
    excelHeader: 'Plate Number',
    systemField: 'plateNumber',
    label: 'Plate Number',
    required: false,
    category: 'Cargo',
    dataType: 'string',
    description: 'Vehicle license plate number (e.g. NDB-4921)',
    aliases: ['plate number', 'truck plate', 'plate no', 'plate no.', 'vehicle plate'],
    modules: ['dispatch'],
    columnWidth: 15,
    sampleValueDispatch: 'NDB-4921',
  },
  {
    excelHeader: 'Time Arrived',
    systemField: 'timeArrived',
    label: 'Time Arrived',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time vehicle arrived at compound (e.g. 07:30 AM)',
    aliases: ['time arrived', 'arrival time', 'truck arrival', 'truck arrival time', 'time in', 'gate in'],
    modules: ['dispatch'],
    columnWidth: 16,
    sampleValueDispatch: '07:30 AM',
  },
  {
    excelHeader: 'Start Loading Time',
    systemField: 'startLoadingTime',
    label: 'Start Loading Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time loading operations started (e.g. 08:00 AM)',
    aliases: ['start loading time', 'start loading', 'loading start', 'loading start time', 'started loading'],
    modules: ['dispatch'],
    columnWidth: 20,
    sampleValueDispatch: '08:00 AM',
  },
  {
    excelHeader: 'End Loading Time',
    systemField: 'endLoadingTime',
    label: 'End Loading Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time loading operations finished (e.g. 09:15 AM)',
    aliases: ['end loading time', 'end loading', 'loading end', 'loading end time', 'loading finished'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: '09:15 AM',
  },
  {
    excelHeader: 'Actual Departure',
    systemField: 'actualDepartureTime',
    label: 'Actual Departure Time',
    required: false,
    category: 'Delivery',
    dataType: 'time',
    description: 'Actual time vehicle departed from compound (e.g. 09:45 AM)',
    aliases: ['actual departure', 'actual departure time', 'departure time', 'truck departure', 'time out', 'gate out'],
    modules: ['dispatch'],
    columnWidth: 18,
    sampleValueDispatch: '09:45 AM',
  },
  {
    excelHeader: 'Manifest Number',
    systemField: 'referenceNumber',
    label: 'Manifest / Ref Number',
    required: false,
    category: 'Identification',
    dataType: 'string',
    description: 'Trip manifest or reference identifier',
    aliases: ['manifest number', 'manifest no', 'manifest', 'manifest ref', 'trip number', 'trip no'],
    modules: ['dispatch'],
    columnWidth: 42,
    sampleValueDispatch: 'MNF-2026-0825 [SAMPLE — DELETE BEFORE IMPORT]',
  },
  {
    excelHeader: 'Remarks',
    systemField: 'reasonForDelay',
    label: 'Remarks / Notes',
    required: false,
    category: 'Delivery',
    dataType: 'string',
    description: 'Operational notes or special handling remarks',
    aliases: ['remarks', 'remark', 'notes', 'comments', 'special instructions'],
    modules: ['dispatch'],
    columnWidth: 32,
    sampleValueDispatch: 'SAMPLE — DELETE BEFORE IMPORT',
  },
  {
    excelHeader: 'Planned Delivery Date',
    systemField: 'plannedDeliveryDate',
    label: 'Planned Delivery Date',
    required: false,
    category: 'Delivery',
    dataType: 'date',
    description: 'Target or scheduled delivery arrival date (MM/DD/YYYY or YYYY-MM-DD)',
    aliases: ['planned delivery date', 'planned delivery', 'target delivery date', 'scheduled delivery date', 'scheduled date', 'target date'],
    modules: ['dispatch'],
    columnWidth: 22,
    sampleValueDispatch: '08/28/2026',
  },
];

/**
 * Backward compatibility field definitions list for UI components.
 */
export const OFII_FIELD_DEFINITIONS: OFIIFieldDefinition[] = [
  ...OFII_SHARED_SCHEMA.map((s) => ({
    key: s.systemField,
    label: s.label,
    required: s.required,
    category: s.category,
    description: s.description,
    aliases: [s.excelHeader.toLowerCase(), ...s.aliases],
  })),
  {
    key: 'deliveryType',
    label: 'Delivery Type',
    required: false,
    category: 'Cargo',
    description: 'Delivery category: Land Freight, Sea Freight, Air Freight, FTL, LTL',
    aliases: ['delivery type', 'type', 'service type', 'shipment type', 'freight type'],
  },
  {
    key: 'drNumber',
    label: 'DR Number',
    required: false,
    category: 'Identification',
    description: 'Delivery Receipt tracking number',
    aliases: ['dr number', 'dr no', 'dr no.', 'delivery receipt', 'dr', 'delivery receipt number'],
  },
  {
    key: 'sealNumber',
    label: 'Seal Number',
    required: false,
    category: 'Identification',
    description: 'Container or truck security seal identifier',
    aliases: ['seal number', 'seal no', 'seal no.', 'seal', 'security seal', 'container seal'],
  },
  {
    key: 'itemDescription',
    label: 'Item Description',
    required: false,
    category: 'Cargo',
    description: 'Cargo description or items loaded',
    aliases: ['item description', 'description', 'item', 'cargo description', 'commodity', 'goods description'],
  },
  // Additional internal/operational field definitions
  {
    key: 'awbCourierRefNumber',
    label: 'Air Waybill / Courier Ref No.',
    required: false,
    category: 'Identification',
    description: 'Air Waybill, Bill of Lading, or carrier tracking number',
    aliases: ['awb', 'awb number', 'air waybill', 'waybill', 'courier ref', 'courier reference', 'tracking number', 'bl number', 'bill of lading'],
  },
  {
    key: 'unit',
    label: 'Unit',
    required: false,
    category: 'Cargo',
    description: 'Package unit (Boxes, Cases, Pallets, Bundles)',
    aliases: ['unit', 'uom', 'package unit', 'unit of measure'],
  },
  {
    key: 'declaredValue',
    label: 'Declared Value',
    required: false,
    category: 'Cargo',
    description: 'Declared commercial value for insurance',
    aliases: ['declared value', 'cargo value', 'invoice value', 'commercial value'],
  },
  {
    key: 'driverName',
    label: 'Driver Name',
    required: false,
    category: 'Cargo',
    description: 'Assigned truck driver / hauler operator',
    aliases: ['driver', 'driver name', 'assigned driver', 'truck driver', 'operator'],
  },
  {
    key: 'deliveryStatus',
    label: 'Delivery Status',
    required: false,
    category: 'Delivery',
    description: 'Delivered, In Transit, Pending Delivery, or Delayed',
    aliases: ['delivery status', 'status', 'shipment status', 'dispatch status', 'current status'],
  },
  {
    key: 'receiversName',
    label: "Receiver's Name",
    required: false,
    category: 'Delivery',
    description: 'Name of the person who signed at destination',
    aliases: ['receiver', 'receivers name', "receiver's name", 'received by', 'signatory', 'consignee receiver'],
  },
  {
    key: 'deliveryLeadTimeDays',
    label: 'Delivery Leadtime',
    required: false,
    category: 'Delivery',
    description: 'Agreed Delivery SLA in business days (Auto-calculated)',
    aliases: ['delivery leadtime', 'delivery lead time', 'lead time', 'delivery sla'],
  },
  {
    key: 'deliveryTatDays',
    label: 'Delivery TAT',
    required: false,
    category: 'Delivery',
    description: 'Actual Turnaround Time for delivery in days',
    aliases: ['delivery tat', 'delivery turn around time', 'tat days', 'delivery days'],
  },
  {
    key: 'deliveryPerformance',
    label: 'Delivery Performance',
    required: false,
    category: 'Delivery',
    description: 'HIT / MISSED vs delivery lead time SLA',
    aliases: ['delivery performance', 'delivery sla performance', 'sla result', 'delivery hit missed'],
  },
  {
    key: 'podStatus',
    label: 'POD Status',
    required: false,
    category: 'POD',
    description: 'Returned, Pending Return, Transmitted, or Under Review',
    aliases: ['pod status', 'proof of delivery status', 'pod state'],
  },
  {
    key: 'podLeadTimeDays',
    label: 'POD Leadtime',
    required: false,
    category: 'POD',
    description: 'Agreed POD return SLA in business days (default: 3 days)',
    aliases: ['pod leadtime', 'pod lead time', 'pod sla'],
  },
  {
    key: 'podTatDays',
    label: 'POD TAT',
    required: false,
    category: 'POD',
    description: 'Actual POD Return turnaround time in days',
    aliases: ['pod tat', 'pod turn around time', 'pod days'],
  },
  {
    key: 'podPerformance',
    label: 'POD Performance',
    required: false,
    category: 'POD',
    description: 'HIT / MISSED vs POD SLA',
    aliases: ['pod performance', 'pod sla performance', 'pod hit missed'],
  },
  {
    key: 'podReasonForDelay',
    label: 'POD Reason of Delay',
    required: false,
    category: 'POD',
    description: 'Explanation for delayed hardcopy POD submission',
    aliases: ['pod reason of delay', 'pod delay reason', 'pod exception', 'reason for pod delay'],
  },
];

/**
 * Normalizes string for matching (lowercase, strips special chars).
 */
export function cleanHeaderString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[._\-–—/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Auto-maps Excel columns to OFII fields using the Shared Column Schema.
 */
export function autoMapHeaders(
  headers: string[],
  targetModule: 'forwarding' | 'dispatch' = 'forwarding'
): Record<string, OFIIFieldKey> {
  const mapping: Record<string, OFIIFieldKey> = {};
  const usedFields = new Set<OFIIFieldKey>();

  const primarySchema = targetModule === 'dispatch' ? DAILY_DISPATCH_SCHEMA : FORWARDING_PROGRESSIVE_SCHEMA;
  const secondarySchema = targetModule === 'dispatch' ? FORWARDING_PROGRESSIVE_SCHEMA : DAILY_DISPATCH_SCHEMA;

  headers.forEach((header) => {
    const clean = cleanHeaderString(header);
    if (!clean) {
      mapping[header] = 'none';
      return;
    }

    let matchedField: OFIIFieldKey = 'none';

    // 1. Direct match with exact Excel Header from Primary Module Schema
    for (const schemaCol of primarySchema) {
      if (usedFields.has(schemaCol.systemField)) continue;
      if (clean === cleanHeaderString(schemaCol.excelHeader)) {
        matchedField = schemaCol.systemField;
        break;
      }
    }

    // 2. Target-module specific priority checks if not yet matched
    if (matchedField === 'none') {
      if (targetModule === 'dispatch') {
        if (clean === 'date' || clean === 'dispatch date' || clean === 'date dispatch date' || clean === 'date / dispatch date' || clean === 'actual dispatch date' || clean === 'delivery date' || clean === 'dispatched date') {
          matchedField = 'actualDispatchDate';
        } else if (clean === 'client name' || clean === 'client' || clean === 'customer' || clean === 'customer name') {
          matchedField = 'client';
        } else if (clean === 'delivery area' || clean === 'area' || clean === 'region' || clean === 'destination area' || clean === 'zone') {
          matchedField = 'area';
        } else if (clean === 'pod' || clean === 'pod number' || clean === 'pod no' || clean === 'pod no.' || clean === 'dr number' || clean === 'dr no') {
          matchedField = 'podNumber';
        } else if (clean === 'quantity' || clean === 'qty' || clean === 'cases' || clean === 'boxes' || clean === 'packages' || clean === 'quantity cases boxes') {
          matchedField = 'quantity';
        } else if (clean === 'delivery type' || clean === 'type' || clean === 'service type' || clean === 'freight type' || clean === 'shipment type') {
          matchedField = 'deliveryType';
        } else if (clean === 'place' || clean === 'destination' || clean === 'delivery destination' || clean === 'location' || clean === 'drop off') {
          matchedField = 'destination';
        } else if (clean === 'consignee' || clean === 'receiver' || clean === 'recipient' || clean === 'deliver to') {
          matchedField = 'consignee';
        } else if (clean === 'truck used' || clean === 'truck' || clean === 'vehicle' || clean === 'hauler' || clean === 'truck provider' || clean === 'carrier') {
          matchedField = 'courier';
        } else if (clean === 'plate number' || clean === 'truck plate' || clean === 'plate no' || clean === 'plate no.' || clean === 'vehicle plate') {
          matchedField = 'plateNumber';
        } else if (clean === 'time arrived' || clean === 'arrival time' || clean === 'truck arrival' || clean === 'truck arrival time' || clean === 'time in' || clean === 'gate in') {
          matchedField = 'timeArrived';
        } else if (clean === 'start loading' || clean === 'start loading time' || clean === 'loading start' || clean === 'loading start time' || clean === 'start load') {
          matchedField = 'startLoadingTime';
        } else if (clean === 'end loading' || clean === 'end loading time' || clean === 'loading end' || clean === 'loading end time' || clean === 'loading finished' || clean === 'end load') {
          matchedField = 'endLoadingTime';
        } else if (clean === 'actual departure' || clean === 'actual departure time' || clean === 'departure time' || clean === 'truck departure' || clean === 'departed time' || clean === 'time out' || clean === 'gate out') {
          matchedField = 'actualDepartureTime';
        } else if (clean === 'manifest number' || clean === 'manifest' || clean === 'manifest no' || clean === 'trip number' || clean === 'trip no' || clean === 'manifest ref') {
          matchedField = 'referenceNumber';
        } else if (clean === 'remarks' || clean === 'remark' || clean === 'notes' || clean === 'comments' || clean === 'special instructions') {
          matchedField = 'reasonForDelay';
        } else if (clean === 'planned delivery date' || clean === 'planned delivery' || clean === 'target delivery date' || clean === 'scheduled delivery date' || clean === 'scheduled date') {
          matchedField = 'plannedDeliveryDate';
        }
      } else {
        // Forwarding specific priorities
        if (clean === 'month' || clean === 'billing month' || clean === 'period' || clean === 'cycle') {
          matchedField = 'month';
        } else if (clean === 'client name' || clean === 'client' || clean === 'customer' || clean === 'customer name') {
          matchedField = 'client';
        } else if (clean === 'coordinator' || clean === 'account coordinator' || clean === 'assigned coordinator') {
          matchedField = 'coordinator';
        } else if (clean === 'mode of shipment' || clean === 'mode' || clean === 'shipment mode' || clean === 'transport mode') {
          matchedField = 'modeOfShipment';
        } else if (clean === 'delivery area' || clean === 'area' || clean === 'region' || clean === 'zone') {
          matchedField = 'area';
        } else if (clean === 'actual dispatched date' || clean === 'actual dispatch date' || clean === 'dispatch date' || clean === 'date dispatched') {
          matchedField = 'actualDispatchDate';
        } else if (clean === 'consignee' || clean === 'receiver' || clean === 'recipient') {
          matchedField = 'consignee';
        } else if (clean === 'destination code' || clean === 'dest code' || clean === 'destination' || clean === 'port code') {
          matchedField = 'destinationCode';
        } else if (clean === 'quantity' || clean === 'qty' || clean === 'boxes' || clean === 'cases') {
          matchedField = 'quantity';
        } else if (clean === 'cbm' || clean === 'volume cbm' || clean === 'cubic meters') {
          matchedField = 'cbm';
        } else if (clean === 'reference number' || clean === 'ref no' || clean === 'ref no.' || clean === 'project code' || clean === 'reference') {
          matchedField = 'referenceNumber';
        } else if (clean === 'volume weight' || clean === 'vol weight' || clean === 'volumetric weight' || clean === 'volume weight kg') {
          matchedField = 'volumeWeightKg';
        } else if (clean === 'actual weight' || clean === 'gross weight' || clean === 'scale weight' || clean === 'actual weight kg') {
          matchedField = 'actualWeightKg';
        } else if (clean === 'fees' || clean === 'chargeable fees' || clean === 'freight charges' || clean === 'rate' || clean === 'amount') {
          matchedField = 'chargeableWeightFees';
        } else if (clean === 'rdd' || clean === 'request delivery date' || clean === 'requested delivery date' || clean === 'client rdd') {
          matchedField = 'requestDeliveryDate';
        } else if (clean === 'actual delivery date' || clean === 'delivery date' || clean === 'date delivered') {
          matchedField = 'actualDeliveryDate';
        } else if (clean === 'pod number' || clean === 'pod no' || clean === 'pod no.' || clean === 'pod') {
          matchedField = 'podNumber';
        } else if (clean === 'actual pod return date' || clean === 'pod return date' || clean === 'date of pod return' || clean === 'pod returned date') {
          matchedField = 'dateOfPodReturn';
        }
      }
    }

    // 3. Match with aliases in Primary Schema
    if (matchedField === 'none') {
      for (const schemaCol of primarySchema) {
        if (usedFields.has(schemaCol.systemField)) continue;
        for (const alias of schemaCol.aliases) {
          if (clean === cleanHeaderString(alias)) {
            matchedField = schemaCol.systemField;
            break;
          }
        }
        if (matchedField !== 'none') break;
      }
    }

    // 4. Match with aliases in Secondary Schema
    if (matchedField === 'none') {
      for (const schemaCol of secondarySchema) {
        if (usedFields.has(schemaCol.systemField)) continue;
        if (clean === cleanHeaderString(schemaCol.excelHeader)) {
          matchedField = schemaCol.systemField;
          break;
        }
        for (const alias of schemaCol.aliases) {
          if (clean === cleanHeaderString(alias)) {
            matchedField = schemaCol.systemField;
            break;
          }
        }
        if (matchedField !== 'none') break;
      }
    }

    // 5. General fallback match across all definitions
    if (matchedField === 'none') {
      for (const def of OFII_FIELD_DEFINITIONS) {
        if (usedFields.has(def.key)) continue;

        if (clean === cleanHeaderString(def.label)) {
          matchedField = def.key;
          break;
        }

        for (const alias of def.aliases) {
          if (clean === cleanHeaderString(alias)) {
            matchedField = def.key;
            break;
          }
        }
        if (matchedField !== 'none') break;
      }
    }

    if (matchedField !== 'none') {
      usedFields.add(matchedField);
      mapping[header] = matchedField;
    } else {
      mapping[header] = 'none';
    }
  });

  return mapping;
}

/**
 * Parses dates from Excel (handles numeric serials, ISO strings, slash/dash dates).
 * Safely returns YYYY-MM-DD string or empty string if invalid/empty.
 */
export function parseExcelDate(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    return '';
  }

  // Handle Excel Serial Number (e.g. 45894)
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return '';
    // 25569 is days between 1900-01-01 and 1970-01-01
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return '';
  }

  const str = String(val).trim();
  if (!str) return '';

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const testDate = new Date(str);
    if (!isNaN(testDate.getTime())) {
      return str;
    }
    return '';
  }

  // Handle MM/DD/YYYY, DD/MM/YYYY, or YYYY/MM/DD
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let year = parts[2];
    let month = parts[0];
    let day = parts[1];

    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else if (year.length === 2) {
      year = `20${year}`;
    }

    const numM = parseInt(month, 10);
    const numD = parseInt(day, 10);
    const numY = parseInt(year, 10);

    if (numY > 1900 && numM >= 1 && numM <= 12 && numD >= 1 && numD <= 31) {
      const m = String(numM).padStart(2, '0');
      const d = String(numD).padStart(2, '0');
      const iso = `${numY}-${m}-${d}`;
      const testDate = new Date(iso);
      if (!isNaN(testDate.getTime())) {
        return iso;
      }
    }
  }

  // Standard Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    try {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      if (y > 1900 && y < 2200) {
        return `${y}-${m}-${d}`;
      }
    } catch (e) {
      return '';
    }
  }

  return '';
}

/**
 * Cleans numbers from Excel cells (currency symbols, commas, whitespace).
 */
export function parseExcelNumber(val: any, defaultVal = 0): number {
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (!val) return defaultVal;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Reads an uploaded Excel file (.xlsx or .xls) and extracts raw headers & rows.
 * Automatically chooses the appropriate worksheet and filters out sample template rows.
 */
export async function readExcelFile(
  file: File,
  targetModule: 'forwarding' | 'dispatch' = 'forwarding'
): Promise<{
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  fileSizeFormatted: string;
  sampleRowsExcludedCount?: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No worksheets found in this Excel file.');
        }

        // Intelligently select worksheet
        let selectedSheetName = workbook.SheetNames[0];

        // Filter out instruction sheets unless it's the only one
        const dataSheets = workbook.SheetNames.filter(
          (name) => !/instruction|guide|readme|reference|notes/i.test(name.trim())
        );
        const candidates = dataSheets.length > 0 ? dataSheets : workbook.SheetNames;

        if (targetModule === 'dispatch') {
          const dispatchMatch = candidates.find((name) =>
            /dispatch|daily|delivery/i.test(name)
          );
          if (dispatchMatch) selectedSheetName = dispatchMatch;
          else selectedSheetName = candidates[0];
        } else {
          const forwardingMatch = candidates.find((name) =>
            /forwarding|progressive|shipment|report/i.test(name)
          );
          if (forwardingMatch) selectedSheetName = forwardingMatch;
          else selectedSheetName = candidates[0];
        }

        const worksheet = workbook.Sheets[selectedSheetName];
        if (!worksheet) {
          throw new Error(`Unable to read worksheet "${selectedSheetName}".`);
        }

        // Convert to JSON array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (!rawJson || rawJson.length === 0) {
          throw new Error(`Worksheet "${selectedSheetName}" is empty. No records found.`);
        }

        // Find header row (first non-empty row)
        let headerRowIndex = -1;
        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (Array.isArray(row) && row.some((cell) => cell !== undefined && String(cell).trim() !== '')) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('No valid header row was found in this worksheet.');
        }

        const rawHeaderRow = rawJson[headerRowIndex] as any[];
        const seenHeaderCounts = new Map<string, number>();
        const headers: string[] = rawHeaderRow.map((h, idx) => {
          const rawStr = h !== undefined && h !== null ? String(h).trim() : '';
          const baseName = rawStr !== '' ? rawStr : `Column_${idx + 1}`;
          const lower = baseName.toLowerCase();
          const count = seenHeaderCounts.get(lower) || 0;
          seenHeaderCounts.set(lower, count + 1);
          return count === 0 ? baseName : `${baseName} (${count + 1})`;
        });

        const rows: Record<string, any>[] = [];
        let sampleRowsExcludedCount = 0;

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const rowArray = rawJson[r] as any[];
          if (!rowArray || !Array.isArray(rowArray)) continue;

          // Skip completely blank rows
          const hasData = rowArray.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '');
          if (!hasData) continue;

          const rowObj: Record<string, any> = {};
          headers.forEach((header, colIdx) => {
            const rawVal = rowArray[colIdx];
            rowObj[header] = rawVal !== undefined && rawVal !== null ? rawVal : '';
          });

          // Check if row is a sample row (contains "SAMPLE" or "DELETE BEFORE IMPORT" in any cell)
          const isSampleRow = Object.values(rowObj).some((val) => {
            if (typeof val !== 'string') return false;
            const upper = val.toUpperCase();
            return (
              upper.includes('SAMPLE — DELETE BEFORE IMPORT') ||
              upper.includes('SAMPLE - DELETE BEFORE IMPORT') ||
              upper.includes('DELETE BEFORE IMPORT') ||
              upper.includes('[SAMPLE') ||
              upper.includes('SAMPLE ROW') ||
              (upper.includes('SAMPLE') && (upper.includes('PRJ') || upper.includes('MNF') || upper.includes('POD')))
            );
          });

          if (isSampleRow) {
            sampleRowsExcludedCount++;
            continue; // Exclude sample row from actual import records
          }

          rows.push(rowObj);
        }

        if (rows.length === 0 && sampleRowsExcludedCount > 0) {
          throw new Error(
            'The uploaded Excel file only contains the sample template row. Please add your actual shipment records below the header row and re-upload.'
          );
        }

        if (rows.length === 0) {
          throw new Error('No shipment records were found in this file.');
        }

        // Format file size
        const sizeKb = (file.size / 1024).toFixed(1);
        const fileSizeFormatted = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
          : `${sizeKb} KB`;

        resolve({
          headers,
          rows,
          fileName: file.name,
          fileSizeFormatted,
          sampleRowsExcludedCount,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Unable to read this Excel file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Unable to read this Excel file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates and triggers download of the Daily Dispatching Monitoring Excel Template (.xlsx).
 * Strictly contains ONLY the 17 fields relevant to Daily Dispatching.
 * Includes dropdown validations for Client Name, Delivery Area (Luzon, Visayas, Mindanao), and Delivery Type.
 */
export function downloadDailyDispatchTemplate(clients?: ClientSummary[]): void {
  const workbook = XLSX.utils.book_new();

  const headers = DAILY_DISPATCH_SCHEMA.map((col) => col.excelHeader);
  const sampleRow: Record<string, any> = {};
  DAILY_DISPATCH_SCHEMA.forEach((col) => {
    sampleRow[col.excelHeader] = col.sampleValueDispatch ?? '';
  });

  const wsDispatch = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  wsDispatch['!cols'] = DAILY_DISPATCH_SCHEMA.map((col) => ({ wch: col.columnWidth }));

  // Dropdown list for clients
  const clientNames = (clients && clients.length > 0)
    ? clients.map((c) => c.name)
    : [
        'Philippine Charity Sweepstakes Office',
        'Golden Archers Development Corporation',
        'Alexandria and Centers of Wisdom Corporation',
        'Oriental Merchants',
        'Vamsler Philippines',
        'RefaMED',
        'Dunsk Kuhner',
        'Intelligent Skin Care Inc.',
      ];

  const deliveryAreas = ['Luzon', 'Visayas', 'Mindanao'];
  const deliveryTypes = ['Land Freight', 'Sea Freight', 'Air Freight', 'FTL', 'LTL'];

  // Column D: Client Name (col index 3)
  // Column I: Delivery Type (col index 8)
  // Column J: Place / Delivery Area (col index 9)
  const dispatchValidations = [
    {
      sqref: 'D2:D500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Client',
      error: 'Please select a registered client from the dropdown list.',
      formulae: [`"${clientNames.slice(0, 15).join(',')}"`],
    },
    {
      sqref: 'I2:I500',
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: 'Invalid Delivery Type',
      error: 'Please select a valid Delivery Type: Land Freight, Sea Freight, Air Freight, FTL, or LTL.',
      formulae: [`"${deliveryTypes.join(',')}"`],
    },
    {
      sqref: 'J2:J500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Delivery Area',
      error: 'Please select an allowed Delivery Area: Luzon, Visayas, or Mindanao.',
      formulae: [`"${deliveryAreas.join(',')}"`],
    },
  ];

  (wsDispatch as any)['!dataValidation'] = dispatchValidations;
  (wsDispatch as any)['!dataValidations'] = dispatchValidations;

  // Instructions Sheet specific to Daily Dispatching
  const instructionsData = [
    ['ORIENT FREIGHT INTERNATIONAL, INC. (OFII) - DAILY DISPATCHING MONITORING TEMPLATE'],
    ['Standardized Excel Template for Daily Dispatch Records, Loading Operations, and Trip Monitoring'],
    [],
    ['================================================================================================='],
    ['DAILY DISPATCHING ENCODING INSTRUCTIONS:'],
    ['================================================================================================='],
    ['Step 1', 'Fill in the required columns for each dispatch record.'],
    ['Step 2', 'Required Daily Dispatch fields: S.I / POD Number, Client Name, Place / Delivery Area, Consignee, Dispatch Date.'],
    ['Step 3', 'Select Client Name from the dropdown or use exact registered names from Client Management.'],
    ['Step 4', 'Select Delivery Area from the dropdown: "Luzon", "Visayas", or "Mindanao".'],
    ['Step 5', 'Select Delivery Type: "Land Freight", "Sea Freight", "Air Freight", "FTL", or "LTL".'],
    ['Step 6', 'Enter Time Arrived, Start Loading Time, End Loading Time, and Actual Departure in 12-hour format (e.g. 07:30 AM).'],
    ['Step 7', 'Enter vehicle Plate Number (e.g. NDB-4921) and Truck (e.g. 10W Wing Van).'],
    ['Step 8', 'Enter DR Number, Seal Number, and Item Description where applicable.'],
    ['Step 9', 'Enter Manifest Number (or leave blank for auto-generation).'],
    ['Step 10', 'Delete or replace the marked [SAMPLE — DELETE BEFORE IMPORT] row before importing.'],
    ['Step 11', 'Save your file as .xlsx, return to Daily Dispatching Monitoring, and click [ IMPORT EXCEL ].'],
    [],
    ['================================================================================================='],
    ['ACCEPTED VALUES REFERENCE:'],
    ['================================================================================================='],
    ['Delivery Area', 'Luzon, Visayas, Mindanao'],
    ['Delivery Type', 'Land Freight, Sea Freight, Air Freight, FTL, LTL'],
    ['Date Format', 'MM/DD/YYYY (e.g., 08/25/2026) or YYYY-MM-DD (e.g., 2026-08-25)'],
    ['Time Format', 'HH:MM AM/PM (e.g., 07:30 AM, 02:45 PM) or 24-Hour (e.g., 07:30, 14:45)'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 30 }, { wch: 70 }];

  XLSX.utils.book_append_sheet(workbook, wsDispatch, 'Daily Dispatch Monitoring');
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Dispatch Instructions');

  XLSX.writeFile(workbook, 'OFII_Daily_Dispatching_Template.xlsx');
}

/**
 * Generates and triggers download of the Forwarding Progressive Report Excel Template (.xlsx).
 * Strictly contains ONLY the 18 fields relevant to Forwarding Progressive Report.
 * Includes dropdown validations for Client Name, Mode of Shipment (Air, Land, Sea, RORO), and Delivery Area.
 */
export function downloadForwardingTemplate(clients?: ClientSummary[]): void {
  const workbook = XLSX.utils.book_new();

  const headers = FORWARDING_PROGRESSIVE_SCHEMA.map((col) => col.excelHeader);
  const sampleRow: Record<string, any> = {};
  FORWARDING_PROGRESSIVE_SCHEMA.forEach((col) => {
    sampleRow[col.excelHeader] = col.sampleValueForwarding ?? '';
  });

  const wsForwarding = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  wsForwarding['!cols'] = FORWARDING_PROGRESSIVE_SCHEMA.map((col) => ({ wch: col.columnWidth }));

  // Dropdown list for clients
  const clientNames = (clients && clients.length > 0)
    ? clients.map((c) => c.name)
    : [
        'Philippine Charity Sweepstakes Office',
        'Golden Archers Development Corporation',
        'Alexandria and Centers of Wisdom Corporation',
        'Oriental Merchants',
        'Vamsler Philippines',
        'RefaMED',
        'Dunsk Kuhner',
        'Intelligent Skin Care Inc.',
      ];

  const modesList = ['Air', 'Land', 'Sea', 'RORO'];
  const areasList = ['Luzon', 'Visayas', 'Mindanao'];

  // Column B: Client Name (col index 1)
  // Column D: Mode of Shipment (col index 3)
  // Column E: Delivery Area (col index 4)
  const forwardingValidations = [
    {
      sqref: 'B2:B500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Client',
      error: 'Please select a registered client from the dropdown list.',
      formulae: [`"${clientNames.slice(0, 15).join(',')}"`],
    },
    {
      sqref: 'D2:D500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Mode of Shipment',
      error: 'Please select an allowed Mode of Shipment: Air, Land, Sea, or RORO.',
      formulae: [`"${modesList.join(',')}"`],
    },
    {
      sqref: 'E2:E500',
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Delivery Area',
      error: 'Please select an allowed Delivery Area: Luzon, Visayas, or Mindanao.',
      formulae: [`"${areasList.join(',')}"`],
    },
  ];

  (wsForwarding as any)['!dataValidation'] = forwardingValidations;
  (wsForwarding as any)['!dataValidations'] = forwardingValidations;

  // Instructions Sheet specific to Forwarding
  const instructionsData = [
    ['ORIENT FREIGHT INTERNATIONAL, INC. (OFII) - FORWARDING PROGRESSIVE REPORT TEMPLATE'],
    ['Standardized Excel Template for Offline Multi-Modal Forwarding, RDD, and SLA Automation'],
    [],
    ['================================================================================================='],
    ['FORWARDING PROGRESSIVE REPORT INSTRUCTIONS:'],
    ['================================================================================================='],
    ['Step 1', 'Fill in the required columns for each forwarding record.'],
    ['Step 2', 'Required Forwarding columns: Client Name, Consignee, Mode of Shipment, Delivery Area, Actual Dispatched Date, Reference Number.'],
    ['Step 3', 'Select Client Name from the dropdown or enter exact registered client name.'],
    ['Step 4', 'Coordinator is auto-assigned from Client Name (e.g. Intelligent Skin Care Inc. -> Rojaylene Baldesancho).'],
    ['Step 5', 'Select Mode of Shipment: "Air", "Land", "Sea", or "RORO".'],
    ['Step 6', 'Select Delivery Area: "Luzon", "Visayas", or "Mindanao".'],
    ['Step 7', 'Delivery Leadtime & Expected Delivery Date are auto-calculated from Client + Mode + Area SLA days.'],
    ['Step 8', 'If the client has an agreed Request Delivery Date, encode it in RDD (MM/DD/YYYY).'],
    ['Step 9', 'When hardcopy POD is received, encode POD Number and Actual POD Return Date.'],
    ['Step 10', 'Delete or replace the marked [SAMPLE — DELETE BEFORE IMPORT] row before importing.'],
    ['Step 11', 'Save your completed file as .xlsx, return to Forwarding Progressive Report, and click [ IMPORT EXCEL ].'],
    [],
    ['================================================================================================='],
    ['ACCEPTED VALUES REFERENCE:'],
    ['================================================================================================='],
    ['Mode of Shipment', 'Air, Land, Sea, RORO (or Air Freight, Land Freight, Sea Freight)'],
    ['Delivery Area', 'Luzon, Visayas, Mindanao'],
    ['Date Format', 'MM/DD/YYYY (e.g., 08/25/2026) or YYYY-MM-DD (e.g., 2026-08-25)'],
    [],
    ['================================================================================================='],
    ['AUTOMATED BUSINESS LOGIC (UPON IMPORT):'],
    ['================================================================================================='],
    ['1. Client -> Coordinator auto-assignment (e.g., ISCI -> Rojaylene Baldesancho)'],
    ['2. Delivery Leadtime SLA calculated excluding Sundays & Philippine official holidays'],
    ['3. Delivery Performance (HIT / MISSED vs SLA or client RDD)'],
    ['4. POD Return Due Date (Actual Delivery Date + 3 business days SLA)'],
    ['5. Automatic POD SLA tracking (Returned On Time, Overdue, Approaching Due)'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 30 }, { wch: 70 }];

  XLSX.utils.book_append_sheet(workbook, wsForwarding, 'Forwarding Progressive Report');
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Forwarding Instructions');

  XLSX.writeFile(workbook, 'OFII_Forwarding_Progressive_Template.xlsx');
}

/**
 * Main dispatcher for template download.
 * Generates ONLY the requested module's template — never a combined or universal template.
 */
export function downloadOFIIExcelTemplate(
  targetModule?: 'forwarding' | 'dispatch' | 'all',
  clients?: ClientSummary[]
): void {
  if (targetModule === 'dispatch') {
    downloadDailyDispatchTemplate(clients);
  } else {
    downloadForwardingTemplate(clients);
  }
}

/**
 * Backward compatibility alias for downloadSampleExcelTemplate
 */
export function downloadSampleExcelTemplate(
  targetModule: 'forwarding' | 'dispatch' = 'forwarding',
  clients?: ClientSummary[]
): void {
  downloadOFIIExcelTemplate(targetModule, clients);
}

function getExportTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

/**
 * Sanitizes values against CSV/Excel formula injection (OWASP CSV Injection prevention).
 * If an untrusted string begins with =, +, -, @, \t, or \r, prefixes with an apostrophe '
 * so Excel/Calc renders it as safe plain text rather than executing code.
 */
export function sanitizeExcelCell(val: any): any {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val;
  const str = String(val);
  const trimmed = str.trim();
  if (trimmed.length > 0) {
    const firstChar = trimmed[0];
    if (firstChar === '=' || firstChar === '+' || firstChar === '@' || firstChar === '\t' || firstChar === '\r') {
      return `'${str}`;
    }
    // For minus sign: only prepend apostrophe if it's not a simple number
    if (firstChar === '-' && isNaN(Number(trimmed))) {
      return `'${str}`;
    }
  }
  return str;
}

/**
 * Exports Daily Dispatching records to a formatted Excel file (.xlsx).
 * Includes all 20 operational columns with clean formatting and column widths.
 * Fully sanitized against formula injection.
 */
export function exportDailyDispatchToExcel(
  records: DispatchRecord[],
  options?: { isFiltered?: boolean; label?: string }
): void {
  const workbook = XLSX.utils.book_new();
  const timestamp = getExportTimestamp();
  const headers = [
    'S.I / POD Number',
    'DR Number',
    'Seal Number',
    'Client Name',
    'Item Description',
    'Planned Delivery Date',
    'Actual Delivery Date',
    'Quantity',
    'Delivery Type',
    'Place / Delivery Area',
    'Consignee',
    'Truck',
    'Plate Number',
    'Truck Arrival Time',
    'Start Loading Time',
    'End Loading Time',
    'Actual Departure Time',
    'Dispatch Date',
    'Manifest Number',
    'Status',
    'Remarks',
  ];

  const rows = records.map((r) => ({
    'S.I / POD Number': sanitizeExcelCell(r.podNumber || ''),
    'DR Number': sanitizeExcelCell(r.drNumber || ''),
    'Seal Number': sanitizeExcelCell(r.sealNumber || ''),
    'Client Name': sanitizeExcelCell(r.clientName || ''),
    'Item Description': sanitizeExcelCell(r.itemDescription || ''),
    'Planned Delivery Date': sanitizeExcelCell(r.plannedDeliveryDate || ''),
    'Actual Delivery Date': sanitizeExcelCell(r.actualDeliveryDate || r.deliveryDate || ''),
    'Quantity': r.quantityCasesBoxes ?? 0,
    'Delivery Type': sanitizeExcelCell(r.deliveryType || 'FTL'),
    'Place / Delivery Area': sanitizeExcelCell(r.destination || ''),
    'Consignee': sanitizeExcelCell(r.consignee || ''),
    'Truck': sanitizeExcelCell(r.truckProvider || ''),
    'Plate Number': sanitizeExcelCell(r.plateNumber || ''),
    'Truck Arrival Time': sanitizeExcelCell(r.timeArrived || r.truckArrivalTime || ''),
    'Start Loading Time': sanitizeExcelCell(r.startLoadingTime || r.loadingStartTime || ''),
    'End Loading Time': sanitizeExcelCell(r.endLoadingTime || r.loadingEndTime || ''),
    'Actual Departure Time': sanitizeExcelCell(r.actualDepartureTime || r.departureTime || ''),
    'Dispatch Date': sanitizeExcelCell(r.dispatchDate || r.deliveryDate || ''),
    'Manifest Number': sanitizeExcelCell(r.manifestNumber || ''),
    'Status': sanitizeExcelCell(r.status || 'In Transit'),
    'Remarks': sanitizeExcelCell(r.remarks || ''),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet['!cols'] = [
    { wch: 18 }, // POD
    { wch: 16 }, // DR
    { wch: 16 }, // Seal
    { wch: 36 }, // Client
    { wch: 28 }, // Item
    { wch: 20 }, // Planned Date
    { wch: 20 }, // Actual Date
    { wch: 12 }, // Qty
    { wch: 16 }, // Type
    { wch: 24 }, // Place
    { wch: 32 }, // Consignee
    { wch: 20 }, // Truck
    { wch: 16 }, // Plate
    { wch: 18 }, // Arrival Time
    { wch: 18 }, // Start Load
    { wch: 18 }, // End Load
    { wch: 20 }, // Actual Dep
    { wch: 18 }, // Dispatch Date
    { wch: 22 }, // Manifest
    { wch: 16 }, // Status
    { wch: 30 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Dispatch Records');
  const filename = `OFII_Daily_Dispatching_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports Forwarding Progressive Report records to a formatted Excel file (.xlsx).
 * Includes all forwarding columns, SLAs, lead times, and operational performance.
 */
export function exportForwardingToExcel(
  records: ForwardingProgressiveRecord[],
  options?: { isFiltered?: boolean; label?: string }
): void {
  const workbook = XLSX.utils.book_new();
  const timestamp = getExportTimestamp();
  const headers = [
    'Month Dispatched',
    'HQ Coordinator',
    'Client Name',
    'Mode of Shipment',
    'Delivery Area',
    'Actual Dispatched Date',
    'Consignee',
    'Destination Code',
    'Quantity',
    'CBM',
    'Reference Number / Code',
    'Volume Weight (kg)',
    'Actual Weight (kg)',
    'Fees',
    'RDD',
    'Expected Delivery Date',
    'Actual Delivery Date',
    'Delivery SLA Performance',
    'POD Number',
    'Actual POD Return Date',
    'POD Due Date',
    'POD SLA / Status',
    'Current Status',
  ];

  const rows = records.map((r) => ({
    'Month Dispatched': sanitizeExcelCell(r.month || ''),
    'HQ Coordinator': sanitizeExcelCell(r.coordinator || ''),
    'Client Name': sanitizeExcelCell(r.client || ''),
    'Mode of Shipment': sanitizeExcelCell(r.modeOfShipment || ''),
    'Delivery Area': sanitizeExcelCell(r.area || ''),
    'Actual Dispatched Date': sanitizeExcelCell(r.actualDispatchDate || ''),
    'Consignee': sanitizeExcelCell(r.consignee || ''),
    'Destination Code': sanitizeExcelCell(r.destinationCode || ''),
    'Quantity': r.quantity ?? '',
    'CBM': r.cbm ?? '',
    'Reference Number / Code': sanitizeExcelCell(r.referenceNumber || ''),
    'Volume Weight (kg)': r.volumeWeightKg ?? '',
    'Actual Weight (kg)': r.actualWeightKg ?? '',
    'Fees': sanitizeExcelCell(r.chargeableWeightFees || ''),
    'RDD': sanitizeExcelCell(r.requestDeliveryDate || ''),
    'Expected Delivery Date': sanitizeExcelCell(r.expectedDeliveryDate || ''),
    'Actual Delivery Date': sanitizeExcelCell(r.actualDeliveryDate || ''),
    'Delivery SLA Performance': sanitizeExcelCell(r.deliveryPerformance || 'PENDING'),
    'POD Number': sanitizeExcelCell(r.podNumber || ''),
    'Actual POD Return Date': sanitizeExcelCell(r.dateOfPodReturn || ''),
    'POD Due Date': sanitizeExcelCell(r.podReturnDueDate || ''),
    'POD SLA / Status': sanitizeExcelCell(r.podStatus || 'Pending Return'),
    'Current Status': sanitizeExcelCell(r.deliveryStatus || 'In Transit'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet['!cols'] = [
    { wch: 16 }, // Month
    { wch: 24 }, // Coordinator
    { wch: 36 }, // Client
    { wch: 18 }, // Mode
    { wch: 16 }, // Area
    { wch: 22 }, // Dispatch Date
    { wch: 34 }, // Consignee
    { wch: 18 }, // Dest Code
    { wch: 12 }, // Qty
    { wch: 12 }, // CBM
    { wch: 24 }, // Ref
    { wch: 18 }, // Vol Wt
    { wch: 18 }, // Act Wt
    { wch: 18 }, // Fees
    { wch: 16 }, // RDD
    { wch: 22 }, // Expected Delivery
    { wch: 22 }, // Actual Delivery
    { wch: 22 }, // Perf
    { wch: 18 }, // POD
    { wch: 22 }, // POD Return Date
    { wch: 20 }, // POD Due Date
    { wch: 20 }, // POD SLA
    { wch: 16 }, // Delivery Status
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Forwarding Records');
  const filename = `OFII_Forwarding_Progressive_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Generates and triggers download of an Excel Error Report for rejected/problematic import rows.
 * Fulfills Requirement 5: "Provide an option to download an error report containing the affected row numbers and validation messages."
 */
export function generateImportErrorReportExcel(options: {
  fileName: string;
  targetModule: 'forwarding' | 'dispatch';
  rows: Array<{
    rowIndex: number;
    status: string;
    errors?: string[];
    warnings?: string[];
    cellErrors?: Record<string, any>;
    duplicateReason?: string;
    mappedRecord?: any;
    originalRow?: any;
  }>;
  failedProcessingRows?: Array<{ rowNumber: number; reason: string; reference?: string }>;
}): void {
  const workbook = XLSX.utils.book_new();
  const timestamp = getExportTimestamp();

  // Filter only rows that have issues
  const problematicRows = options.rows.filter(
    (r) => r.status === 'INVALID' || r.status === 'WARNING' || r.status === 'DUPLICATE'
  );

  const errorReportRows: any[] = [];

  // Add parsed row validation issues
  problematicRows.forEach((r) => {
    const errorDetails: string[] = [];
    if (r.errors && r.errors.length > 0) {
      errorDetails.push(...r.errors);
    }
    if (r.duplicateReason) {
      errorDetails.push(r.duplicateReason);
    }
    if (r.warnings && r.warnings.length > 0) {
      errorDetails.push(...r.warnings.map((w) => `[Warning] ${w}`));
    }

    const affectedFields = Object.keys(r.cellErrors || {});
    const clientName = r.mappedRecord?.client || r.originalRow?.['Client Name'] || r.originalRow?.['Client'] || '';
    const reference = r.mappedRecord?.referenceNumber || r.mappedRecord?.podNumber || r.originalRow?.['Reference Number'] || r.originalRow?.['POD'] || '';
    const consignee = r.mappedRecord?.consignee || r.originalRow?.['Consignee'] || '';

    errorReportRows.push({
      'Excel Row #': r.rowIndex,
      'Issue Category': sanitizeExcelCell(r.status),
      'Document Ref / POD': sanitizeExcelCell(reference),
      'Client Name': sanitizeExcelCell(clientName),
      'Consignee': sanitizeExcelCell(consignee),
      'Affected Field(s)': sanitizeExcelCell(affectedFields.join(', ') || (r.status === 'DUPLICATE' ? 'Duplicate Reference' : 'Row Level')),
      'Validation Message / Error Detail': sanitizeExcelCell(errorDetails.join(' | ') || 'Row failed validation rules'),
      'Action Required': r.status === 'INVALID'
        ? 'Correct missing or invalid required data in your spreadsheet before re-importing.'
        : (r.status === 'DUPLICATE'
          ? 'Remove or verify duplicate record identifier.'
          : 'Review warning details. This row can optionally be imported if acceptable.'),
    });
  });

  // Add any processing failures
  if (options.failedProcessingRows && options.failedProcessingRows.length > 0) {
    options.failedProcessingRows.forEach((f) => {
      errorReportRows.push({
        'Excel Row #': f.rowNumber,
        'Issue Category': 'EXECUTION_FAILURE',
        'Document Ref / POD': sanitizeExcelCell(f.reference || ''),
        'Client Name': '',
        'Consignee': '',
        'Affected Field(s)': 'Database / Processing',
        'Validation Message / Error Detail': sanitizeExcelCell(f.reason),
        'Action Required': 'Check system connection and verify data completeness before re-trying.',
      });
    });
  }

  // Sheet 1: Error details
  const headers = [
    'Excel Row #',
    'Issue Category',
    'Document Ref / POD',
    'Client Name',
    'Consignee',
    'Affected Field(s)',
    'Validation Message / Error Detail',
    'Action Required',
  ];

  const wsErrors = XLSX.utils.json_to_sheet(errorReportRows, { header: headers });
  wsErrors['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 28 },
    { wch: 24 },
    { wch: 55 },
    { wch: 45 },
  ];

  // Sheet 2: Summary Sheet
  const invalidCount = problematicRows.filter((r) => r.status === 'INVALID').length;
  const duplicateCount = problematicRows.filter((r) => r.status === 'DUPLICATE').length;
  const warningCount = problematicRows.filter((r) => r.status === 'WARNING').length;

  const summaryData = [
    ['ORIENT FREIGHT INTERNATIONAL, INC. (OFII) - IMPORT VALIDATION ERROR REPORT'],
    ['Generated on:', new Date().toLocaleString('en-US')],
    [],
    ['Original File Name:', options.fileName || 'Uploaded_Excel_File.xlsx'],
    ['Target Module:', options.targetModule === 'dispatch' ? 'Daily Dispatching Monitoring' : 'Forwarding Progressive Report'],
    ['Total Rows Evaluated:', options.rows.length],
    ['Rows with Errors (Excluded):', invalidCount],
    ['Duplicate Rows Detected:', duplicateCount],
    ['Rows with Warnings (Optional):', warningCount],
    ['Execution Failures:', options.failedProcessingRows?.length || 0],
    [],
    ['INSTRUCTIONS TO RESOLVE ISSUES:'],
    ['1. Open this error report alongside your original spreadsheet.'],
    ['2. Check the specific Excel Row # in your original spreadsheet.'],
    ['3. Correct any missing required fields (Client Name, Consignee, Dates, Areas).'],
    ['4. Save your original Excel file as .xlsx and re-upload through the Import wizard.'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 50 }];

  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Error Summary');
  XLSX.utils.book_append_sheet(workbook, wsErrors, 'Validation Issues');

  const reportFileName = `OFII_Import_Validation_Errors_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, reportFileName);
}
