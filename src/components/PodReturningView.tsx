import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileCheck, 
  Bell, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Truck, 
  User, 
  UserCheck, 
  MapPin, 
  Building2, 
  Download, 
  ArrowUpDown, 
  Eye, 
  Edit3, 
  X, 
  Sparkles, 
  Inbox, 
  AlertCircle, 
  Check, 
  ShieldCheck, 
  History,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { IndividualDelivery, PodReturningNotification, ForwardingProgressiveRecord, RecipientNameHistoryEntry } from '../types';
import { calculatePodReturnDueDate, determineAutomaticPodStatus } from '../utils/podEngine';
import { normalizeUserRole } from '../utils/roleUtils';

export type PodFilterStatus = 'ALL' | 'POD PENDING' | 'POD RETURNED' | 'SLA HIT' | 'SLA MISSED';
export type PodDateFieldFilter = 'actualDeliveryDate' | 'podReturnDate' | 'podReturnDueDate';

export interface PodDetailRecord {
  id: string;
  deliveryId: string;
  batchName: string;
  client: string;
  coordinator: string;
  consignee: string;
  place: string;
  area: string;
  placeAndArea: string;
  quantity: number;
  unit: string;
  individualPodNumber: string;
  driverRecipientName: string;
  recipientName: string;
  recipientNameHistory: RecipientNameHistoryEntry[];
  driver: string;
  helper: string;
  truckRunNumber: string;
  actualDeliveryDate: string;
  dateReceived: string;
  podReturnDueDate: string;
  podReturnDueDateFormatted: string;
  podReturnDate?: string;
  podStatus: 'PENDING' | 'HIT' | 'MISSED';
  podStatusLabel: 'POD PENDING' | 'POD RETURNED';
  slaStatusLabel: 'SLA HIT' | 'SLA MISSED' | 'PENDING SLA';
  remarks: string;
  source: 'individual' | 'forwarding';
}

interface PodReturningViewProps {
  onNavigateToForwarding?: () => void;
}

