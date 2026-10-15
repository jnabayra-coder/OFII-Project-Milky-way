import * as XLSX from 'xlsx';
import { DeliveryBatch, IndividualDelivery, ClientSummary } from '../types';
import { getClientAssignedCoordinator } from './dataSync';

export interface ValidatedBatchDeliveryRow {
  rowIndex: number;
  data: {
    deliveryId: string;
    batchName: string;
    client: string;
    coordinator: string;
    consignee: string;
    individualDeliveryPod: string;
    destinationCode: string;
    area: string;
    destination: string;
    quantity: number;
    unit: string;
    modeOfShipment: string;
    rdd: string;
    referenceNumber: string;
  };
  errors: {
    client?: string;
    consignee?: string;
    individualDeliveryPod?: string;
    area?: string;
    general?: string;
  };
  isValid: boolean;
}

/**
 * Generates and downloads the dedicated Excel template for importing individual deliveries
 * into a Delivery Name / Delivery Batch.
 */
export function downloadDeliveryBatchTemplate(currentBatch?: DeliveryBatch): void {
  const batchName = currentBatch?.name || 'GADC AUGUST 2026 BATCH A';
  const clientName = currentBatch?.client || 'Golden Archers Development Corporation';
  const coordinatorName = currentBatch?.coordinator || 'Justine Ryan Paular';

  // Sample rows demonstrating how individual deliveries belong to this batch
  const sampleRows = [
    {
      'Delivery ID': 'DEL-1001',
      'Delivery Name / Project': batchName,
      'Client Name': clientName,
      'Coordinator': coordinatorName,
      'Consignee / Store': 'Store 114 - Robinson Antipolo',
      'Individual Delivery POD Number': '87890',
      'Destination Code': 'ANT-01',
      'Delivery Area': 'Luzon',
      'Place / Location': 'Antipolo City, Rizal',
      'Quantity': 150,
      'Mode of Shipment': 'Land Freight',
      'RDD': '2026-08-28',
      'Reference Number / Code': 'GADC-2026-08A',
    },
    {
      'Delivery ID': 'DEL-1002',
      'Delivery Name / Project': batchName,
      'Client Name': clientName,
      'Coordinator': coordinatorName,
      'Consignee / Store': 'Store 115 - SM Megamall',
      'Individual Delivery POD Number': '87891',
      'Destination Code': 'MND-02',
      'Delivery Area': 'Luzon',
      'Place / Location': 'Mandaluyong City, Metro Manila',
      'Quantity': 220,
      'Mode of Shipment': 'Land Freight',
      'RDD': '2026-08-28',
      'Reference Number / Code': 'GADC-2026-08A',
    },
    {
      'Delivery ID': 'DEL-1003',
      'Delivery Name / Project': batchName,
      'Client Name': clientName,
      'Coordinator': coordinatorName,
      'Consignee / Store': 'Store 116 - Ayala Malls Feliz',
      'Individual Delivery POD Number': '87892',
      'Destination Code': 'PAS-01',
      'Delivery Area': 'Luzon',
      'Place / Location': 'Pasig City, Metro Manila',
      'Quantity': 180,
      'Mode of Shipment': 'Land Freight',
      'RDD': '2026-08-29',
      'Reference Number / Code': 'GADC-2026-08A',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);

  // Set explicit column widths for readability
  worksheet['!cols'] = [
    { wch: 16 }, // Delivery ID
    { wch: 32 }, // Delivery Name / Project
    { wch: 42 }, // Client Name
    { wch: 24 }, // Coordinator
    { wch: 36 }, // Consignee / Store
    { wch: 30 }, // Individual Delivery POD Number
    { wch: 18 }, // Destination Code
    { wch: 16 }, // Delivery Area
    { wch: 30 }, // Place / Location
    { wch: 12 }, // Quantity
    { wch: 18 }, // Mode of Shipment
    { wch: 14 }, // RDD
    { wch: 26 }, // Reference Number / Code
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Individual Deliveries');

  const safeBatchName = (currentBatch?.name || 'Project_Delivery_Batch')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);

  XLSX.writeFile(workbook, `OFII_Template_${safeBatchName}.xlsx`);
}

/**
 * Validates a single row against mandatory criteria:
 * - Client Name
 * - Consignee / Store
 * - Individual Delivery POD Number
 * - Delivery Area
 */
export function validateBatchDeliveryRow(
  row: ValidatedBatchDeliveryRow['data'],
  rowIndex: number,
  clients: ClientSummary[],
  defaultBatch: DeliveryBatch
): ValidatedBatchDeliveryRow {
  const errors: ValidatedBatchDeliveryRow['errors'] = {};

  // 1. Client Name Validation
  const effectiveClient = (row.client || defaultBatch.client || '').trim();
  if (!effectiveClient) {
    errors.client = 'Client Name is required';
  }

  // 2. Consignee / Store Validation
  if (!row.consignee || !row.consignee.trim()) {
    errors.consignee = 'Consignee / Store is required';
  }

  // 3. Individual Delivery POD Validation
  if (!row.individualDeliveryPod || !String(row.individualDeliveryPod).trim()) {
    errors.individualDeliveryPod = 'Individual Delivery POD Number is required';
  }

  // 4. Delivery Area Validation
  if (!row.area || !row.area.trim()) {
    errors.area = 'Delivery Area is required';
  }

  const isValid = Object.keys(errors).length === 0;

  // Auto-fill coordinator if client is known and coordinator is missing
  let coordinator = (row.coordinator || '').trim();
  if (!coordinator && effectiveClient) {
    coordinator = getClientAssignedCoordinator(clients, effectiveClient, defaultBatch.coordinator);
  }

  return {
    rowIndex,
    data: {
      ...row,
      client: effectiveClient,
      coordinator: coordinator || defaultBatch.coordinator,
      batchName: row.batchName?.trim() || defaultBatch.name,
    },
    errors,
    isValid,
  };
}

/**
 * Normalizes header string to find matching fields regardless of case/spacing
 */
function findValueByHeader(rawRow: Record<string, any>, possibleHeaders: string[]): any {
  const rowKeys = Object.keys(rawRow);
  for (const target of possibleHeaders) {
    const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of rowKeys) {
      const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (keyNorm === targetNorm) {
        return rawRow[key];
      }
    }
  }
  return undefined;
}

/**
 * Reads an Excel file and converts rows into validated batch deliveries.
 */
export async function parseDeliveryBatchExcel(
  file: File,
  currentBatch: DeliveryBatch,
  clients: ClientSummary[]
): Promise<{
  rows: ValidatedBatchDeliveryRow[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validatedRows: ValidatedBatchDeliveryRow[] = rawRows.map((raw, idx) => {
    // Extract fields with multiple aliases
    const deliveryId = String(
      findValueByHeader(raw, ['Delivery ID', 'DeliveryID', 'ID', 'Delivery #']) || `DEL-${idx + 1001}`
    ).trim();

    const batchName = String(
      findValueByHeader(raw, ['Delivery Name / Project', 'Delivery Name', 'Project', 'Batch Name', 'Batch']) ||
        currentBatch.name
    ).trim();

    const client = String(
      findValueByHeader(raw, ['Client Name', 'Client', 'Customer', 'Account']) || currentBatch.client || ''
    ).trim();

    const coordinator = String(
      findValueByHeader(raw, ['Coordinator', 'Account Coordinator', 'Assigned Coordinator']) || ''
    ).trim();

    const consignee = String(
      findValueByHeader(raw, ['Consignee / Store', 'Consignee', 'Store', 'Store Name', 'Customer Store']) || ''
    ).trim();

    const individualDeliveryPod = String(
      findValueByHeader(raw, [
        'Individual Delivery POD Number',
        'Individual Delivery POD',
        'Delivery POD',
        'POD Number',
        'POD',
        'POD #',
      ]) || ''
    ).trim();

    const destinationCode = String(
      findValueByHeader(raw, ['Destination Code', 'Dest Code', 'DestinationCode', 'Hub Code']) || 'HUB-01'
    ).trim();

    const area = String(
      findValueByHeader(raw, ['Delivery Area', 'Area', 'Region', 'Zone']) || ''
    ).trim();

    const destination = String(
      findValueByHeader(raw, ['Place / Location', 'Location', 'Place', 'Destination', 'Address']) || ''
    ).trim();

    const rawQty = findValueByHeader(raw, ['Quantity', 'Qty', 'Units', 'Boxes']);
    const quantity = typeof rawQty === 'number' ? rawQty : parseInt(String(rawQty || '1'), 10) || 1;

    const modeOfShipment = String(
      findValueByHeader(raw, ['Mode of Shipment', 'Mode', 'Shipment Mode']) || 'Land Freight'
    ).trim();

    const rdd = String(
      findValueByHeader(raw, ['RDD', 'Request Delivery Date', 'Requested Delivery Date', 'Due Date']) || ''
    ).trim();

    const referenceNumber = String(
      findValueByHeader(raw, ['Reference Number / Code', 'Reference Number', 'Ref No', 'Code', 'Reference']) ||
        currentBatch.name
    ).trim();

    const rowData: ValidatedBatchDeliveryRow['data'] = {
      deliveryId,
      batchName,
      client,
      coordinator,
      consignee,
      individualDeliveryPod,
      destinationCode,
      area,
      destination,
      quantity,
      unit: 'cases',
      modeOfShipment,
      rdd,
      referenceNumber,
    };

    return validateBatchDeliveryRow(rowData, idx, clients, currentBatch);
  });

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.length - validCount;

  return {
    rows: validatedRows,
    totalCount: validatedRows.length,
    validCount,
    invalidCount,
  };
}