export const PodReturningView: React.FC<PodReturningViewProps> = () => {
  const { 
    individualDeliveries, 
    forwardingRecords, 
    podReturningNotifications, 
    markPodReturningNotificationAsRead, 
    markAllPodReturningNotificationsAsRead, 
    encodePodReturn, 
    currentUserProfile 
  } = useData();

  // Role Permissions Enforcement (Requirement 3: Role Permissions)
  const userRole = currentUserProfile?.userRole || currentUserProfile?.role;
  const canonicalRole = normalizeUserRole(userRole);
  const canEncodePod = canonicalRole === 'ENCODER' || canonicalRole === 'HEAD_STAFF' || userRole === 'encoder' || userRole === 'office_head';
  const isDriver = canonicalRole === 'DRIVER_HELPER' || userRole === 'driver';

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PodFilterStatus>('ALL');
  const [dateFieldFilter, setDateFieldFilter] = useState<PodDateFieldFilter>('actualDeliveryDate');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'deliveries' | 'notifications'>('deliveries');

  // Action Feedback Toast / Banner (Success / Error notification)
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modal State for Viewing Complete POD Record Details (Requirement 1)
  const [detailsModalRecord, setDetailsModalRecord] = useState<PodDetailRecord | null>(null);

  // Modal State for Encoding POD Return
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{
    recordId: string;
    deliveryId: string;
    batchName: string;
    client: string;
    consignee: string;
    destination: string;
    quantity: number;
    unit: string;
    recipientName?: string;
    driverRecipientName?: string;
    recipientNameHistory?: RecipientNameHistoryEntry[];
    podNumber: string;
    driver: string;
    truckRunNumber: string;
    actualDeliveryDate: string;
    dateReceived: string;
    dueDate: string;
    existingReturnDate?: string;
    existingRemarks?: string;
  } | null>(null);

  const [inputDateReceived, setInputDateReceived] = useState('');
  const [inputPodReturnDate, setInputPodReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputRecipientName, setInputRecipientName] = useState('');
  const [inputEditReason, setInputEditReason] = useState('');
  const [recipientNameError, setRecipientNameError] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dedicated Recipient Name Edit History Modal State
  const [historyModalRecord, setHistoryModalRecord] = useState<{
    deliveryId: string;
    batchName: string;
    consignee: string;
    driverRecipientName: string;
    currentRecipientName: string;
    recipientNameHistory: RecipientNameHistoryEntry[];
  } | null>(null);

  // Safe modal close helper that resets validation and selected record
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setRecipientNameError('');
    setInputEditReason('');
  };

  // Close modal safely on ESC key press without modifying saved data
  useEffect(() => {
    if (!isModalOpen && !historyModalRecord && !detailsModalRecord) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailsModalRecord) {
          setDetailsModalRecord(null);
        } else if (historyModalRecord) {
          setHistoryModalRecord(null);
        } else if (isModalOpen) {
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, historyModalRecord, detailsModalRecord]);

  // Combine delivered records from individualDeliveries and forwardingRecords
  const deliveredDeliveries = useMemo(() => {
    // 1. Delivered items from IndividualDeliveries
    const list: Array<PodDetailRecord & {
      destination: string;
      notificationStatus: 'Unread Driver Alert' | 'Acknowledged' | 'No Alert';
      hasUnreadNotif: boolean;
      driverName: string;
      podNumber: string;
      isRecipientEdited?: boolean;
    }> = [];

    // Map individual deliveries
    individualDeliveries.forEach((del) => {
      const delObj = del as any;
      const isDelivered = delObj.deliveryStatus === 'DELIVERED' || del.status === 'Delivered' || !!del.dateReceived || !!del.actualDeliveryDate;
      if (isDelivered) {
        const clientName = del.client || 'Default Client';
        const area = (del.area || 'Luzon') as any;
        const actualDate = del.actualDeliveryDate || del.dateReceived || delObj.updatedAt?.split('T')[0] || '';
        const dueRes = calculatePodReturnDueDate(actualDate, clientName, area);
        const dueDate = dueRes.podReturnDueDate || '';
        const returnDate = del.podReturnDate || delObj.dateOfPodReturn || '';
        
        const autoStatus = determineAutomaticPodStatus({
          actualDeliveryDate: actualDate,
          podReturnDueDate: dueDate,
          actualPodReturnDate: returnDate,
          clientName,
          deliveryArea: area,
        });
        const calculatedSla: 'PENDING' | 'HIT' | 'MISSED' = autoStatus.podPerformance;

        const relatedNotif = (podReturningNotifications || []).find(
          (n) => n.deliveryId === del.deliveryId || n.recordId === del.id || (n.individualDeliveryPod && n.individualDeliveryPod === del.individualDeliveryPod)
        );

        const notifStatus: 'Unread Driver Alert' | 'Acknowledged' | 'No Alert' = relatedNotif
          ? (relatedNotif.isRead ? 'Acknowledged' : 'Unread Driver Alert')
          : 'No Alert';

        const finalRecipientName = del.recipientName || del.receiversName || relatedNotif?.recipientName || relatedNotif?.receiversName || '';
        const driverOriginalName = del.driverRecipientName || relatedNotif?.driverRecipientName || del.recipientName || del.receiversName || '';
        const history: RecipientNameHistoryEntry[] = del.recipientNameHistory || relatedNotif?.recipientNameHistory || [];
        const isEdited = (history && history.length > 0) || Boolean(driverOriginalName && finalRecipientName && driverOriginalName.trim().toLowerCase() !== finalRecipientName.trim().toLowerCase());

        const coordinator = del.coordinator || 'Alodia Manalansan';
        const helper = del.helper || delObj.helperName || delObj.assignedHelper || '—';
        const place = del.destination || del.destinationCode || area || 'NCR';
        const placeAndArea = `${place} / ${area}`;
        const remarksText = delObj.deliveryRemarks || delObj.remarks || '—';
        const podStatusLabel: 'POD PENDING' | 'POD RETURNED' = returnDate ? 'POD RETURNED' : 'POD PENDING';
        const slaStatusLabel: 'SLA HIT' | 'SLA MISSED' | 'PENDING SLA' = calculatedSla === 'HIT' ? 'SLA HIT' : (calculatedSla === 'MISSED' ? 'SLA MISSED' : 'PENDING SLA');

        list.push({
          id: del.id,
          deliveryId: del.deliveryId || del.id,
          batchName: del.batchName || 'Delivery Batch #001',
          client: clientName,
          coordinator,
          consignee: del.consignee,
          place,
          area,
          placeAndArea,
          destination: place,
          quantity: del.quantity || 1,
          unit: del.unit || 'cases',
          individualPodNumber: del.individualDeliveryPod || del.deliveryId || del.id,
          podNumber: del.individualDeliveryPod || del.deliveryId || del.id,
          driverRecipientName: driverOriginalName,
          recipientName: finalRecipientName,
          recipientNameHistory: history,
          isRecipientEdited: isEdited,
          truckRunNumber: del.truckRunNumber || 'TRUCK RUN #001',
          driver: delObj.assignedDriver || del.driver || delObj.driverName || 'Danilo P. Hernandez',
          driverName: delObj.assignedDriver || del.driver || delObj.driverName || 'Danilo P. Hernandez',
          helper,
          actualDeliveryDate: actualDate,
          dateReceived: del.dateReceived || actualDate,
          podReturnDueDate: dueDate,
          podReturnDueDateFormatted: dueRes.podReturnDueDateFormatted || dueDate,
          podReturnDate: returnDate || undefined,
          podStatus: calculatedSla,
          podStatusLabel,
          slaStatusLabel,
          notificationStatus: notifStatus,
          hasUnreadNotif: relatedNotif ? !relatedNotif.isRead : false,
          remarks: remarksText,
          source: 'individual',
        });
      }
    });

    // Also include any delivered records from forwardingRecords that aren't duplicate
    forwardingRecords.forEach((fwd) => {
      const fwdObj = fwd as any;
      const isDelivered = fwd.deliveryStatus === 'Delivered' || fwdObj.status === 'Delivered' || !!fwd.dateReceived || !!fwd.actualDeliveryDate;
      if (isDelivered) {
        const alreadyInList = list.some(
          (item) => item.id === fwd.id || (item.podNumber && (item.podNumber === fwd.podNumber || item.podNumber === fwd.individualDeliveryPod))
        );
        if (!alreadyInList) {
          const clientName = fwd.client;
          const area = fwd.area as any;
          const actualDate = fwd.actualDeliveryDate || fwd.dateReceived || '';
          const dueRes = calculatePodReturnDueDate(actualDate, clientName, area);
          const dueDate = dueRes.podReturnDueDate || '';
          const returnDate = fwd.dateOfPodReturn || '';
          
          const autoStatus = determineAutomaticPodStatus({
            actualDeliveryDate: actualDate,
            podReturnDueDate: dueDate,
            actualPodReturnDate: returnDate,
            clientName,
            deliveryArea: area,
          });
          const calculatedSla: 'PENDING' | 'HIT' | 'MISSED' = autoStatus.podPerformance;

          const relatedNotif = (podReturningNotifications || []).find(
            (n) => n.deliveryId === fwd.deliveryId || n.recordId === fwd.id || (n.individualDeliveryPod && n.individualDeliveryPod === (fwd.individualDeliveryPod || fwd.podNumber))
          );

          const notifStatus: 'Unread Driver Alert' | 'Acknowledged' | 'No Alert' = relatedNotif
            ? (relatedNotif.isRead ? 'Acknowledged' : 'Unread Driver Alert')
            : 'No Alert';

          const finalRecipientName = fwd.recipientName || fwd.receiversName || relatedNotif?.recipientName || relatedNotif?.receiversName || '';
          const driverOriginalName = fwd.driverRecipientName || relatedNotif?.driverRecipientName || fwd.recipientName || fwd.receiversName || '';
          const history: RecipientNameHistoryEntry[] = fwd.recipientNameHistory || relatedNotif?.recipientNameHistory || [];
          const isEdited = (history && history.length > 0) || Boolean(driverOriginalName && finalRecipientName && driverOriginalName.trim().toLowerCase() !== finalRecipientName.trim().toLowerCase());

          const coordinator = fwd.coordinator || 'Alodia Manalansan';
          const helper = fwd.helperName || (fwd as any).assignedHelper || (fwd as any).helper || '—';
          const place = fwd.destinationCode || fwd.destination || area;
          const placeAndArea = `${place} / ${area}`;
          const remarksText = fwd.remarks || (fwd as any).deliveryRemarks || '—';
          const podStatusLabel: 'POD PENDING' | 'POD RETURNED' = returnDate ? 'POD RETURNED' : 'POD PENDING';
          const slaStatusLabel: 'SLA HIT' | 'SLA MISSED' | 'PENDING SLA' = calculatedSla === 'HIT' ? 'SLA HIT' : (calculatedSla === 'MISSED' ? 'SLA MISSED' : 'PENDING SLA');

          list.push({
            id: fwd.id,
            deliveryId: fwd.deliveryId || fwd.id,
            batchName: fwdObj.batchName || 'General Consignment',
            client: clientName,
            coordinator,
            consignee: fwd.consignee,
            place,
            area,
            placeAndArea,
            destination: place,
            quantity: fwd.quantity || fwdObj.quantityCasesBoxes || 1,
            unit: fwdObj.unit || 'cases',
            individualPodNumber: fwd.podNumber || fwd.individualDeliveryPod || fwd.id,
            podNumber: fwd.podNumber || fwd.individualDeliveryPod || fwd.id,
            driverRecipientName: driverOriginalName,
            recipientName: finalRecipientName,
            recipientNameHistory: history,
            isRecipientEdited: isEdited,
            truckRunNumber: fwd.truckRunNumber || 'TRUCK RUN #001',
            driver: fwd.driverName || fwd.assignedDriver || fwdObj.driver || 'Danilo P. Hernandez',
            driverName: fwd.driverName || fwd.assignedDriver || fwdObj.driver || 'Danilo P. Hernandez',
            helper,
            actualDeliveryDate: actualDate,
            dateReceived: fwd.dateReceived || actualDate,
            podReturnDueDate: dueDate,
            podReturnDueDateFormatted: dueRes.podReturnDueDateFormatted || dueDate,
            podReturnDate: returnDate || undefined,
            podStatus: calculatedSla,
            podStatusLabel,
            slaStatusLabel,
            notificationStatus: notifStatus,
            hasUnreadNotif: relatedNotif ? !relatedNotif.isRead : false,
            remarks: remarksText,
            source: 'forwarding',
          });
        }
      }
    });

    return list;
  }, [individualDeliveries, forwardingRecords, podReturningNotifications]);

  // 1. Summary Counters (Updating dynamically based on actual delivered records)
  const totalDeliveredCount = deliveredDeliveries.length;
  const podPendingCount = useMemo(() => deliveredDeliveries.filter(d => !d.podReturnDate).length, [deliveredDeliveries]);
  const podReturnedCount = useMemo(() => deliveredDeliveries.filter(d => !!d.podReturnDate).length, [deliveredDeliveries]);
  const slaHitCount = useMemo(() => deliveredDeliveries.filter(d => d.podStatus === 'HIT').length, [deliveredDeliveries]);
  const slaMissedCount = useMemo(() => deliveredDeliveries.filter(d => d.podStatus === 'MISSED').length, [deliveredDeliveries]);
  const unreadNotifCount = useMemo(() => (podReturningNotifications || []).filter(n => !n.isRead).length, [podReturningNotifications]);

  // Filtered deliveries based on search, status filter, and optional date filters
  const filteredDeliveries = useMemo(() => {
    return deliveredDeliveries.filter((item) => {
      // 1. Search matching (case-insensitive) across:
      // Delivery ID, Delivery Name/Batch, Client, Consignee, Recipient Name, Individual POD Number, Driver, Truck Run Number
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        (item.deliveryId && item.deliveryId.toLowerCase().includes(query)) ||
        (item.batchName && item.batchName.toLowerCase().includes(query)) ||
        (item.client && item.client.toLowerCase().includes(query)) ||
        (item.consignee && item.consignee.toLowerCase().includes(query)) ||
        (item.recipientName && item.recipientName.toLowerCase().includes(query)) ||
        (item.driverRecipientName && item.driverRecipientName.toLowerCase().includes(query)) ||
        (item.podNumber && item.podNumber.toLowerCase().includes(query)) ||
        (item.driverName && item.driverName.toLowerCase().includes(query)) ||
        (item.destination && item.destination.toLowerCase().includes(query)) ||
        (item.truckRunNumber && item.truckRunNumber.toLowerCase().includes(query));

      // 2. POD Status matching: ALL, POD PENDING, POD RETURNED, SLA HIT, SLA MISSED
      let matchesStatus = true;
      if (statusFilter === 'POD PENDING') {
        matchesStatus = !item.podReturnDate;
      } else if (statusFilter === 'POD RETURNED') {
        matchesStatus = Boolean(item.podReturnDate);
      } else if (statusFilter === 'SLA HIT') {
        matchesStatus = item.podStatus === 'HIT';
      } else if (statusFilter === 'SLA MISSED') {
        matchesStatus = item.podStatus === 'MISSED';
      }

      // 3. Optional Date Filters (Actual Delivery Date, POD Return Date, POD Due Date)
      let matchesDate = true;
      if (dateFrom || dateTo) {
        let targetDate = '';
        if (dateFieldFilter === 'actualDeliveryDate') {
          targetDate = item.actualDeliveryDate || item.dateReceived || '';
        } else if (dateFieldFilter === 'podReturnDate') {
          targetDate = item.podReturnDate || '';
        } else if (dateFieldFilter === 'podReturnDueDate') {
          targetDate = item.podReturnDueDate || '';
        }

        if (!targetDate) {
          matchesDate = false;
        } else {
          if (dateFrom && targetDate < dateFrom) matchesDate = false;
          if (dateTo && targetDate > dateTo) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [deliveredDeliveries, searchTerm, statusFilter, dateFieldFilter, dateFrom, dateTo]);

  // Handler to clear all filters
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setDateFieldFilter('actualDeliveryDate');
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'ALL' || dateFrom || dateTo);

  // Open modal for a specific delivery
  const handleOpenEncodeModal = (item: {
    id: string;
    deliveryId: string;
    batchName?: string;
    client: string;
    consignee: string;
    destination: string;
    quantity?: number;
    unit?: string;
    recipientName?: string;
    driverRecipientName?: string;
    recipientNameHistory?: RecipientNameHistoryEntry[];
    podNumber: string;
    driverName: string;
    truckRunNumber?: string;
    actualDeliveryDate: string;
    dateReceived: string;
    podReturnDueDate: string;
    podReturnDate?: string;
    remarks?: string;
  }) => {
    const driverOriginal = item.driverRecipientName || item.recipientName || '';
    setSelectedRecord({
      recordId: item.id,
      deliveryId: item.deliveryId,
      batchName: item.batchName || 'General Consignment',
      client: item.client,
      consignee: item.consignee,
      destination: item.destination,
      quantity: item.quantity || 1,
      unit: item.unit || 'cases',
      recipientName: item.recipientName || '',
      driverRecipientName: driverOriginal,
      recipientNameHistory: item.recipientNameHistory || [],
      podNumber: item.podNumber,
      driver: item.driverName,
      truckRunNumber: item.truckRunNumber || 'TRUCK RUN #001',
      actualDeliveryDate: item.actualDeliveryDate,
      dateReceived: item.dateReceived || item.actualDeliveryDate || new Date().toISOString().split('T')[0],
      dueDate: item.podReturnDueDate,
      existingReturnDate: item.podReturnDate,
      existingRemarks: item.remarks,
    });
    setInputDateReceived(item.dateReceived || item.actualDeliveryDate || new Date().toISOString().split('T')[0]);
    setInputPodReturnDate(item.podReturnDate || new Date().toISOString().split('T')[0]);
    setInputRecipientName(item.recipientName || '');
    setInputEditReason('');
    setRecipientNameError('');
    setInputRemarks(item.remarks || '');
    setIsModalOpen(true);
  };

  // Open modal from a notification
  const handleEncodeFromNotification = (notif: PodReturningNotification) => {
    // Mark as read
    markPodReturningNotificationAsRead(notif.id);

    // Find the item
    const found = deliveredDeliveries.find(d => d.id === notif.recordId || d.deliveryId === notif.deliveryId);
    if (found) {
      handleOpenEncodeModal(found);
    } else {
      const initialRecipient = notif.recipientName || notif.receiversName || '';
      const driverOriginal = notif.driverRecipientName || initialRecipient;
      setSelectedRecord({
        recordId: notif.recordId || notif.deliveryId,
        deliveryId: notif.deliveryId,
        batchName: notif.batchName || 'General Consignment',
        client: notif.client,
        consignee: notif.consignee,
        destination: notif.place,
        quantity: notif.quantity || 1,
        unit: notif.unit || 'cases',
        recipientName: initialRecipient,
        driverRecipientName: driverOriginal,
        recipientNameHistory: notif.recipientNameHistory || [],
        podNumber: notif.individualDeliveryPod || notif.deliveryId,
        driver: notif.assignedDriver,
        truckRunNumber: notif.truckRunNumber || 'TRUCK RUN #001',
        actualDeliveryDate: notif.actualDeliveryDate,
        dateReceived: notif.dateReceived || notif.actualDeliveryDate,
        dueDate: notif.podReturnDueDate || '',
        existingReturnDate: notif.podReturnDate,
        existingRemarks: notif.podRemarks,
      });
      setInputDateReceived(notif.dateReceived || notif.actualDeliveryDate || new Date().toISOString().split('T')[0]);
      setInputPodReturnDate(notif.podReturnDate || new Date().toISOString().split('T')[0]);
      setInputRecipientName(initialRecipient);
      setInputEditReason('');
      setRecipientNameError('');
      setInputRemarks(notif.podRemarks || '');
      setIsModalOpen(true);
    }
  };

  // Save POD Return
  const handleSavePodReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !inputPodReturnDate) return;

    // RBAC check (Requirement 3: Role Permissions)
    if (!canEncodePod) {
      setActionFeedback({
        type: 'error',
        message: 'Permission Denied: Only an authorized Encoder (or Operations Head) is permitted to encode and confirm POD returns.'
      });
      return;
    }

    const trimmedRecipientName = inputRecipientName.trim();
    if (!trimmedRecipientName) {
      setRecipientNameError('Recipient Name is required. Please confirm or enter the recipient name.');
      return;
    }
    setRecipientNameError('');

    setIsSubmitting(true);
    try {
      const res = await encodePodReturn({
        recordId: selectedRecord.recordId,
        dateReceived: inputDateReceived,
        podReturnDate: inputPodReturnDate,
        recipientName: trimmedRecipientName,
        editReason: inputEditReason.trim() || undefined,
        podRemarks: inputRemarks,
      });
      setActionFeedback({
        type: 'success',
        message: `POD Return for ${selectedRecord.deliveryId} saved successfully! SLA Status: ${res.slaStatus} (Due: ${res.dueDate}).`
      });
      handleCloseModal();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Failed to encode POD return.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Realtime preview of SLA in modal
  const modalSlaPreview = useMemo(() => {
    if (!selectedRecord?.dueDate || !inputPodReturnDate) return null;
    const isHit = inputPodReturnDate <= selectedRecord.dueDate;
    return isHit ? 'HIT' : 'MISSED';
  }, [selectedRecord?.dueDate, inputPodReturnDate]);

  // Requirement 2: DOWNLOAD POD RETURNING EXCEL (Exports currently filtered records or all if no filters)
  const handleExportExcel = () => {
    try {
      const recordsToExport = filteredDeliveries;
      if (!recordsToExport || recordsToExport.length === 0) {
        setActionFeedback({
          type: 'error',
          message: 'No records available to export with the current filter settings. Adjust filters and try again.'
        });
        return;
      }

      // Map rows with exact required column names
      const excelRows = recordsToExport.map((d) => ({
        'Delivery ID': d.deliveryId,
        'Delivery Name/Batch': d.batchName,
        'Client': d.client,
        'Consignee': d.consignee,
        'Place / Delivery Area': d.placeAndArea || `${d.destination} / ${d.area || 'Luzon'}`,
        'Quantity': `${d.quantity} ${d.unit}`,
        'Individual POD Number': d.individualPodNumber || d.podNumber,
        'Recipient Name (Driver-entered)': d.driverRecipientName || '',
        'Recipient Name (Encoder-confirmed)': d.recipientName || '',
        'Driver': d.driverName,
        'Helper': d.helper || '—',
        'Truck Run': d.truckRunNumber,
        'Actual Delivery Date': d.actualDeliveryDate || '',
        'Date Received by Consignee': d.dateReceived || d.actualDeliveryDate || '',
        'POD Due Date': d.podReturnDueDate || '',
        'Physical POD Return Date': d.podReturnDate || 'PENDING',
        'POD Status': d.podStatusLabel,
        'SLA Status': d.slaStatusLabel,
        'POD Remarks': d.remarks || '—',
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      worksheet['!cols'] = [
        { wch: 16 }, // Delivery ID
        { wch: 26 }, // Delivery Name/Batch
        { wch: 28 }, // Client
        { wch: 28 }, // Consignee
        { wch: 26 }, // Place / Delivery Area
        { wch: 14 }, // Quantity
        { wch: 22 }, // Individual POD Number
        { wch: 26 }, // Recipient Name (Driver-entered)
        { wch: 26 }, // Recipient Name (Encoder-confirmed)
        { wch: 24 }, // Driver
        { wch: 18 }, // Helper
        { wch: 20 }, // Truck Run
        { wch: 18 }, // Actual Delivery Date
        { wch: 24 }, // Date Received by Consignee
        { wch: 16 }, // POD Due Date
        { wch: 22 }, // Physical POD Return Date
        { wch: 16 }, // POD Status
        { wch: 16 }, // SLA Status
        { wch: 32 }, // POD Remarks
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'POD Returning');

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `POD_Returning_Report_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);

      setActionFeedback({
        type: 'success',
        message: `Successfully exported ${recordsToExport.length} POD returning record${recordsToExport.length === 1 ? '' : 's'} to Excel (${filename}).`
      });
    } catch (err: any) {
      console.error('[Excel Export Error]', err);
      setActionFeedback({
        type: 'error',
        message: `Excel export failed: ${err?.message || 'An error occurred during export.'}`
      });
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Delivery ID',
      'Delivery Name/Batch',
      'Client',
      'Consignee',
      'Place / Delivery Area',
      'Quantity',
      'Individual POD Number',
      'Recipient Name (Driver-entered)',
      'Recipient Name (Encoder-confirmed)',
      'Driver',
      'Helper',
      'Truck Run',
      'Actual Delivery Date',
      'Date Received by Consignee',
      'POD Due Date',
      'Physical POD Return Date',
      'POD Status',
      'SLA Status',
      'POD Remarks'
    ];

    const rows = filteredDeliveries.map(d => [
      `"${d.deliveryId}"`,
      `"${d.batchName}"`,
      `"${d.client}"`,
      `"${d.consignee}"`,
      `"${d.placeAndArea || `${d.destination} / ${d.area || 'Luzon'}`}"`,
      `"${d.quantity} ${d.unit}"`,
      `"${d.individualPodNumber || d.podNumber}"`,
      `"${d.driverRecipientName || ''}"`,
      `"${d.recipientName || ''}"`,
      `"${d.driverName}"`,
      `"${d.helper || '—'}"`,
      `"${d.truckRunNumber}"`,
      `"${d.actualDeliveryDate}"`,
      `"${d.dateReceived || d.actualDeliveryDate}"`,
      `"${d.podReturnDueDate}"`,
      `"${d.podReturnDate || 'PENDING'}"`,
      `"${d.podStatusLabel}"`,
      `"${d.slaStatusLabel}"`,
      `"${(d.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `POD_Returning_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionFeedback({
      type: 'success',
      message: `Successfully exported ${filteredDeliveries.length} POD returning records to CSV.`
    });
  };

  return (
    <div id="pod-returning-module" className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">POD Returning</h1>
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                  canEncodePod 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : isDriver
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {canEncodePod ? 'Encoder Portal' : isDriver ? 'Driver Portal (View Only)' : 'View Only Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor deliveries awaiting physical POD return, review driver delivery confirmations, and encode physical POD return dates with SLA calculations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Requirement 2: DOWNLOAD POD RETURNING EXCEL button */}
          <button
            id="download-pod-returning-excel-btn"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
            title="Download currently filtered POD Returning records as Excel spreadsheet (.xlsx)"
          >
            <Download className="w-4 h-4 text-white" />
            <span>DOWNLOAD POD RETURNING EXCEL</span>
          </button>

          <button
            id="export-pod-csv-btn"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
            title="Download as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner (Success / Error alerts) */}
      {actionFeedback && (
        <div 
          id="action-feedback-banner"
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionFeedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role Reminder for Drivers (Requirement 3: Role Permissions) */}
      {isDriver && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Driver Notice:</strong> Drivers can view POD records and delivery statuses. Final POD Return confirmation and editing of confirmed recipient names is reserved for Encoders.
          </span>
        </div>
      )}

      {/* 1. Summary Counters (5 Dynamic Monitoring Counters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Counter 1: Total Delivered */}
        <div 
          id="counter-total-delivered"
          onClick={() => { setStatusFilter('ALL'); setActiveTab('deliveries'); }}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer ${
            statusFilter === 'ALL' && activeTab === 'deliveries'
              ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Delivered</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalDeliveredCount}</span>
            <span className="text-[10px] font-semibold text-blue-600">All Delivered</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">All completed delivery consignments</p>
        </div>

        {/* Counter 2: POD Pending */}
        <div 
          id="counter-pod-pending"
          onClick={() => { setStatusFilter('POD PENDING'); setActiveTab('deliveries'); }}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer ${
            statusFilter === 'POD PENDING' && activeTab === 'deliveries'
              ? 'border-amber-500 ring-2 ring-amber-100 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">POD Pending</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{podPendingCount}</span>
            <span className="text-[10px] font-semibold text-amber-600">Awaiting Physical POD</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">Delivered; no physical POD return date</p>
        </div>

        {/* Counter 3: POD Returned */}
        <div 
          id="counter-pod-returned"
          onClick={() => { setStatusFilter('POD RETURNED'); setActiveTab('deliveries'); }}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer ${
            statusFilter === 'POD RETURNED' && activeTab === 'deliveries'
              ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">POD Returned</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">{podReturnedCount}</span>
            <span className="text-[10px] font-semibold text-indigo-600">Encoded Returns</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">Physical POD returned and recorded</p>
        </div>

        {/* Counter 4: SLA HIT */}
        <div 
          id="counter-sla-hit"
          onClick={() => { setStatusFilter('SLA HIT'); setActiveTab('deliveries'); }}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer ${
            statusFilter === 'SLA HIT' && activeTab === 'deliveries'
              ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SLA HIT</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{slaHitCount}</span>
            <span className="text-[10px] font-semibold text-emerald-600">On-Time Returns</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">Physical POD returned within SLA window</p>
        </div>

        {/* Counter 5: SLA MISSED */}
        <div 
          id="counter-sla-missed"
          onClick={() => { setStatusFilter('SLA MISSED'); setActiveTab('deliveries'); }}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer ${
            statusFilter === 'SLA MISSED' && activeTab === 'deliveries'
              ? 'border-rose-500 ring-2 ring-rose-100 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SLA MISSED</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{slaMissedCount}</span>
            <span className="text-[10px] font-semibold text-rose-600">Delayed / Overdue</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">Returned late or overdue pending returns</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header & Controls */}
        <div className="border-b border-slate-200 p-4 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                id="tab-deliveries-btn"
                onClick={() => setActiveTab('deliveries')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'deliveries'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Deliveries Awaiting Physical POD ({totalDeliveredCount})
              </button>
              <button
                id="tab-notifications-btn"
                onClick={() => setActiveTab('notifications')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Driver Delivery Alerts</span>
                {unreadNotifCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick action buttons / active filters indicator */}
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  id="reset-all-filters-btn"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                  title="Clear all search queries and active filters to view all records"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return to ALL</span>
                </button>
              )}

              {activeTab === 'notifications' && (
                <button
                  id="mark-all-read-btn"
                  onClick={markAllPodReturningNotificationsAsRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Controls: Search, POD Status Filters, and Date Range Filters */}
          {activeTab === 'deliveries' && (
            <div className="space-y-2.5 pt-1 border-t border-slate-200/80">
              {/* Row 1: Search & POD Status Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* 3. Search Bar */}
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="pod-search-input"
                    type="text"
                    placeholder="Search ID, Batch, Client, Consignee, Recipient, Driver..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. POD Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 hidden sm:inline">Status:</span>
                  {(
                    [
                      { id: 'ALL', label: 'ALL', count: totalDeliveredCount },
                      { id: 'POD PENDING', label: 'POD PENDING', count: podPendingCount },
                      { id: 'POD RETURNED', label: 'POD RETURNED', count: podReturnedCount },
                      { id: 'SLA HIT', label: 'SLA HIT', count: slaHitCount },
                      { id: 'SLA MISSED', label: 'SLA MISSED', count: slaMissedCount },
                    ] as const
                  ).map((st) => {
                    const isSelected = statusFilter === st.id;
                    return (
                      <button
                        key={st.id}
                        id={`filter-status-${st.id.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setStatusFilter(st.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>{st.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isSelected 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {st.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Date Filters & Results Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-100/60 p-2 rounded-lg border border-slate-200/60">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter by Date:</span>
                  </div>

                  {/* Date field selector */}
                  <select
                    id="date-field-select"
                    value={dateFieldFilter}
                    onChange={(e) => setDateFieldFilter(e.target.value as PodDateFieldFilter)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="actualDeliveryDate">Actual Delivery Date</option>
                    <option value="podReturnDate">Physical POD Return Date</option>
                    <option value="podReturnDueDate">POD Due Date</option>
                  </select>

                  {/* From date */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">From:</span>
                    <input
                      id="date-from-input"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* To date */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">To:</span>
                    <input
                      id="date-to-input"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-slate-500">
                    Showing <span className="font-bold text-slate-800">{filteredDeliveries.length}</span> of {totalDeliveredCount} deliveries
                  </div>
                  <button
                    id="table-download-excel-btn"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition cursor-pointer shadow-2xs"
                    title="Export currently filtered list to Excel (.xlsx)"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Deliveries Table */}
        {activeTab === 'deliveries' && (
          <div className="w-full min-w-0">
            <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="font-semibold text-slate-700">POD Deliveries</span>
              <span className="text-blue-700 font-medium">Swipe to view all columns →</span>
            </div>
            <div className="overflow-x-auto w-full min-w-0">
              {filteredDeliveries.length === 0 ? (
                <div className="py-16 text-center">
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">No deliveries found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {hasActiveFilters
                      ? 'No deliveries matched your current search and filter settings. Try adjusting or clearing filters.'
                      : 'When drivers mark assigned deliveries as DELIVERED, they will appear here awaiting physical POD encoding.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearAllFilters}
                      className="mt-3.5 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return to ALL Deliveries</span>
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3 whitespace-nowrap">Delivery ID</th>
                    <th className="py-3 px-3 whitespace-nowrap">Delivery Name / Batch</th>
                    <th className="py-3 px-3 whitespace-nowrap">Client</th>
                    <th className="py-3 px-3 whitespace-nowrap">Consignee</th>
                    <th className="py-3 px-3 whitespace-nowrap">Place</th>
                    <th className="py-3 px-3 whitespace-nowrap">Quantity</th>
                    <th className="py-3 px-3 whitespace-nowrap">Recipient Name</th>
                    <th className="py-3 px-3 whitespace-nowrap">Driver</th>
                    <th className="py-3 px-3 whitespace-nowrap">Truck Run</th>
                    <th className="py-3 px-3 whitespace-nowrap">Actual Delivery Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">Individual Delivery POD</th>
                    <th className="py-3 px-3 whitespace-nowrap">POD Due Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">Physical POD Return Date</th>
                    <th className="py-3 px-3 whitespace-nowrap">POD Status</th>
                    <th className="py-3 px-3 whitespace-nowrap">SLA Status</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDeliveries.map((item) => {
                    const isPending = !item.podReturnDate;
                    const isReturned = Boolean(item.podReturnDate);
                    const isHit = item.podStatus === 'HIT';
                    const isMissed = item.podStatus === 'MISSED';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                        {/* 1. Delivery ID */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 font-mono">{item.deliveryId}</div>
                          {item.hasUnreadNotif && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">
                              <Bell className="w-2.5 h-2.5" /> NEW ALERT
                            </span>
                          )}
                        </td>

                        {/* 2. Delivery Name/Batch */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 truncate max-w-[130px]" title={item.batchName}>
                            {item.batchName}
                          </div>
                        </td>

                        {/* 3. Client */}
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium flex items-center gap-1 truncate max-w-[130px]" title={item.client}>
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.client}</span>
                          </div>
                        </td>

                        {/* 4. Consignee */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 truncate max-w-[140px]" title={item.consignee}>
                            {item.consignee}
                          </div>
                        </td>

                        {/* 5. Place */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 flex items-center gap-1 truncate max-w-[120px]" title={item.destination}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.destination}</span>
                          </div>
                        </td>

                        {/* 6. Quantity */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">
                            {item.quantity} {item.unit}
                          </span>
                        </td>

                        {/* 7. Recipient Name */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 max-w-[160px]">
                            <div className="flex items-center gap-1.5 truncate" title={item.recipientName}>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-slate-900 truncate">
                                {item.recipientName && item.recipientName !== '—' ? (
                                  item.recipientName
                                ) : (
                                  <span className="text-slate-400 font-normal italic">Not recorded</span>
                                )}
                              </span>
                            </div>
                            {/* History trigger button only displayed when edited */}
                            {item.isRecipientEdited && item.recipientNameHistory && item.recipientNameHistory.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setHistoryModalRecord({
                                  deliveryId: item.deliveryId,
                                  batchName: item.batchName,
                                  consignee: item.consignee,
                                  driverRecipientName: item.driverRecipientName || 'Original',
                                  currentRecipientName: item.recipientName,
                                  recipientNameHistory: item.recipientNameHistory,
                                })}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200/80 px-1.5 py-0.5 rounded border border-amber-300 transition cursor-pointer w-fit"
                                title="Click to view Recipient Name Edit History"
                              >
                                <History className="w-2.5 h-2.5 text-amber-700" />
                                <span>Edited ({item.recipientNameHistory.length})</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 8. Driver */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900 flex items-center gap-1 truncate max-w-[130px]" title={item.driverName}>
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.driverName}</span>
                          </div>
                        </td>

                        {/* 9. Truck Run */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                            <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.truckRunNumber}</span>
                          </div>
                        </td>

                        {/* 10. Actual Delivery Date */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-900 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.actualDeliveryDate || item.dateReceived || '—'}</span>
                          </div>
                        </td>

                        {/* 11. Individual Delivery POD */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {item.podNumber}
                          </span>
                        </td>

                        {/* 12. POD Due Date */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-medium text-slate-800">
                            {item.podReturnDueDate || '—'}
                          </span>
                        </td>

                        {/* 13. Physical POD Return Date */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.podReturnDate ? (
                            <span className="font-bold text-slate-900">{item.podReturnDate}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Awaiting Return</span>
                            </span>
                          )}
                        </td>

                        {/* 14. POD Status (POD PENDING / POD RETURNED) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600" />
                              POD PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-2xs">
                              <Check className="w-3 h-3 text-indigo-600" />
                              POD RETURNED
                            </span>
                          )}
                        </td>

                        {/* 15. SLA Status (SLA HIT / SLA MISSED / PENDING SLA) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isHit && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              SLA HIT
                            </span>
                          )}
                          {isMissed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              SLA MISSED
                            </span>
                          )}
                          {!isHit && !isMissed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs">
                              <Clock className="w-3 h-3 text-slate-500" />
                              PENDING SLA
                            </span>
                          )}
                        </td>

                        {/* 16. Action: VIEW DETAILS & ENCODE POD RETURN */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`view-details-btn-${item.deliveryId}`}
                              type="button"
                              onClick={() => setDetailsModalRecord({
                                id: item.id,
                                deliveryId: item.deliveryId,
                                batchName: item.batchName,
                                client: item.client,
                                coordinator: item.coordinator,
                                consignee: item.consignee,
                                place: item.place,
                                area: item.area,
                                placeAndArea: item.placeAndArea,
                                quantity: item.quantity,
                                unit: item.unit,
                                individualPodNumber: item.individualPodNumber || item.podNumber,
                                driverRecipientName: item.driverRecipientName || '—',
                                recipientName: item.recipientName || '—',
                                recipientNameHistory: item.recipientNameHistory || [],
                                driver: item.driverName,
                                helper: item.helper,
                                truckRunNumber: item.truckRunNumber,
                                actualDeliveryDate: item.actualDeliveryDate,
                                dateReceived: item.dateReceived,
                                podReturnDueDate: item.podReturnDueDate,
                                podReturnDueDateFormatted: item.podReturnDueDateFormatted,
                                podReturnDate: item.podReturnDate,
                                podStatus: item.podStatus,
                                podStatusLabel: item.podStatusLabel,
                                slaStatusLabel: item.slaStatusLabel,
                                remarks: item.remarks || '—',
                                source: item.source,
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs cursor-pointer"
                              title="View complete POD Returning record details"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>VIEW DETAILS</span>
                            </button>

                            {canEncodePod && (
                              <button
                                id={`encode-pod-btn-${item.deliveryId}`}
                                type="button"
                                onClick={() => handleOpenEncodeModal(item)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                                  item.podReturnDate
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                }`}
                                title="Encode or edit physical POD return"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{item.podReturnDate ? 'Edit POD' : 'ENCODE POD'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

        {/* Tab 2: Notifications Stream */}
        {activeTab === 'notifications' && (
          <div className="divide-y divide-slate-100">
            {(!podReturningNotifications || podReturningNotifications.length === 0) ? (
              <div className="py-16 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No driver delivery notifications</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  When drivers mark deliveries as delivered, real-time confirmation notifications will arrive here directly for encoder processing.
                </p>
              </div>
            ) : (
              podReturningNotifications.map((notif) => {
                const isDelivered = notif.deliveryStatus === 'DELIVERED';

                return (
                  <div 
                    key={notif.id} 
                    className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      !notif.isRead ? 'bg-blue-50/40 border-l-4 border-blue-500' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                          {!notif.isRead && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-400 text-slate-950 rounded">
                              NEW
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1">{notif.message}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">Delivery: {notif.deliveryId}</span>
                          <span>•</span>
                          <span>Consignee: <strong className="text-slate-700">{notif.consignee}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-600 inline" />
                            <span>Recipient: <strong className="text-slate-800">{notif.recipientName || notif.receiversName || '—'}</strong></span>
                          </span>
                          {notif.recipientNameHistory && notif.recipientNameHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryModalRecord({
                                  deliveryId: notif.deliveryId,
                                  batchName: notif.batchName || 'Delivery Batch',
                                  consignee: notif.consignee,
                                  driverRecipientName: notif.driverRecipientName || 'Original',
                                  currentRecipientName: notif.recipientName || '',
                                  recipientNameHistory: notif.recipientNameHistory || [],
                                });
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 transition cursor-pointer"
                              title="View Recipient Name Edit History"
                            >
                              <History className="w-2.5 h-2.5 text-amber-700" />
                              <span>Edited ({notif.recipientNameHistory.length})</span>
                            </button>
                          )}
                          <span>•</span>
                          <span>Driver: <strong>{notif.assignedDriver}</strong></span>
                          <span>•</span>
                          <span>POD Due: <strong>{notif.podReturnDueDate || 'Calculating...'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {!notif.isRead && (
                        <button
                          onClick={() => markPodReturningNotificationAsRead(notif.id)}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                      <button
                        id={`notif-encode-btn-${notif.deliveryId}`}
                        onClick={() => handleEncodeFromNotification(notif)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Encode POD Return</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal Dialog: Encode POD Return */}
      {isModalOpen && selectedRecord && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Encode Physical POD Return</h3>
                  <p className="text-[11px] text-slate-400">Record hardcopy document return and compute SLA</p>
                </div>
              </div>
              <button
                id="close-pod-modal-x-btn"
                type="button"
                aria-label="Close modal without saving"
                title="Close (Esc)"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form with Scrollable Body and Sticky Footer */}
            <form onSubmit={handleSavePodReturn} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Modal Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {/* Delivery Details Card (Read-only summary) */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Delivery ID</span>
                      <span className="font-bold text-slate-900">{selectedRecord.deliveryId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Delivery Name / Batch</span>
                      <span className="font-semibold text-slate-900 truncate block">{selectedRecord.batchName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Client</span>
                      <span className="text-slate-800 font-medium">{selectedRecord.client}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Consignee</span>
                      <span className="font-semibold text-slate-900 truncate block">{selectedRecord.consignee}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Place / Destination</span>
                      <span className="text-slate-800">{selectedRecord.destination}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Cargo Quantity</span>
                      <span className="font-semibold text-slate-900">{selectedRecord.quantity} {selectedRecord.unit}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Recipient Name</span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{selectedRecord.recipientName || '—'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Assigned Driver</span>
                      <span className="text-slate-800">{selectedRecord.driver}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Truck Run #</span>
                      <span className="font-mono text-slate-800">{selectedRecord.truckRunNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">Actual Delivery Date</span>
                      <span className="font-semibold text-slate-900">{selectedRecord.actualDeliveryDate || '—'}</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-500 font-medium block text-[10px] uppercase">POD Return Due Date</span>
                      <span className="font-bold text-blue-700">{selectedRecord.dueDate || 'Calculated on Save'}</span>
                    </div>
                  </div>
                </div>

                {/* Read-Only Individual Delivery POD Number & Recipient Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Individual POD #</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        READ-ONLY
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-pod-number-readonly"
                        type="text"
                        readOnly
                        value={selectedRecord.podNumber}
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-not-allowed select-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Original POD number assigned to delivery.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="input-recipient-name-editable" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recipient Name (Encoder Confirmation)</span>
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        REQUIRED
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-recipient-name-editable"
                        type="text"
                        required
                        value={inputRecipientName}
                        onChange={(e) => {
                          setInputRecipientName(e.target.value);
                          if (e.target.value.trim()) {
                            setRecipientNameError('');
                          }
                        }}
                        placeholder="Full name of recipient"
                        className={`w-full px-3 py-2 text-xs font-semibold bg-white border rounded-lg text-slate-900 focus:outline-none transition ${
                          recipientNameError 
                            ? 'border-rose-500 ring-1 ring-rose-500 focus:border-rose-500' 
                            : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    {recipientNameError ? (
                      <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{recipientNameError}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Review and correct the recipient name if necessary.
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional Edit Reason when name differs from driver input */}
                {selectedRecord.driverRecipientName && inputRecipientName.trim() && inputRecipientName.trim().toLowerCase() !== selectedRecord.driverRecipientName.trim().toLowerCase() && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-amber-950 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Recipient Name changed from Driver entry</span>
                      </span>
                      <span className="text-[10px] text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300 font-mono">
                        Original: {selectedRecord.driverRecipientName}
                      </span>
                    </div>
                    <div>
                      <label htmlFor="input-edit-reason" className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Edit Reason (Optional)
                      </label>
                      <input
                        id="input-edit-reason"
                        type="text"
                        value={inputEditReason}
                        onChange={(e) => setInputEditReason(e.target.value)}
                        placeholder="e.g. Typo in receiver name / Authorized company representative accepted delivery"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Recipient Name History Section — Only displayed when Recipient Name has been edited */}
                {selectedRecord.recipientNameHistory && selectedRecord.recipientNameHistory.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <History className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Recipient Name History</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        {selectedRecord.recipientNameHistory.length} {selectedRecord.recipientNameHistory.length === 1 ? 'Edit Recorded' : 'Edits Recorded'}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedRecord.recipientNameHistory.map((entry, idx) => (
                        <div key={entry.id || idx} className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs shadow-2xs space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                Original Recipient Name (Driver)
                              </span>
                              <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                                <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="line-through decoration-slate-400 text-slate-600">{entry.originalRecipientName}</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                                Final Recipient Name (Encoder)
                              </span>
                              <span className="font-bold text-emerald-900 flex items-center gap-1 mt-0.5">
                                <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{entry.finalRecipientName}</span>
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div>
                              <span className="text-[10px] font-medium text-slate-400 block">Edited By</span>
                              <span className="font-semibold text-slate-800">{entry.editedBy}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium text-slate-400 block">Edited Date and Time</span>
                              <span className="font-medium text-slate-700">
                                {new Date(entry.editedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          {entry.editReason && (
                            <div className="pt-1.5 border-t border-slate-100 text-[11px] bg-amber-50/60 p-2 rounded">
                              <span className="text-[10px] font-bold text-amber-900 block">Edit Reason:</span>
                              <span className="text-slate-800 italic">"{entry.editReason}"</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Input: Date Received by Consignee */}
                <div>
                  <label htmlFor="input-date-received" className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Received by Consignee
                  </label>
                  <input
                    id="input-date-received"
                    type="date"
                    required
                    value={inputDateReceived}
                    onChange={(e) => setInputDateReceived(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Delivery timestamp confirmed by assigned driver.
                  </p>
                </div>

                {/* Form Input: Physical POD Return Date */}
                <div>
                  <label htmlFor="input-pod-return-date" className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical POD Return Date (to Office/Encoder)
                  </label>
                  <input
                    id="input-pod-return-date"
                    type="date"
                    required
                    value={inputPodReturnDate}
                    onChange={(e) => setInputPodReturnDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    The actual date the physical proof of delivery hardcopy was received in the office.
                  </p>
                </div>

                {/* SLA Preview Banner */}
                {modalSlaPreview && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    modalSlaPreview === 'HIT' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {modalSlaPreview === 'HIT' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div className="text-xs">
                      <div className="font-bold">
                        {modalSlaPreview === 'HIT' ? 'SLA HIT: Returned On Time' : 'SLA MISSED: POD Delayed'}
                      </div>
                      <div className="text-[11px] opacity-90">
                        Due Date was <strong>{selectedRecord.dueDate}</strong>. Return Date is <strong>{inputPodReturnDate}</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Input: POD Remarks */}
                <div>
                  <label htmlFor="input-pod-remarks" className="block text-xs font-semibold text-slate-700 mb-1">
                    POD Remarks (Optional)
                  </label>
                  <textarea
                    id="input-pod-remarks"
                    rows={2}
                    value={inputRemarks}
                    onChange={(e) => setInputRemarks(e.target.value)}
                    placeholder="e.g. Original signed document verified with receiver's company stamp."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sticky / Always Visible Footer with Action Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <button
                  id="cancel-pod-return-btn"
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition border border-slate-300 bg-white shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-pod-return-btn"
                  type="submit"
                  disabled={isSubmitting || !inputPodReturnDate || !inputRecipientName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save / Confirm POD Return'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipient Name History Detail Modal */}
      {historyModalRecord && (
        <div 
          id="recipient-history-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setHistoryModalRecord(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recipient Name Edit History</h3>
                  <p className="text-[11px] text-slate-300 truncate max-w-xs sm:max-w-md">
                    Delivery: <span className="font-mono text-amber-300 font-bold">{historyModalRecord.deliveryId}</span> • {historyModalRecord.consignee}
                  </p>
                </div>
              </div>
              <button
                id="close-history-modal-btn"
                onClick={() => setHistoryModalRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Original Driver Entry</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{historyModalRecord.driverRecipientName}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Current Confirmed Name</span>
                  <span className="font-bold text-emerald-900 flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{historyModalRecord.currentRecipientName}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Audit Log ({historyModalRecord.recipientNameHistory.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Immutable change records</span>
                </div>

                {historyModalRecord.recipientNameHistory.map((item, idx) => (
                  <div key={item.id || idx} className="bg-amber-50/40 rounded-xl p-3.5 border border-amber-200 text-xs shadow-2xs space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-amber-200/60">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Original Recipient Name (Driver)
                        </span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="line-through decoration-slate-400">{item.originalRecipientName}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                          Final Recipient Name (Encoder)
                        </span>
                        <span className="font-bold text-emerald-900 flex items-center gap-1 mt-0.5">
                          <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{item.finalRecipientName}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block">Edited By (Encoder)</span>
                        <span className="font-semibold text-slate-800">{item.editedBy}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block">Edited Date and Time</span>
                        <span className="font-medium text-slate-700">
                          {new Date(item.editedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {item.editReason && (
                      <div className="pt-2 border-t border-amber-200/60 text-[11px]">
                        <span className="text-[10px] font-bold text-amber-900 block">Edit Reason:</span>
                        <span className="text-slate-800 italic bg-white/80 px-2 py-1 rounded block mt-0.5 border border-amber-200">
                          "{item.editReason}"
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                id="close-history-modal-footer-btn"
                onClick={() => setHistoryModalRecord(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition border border-slate-300 bg-white shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete POD Record Details Modal (Requirement 1: POD Record Details) */}
      {detailsModalRecord && (
        <div
          id="pod-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailsModalRecord(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight">POD Record Details</h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-blue-200 border border-white/10">
                      {detailsModalRecord.deliveryId}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      detailsModalRecord.podReturnDate 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {detailsModalRecord.podStatusLabel}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      detailsModalRecord.podStatus === 'HIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : detailsModalRecord.podStatus === 'MISSED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    }`}>
                      {detailsModalRecord.slaStatusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Batch: <span className="font-medium text-white">{detailsModalRecord.batchName}</span>
                  </p>
                </div>
              </div>

              <button
                id="close-details-modal-header-btn"
                type="button"
                onClick={() => setDetailsModalRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Organized in intuitive sections */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* SECTION 1: Consignment & Routing Details */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Consignment & Delivery Scope</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Delivery ID</span>
                    <span className="font-bold text-slate-900 font-mono">{detailsModalRecord.deliveryId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Delivery Name / Batch</span>
                    <span className="font-semibold text-slate-800">{detailsModalRecord.batchName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Client</span>
                    <span className="font-bold text-slate-900">{detailsModalRecord.client}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Coordinator</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.coordinator || 'Alodia Manalansan'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Consignee</span>
                    <span className="font-bold text-slate-900">{detailsModalRecord.consignee}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Place / Delivery Area</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.placeAndArea}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Quantity</span>
                    <span className="font-bold text-slate-900">{detailsModalRecord.quantity} {detailsModalRecord.unit}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Individual POD Number</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {detailsModalRecord.individualPodNumber}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">System generated tracking index</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Crew & Transit Assignment */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Crew & Transit Assignment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Driver</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                      {detailsModalRecord.driver}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Helper</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.helper || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Truck Run</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">{detailsModalRecord.truckRunNumber}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Delivery Execution & Recipient Tracking */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Delivery Execution & Recipient Tracking</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Actual Delivery Date</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.actualDeliveryDate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Date Received by Consignee</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.dateReceived || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Recipient Name (Driver-entered)
                    </span>
                    <div className="mt-1 p-2 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {detailsModalRecord.driverRecipientName && detailsModalRecord.driverRecipientName !== '—' 
                          ? detailsModalRecord.driverRecipientName 
                          : 'No driver entry recorded'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                      Recipient Name (Encoder-confirmed)
                    </span>
                    <div className="mt-1 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-950">
                        {detailsModalRecord.recipientName && detailsModalRecord.recipientName !== '—' 
                          ? detailsModalRecord.recipientName 
                          : 'Awaiting Encoder Confirmation'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recipient Name Edit History */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <History className="w-3 h-3 text-blue-600" />
                      Recipient Name Edit History
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {detailsModalRecord.recipientNameHistory && detailsModalRecord.recipientNameHistory.length > 0 
                        ? `${detailsModalRecord.recipientNameHistory.length} audit entry/entries` 
                        : 'No alterations recorded'}
                    </span>
                  </div>

                  {detailsModalRecord.recipientNameHistory && detailsModalRecord.recipientNameHistory.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {detailsModalRecord.recipientNameHistory.map((hist, idx) => (
                        <div key={idx} className="bg-amber-50/70 rounded-lg p-2.5 border border-amber-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-amber-900">Audit Revision #{idx + 1}</span>
                            <span>{new Date(hist.editedAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="line-through text-slate-400">{hist.originalRecipientName}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-bold text-emerald-800">{hist.finalRecipientName}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center justify-between">
                            <span>Edited by: <strong>{hist.editedBy}</strong></span>
                            {hist.editReason && <span className="italic text-slate-500">Reason: "{hist.editReason}"</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs text-slate-500 flex items-center gap-1.5 italic">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Original recipient name was confirmed as received with no modifications recorded.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: POD Return & SLA Performance */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Physical POD Return & SLA Performance</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">POD Due Date</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.podReturnDueDate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Physical POD Return Date</span>
                    <span className={`font-bold flex items-center gap-1 mt-0.5 ${detailsModalRecord.podReturnDate ? 'text-slate-900' : 'text-amber-700'}`}>
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      {detailsModalRecord.podReturnDate || 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">POD Status</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 border ${
                      detailsModalRecord.podReturnDate
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {detailsModalRecord.podStatusLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">SLA Status</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 border ${
                      detailsModalRecord.podStatus === 'HIT'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : detailsModalRecord.podStatus === 'MISSED'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}>
                      {detailsModalRecord.slaStatusLabel}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">POD Remarks</span>
                  <div className="mt-1 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 italic">
                    {detailsModalRecord.remarks || 'No remarks encoded.'}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                {canEncodePod ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Encoder Access: Authorized to update POD and recipient details.
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Driver Access: Read-only details view.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="close-details-modal-footer-btn"
                  type="button"
                  onClick={() => setDetailsModalRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition border border-slate-300 bg-white shadow-2xs cursor-pointer"
                >
                  Close
                </button>

                {canEncodePod && (
                  <button
                    id="open-encode-from-details-btn"
                    type="button"
                    onClick={() => {
                      const matchedItem = deliveredDeliveries.find(d => d.deliveryId === detailsModalRecord.deliveryId || d.id === detailsModalRecord.id);
                      if (matchedItem) {
                        setDetailsModalRecord(null);
                        handleOpenEncodeModal(matchedItem);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{detailsModalRecord.podReturnDate ? 'Edit POD Return' : 'Encode POD Return'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
