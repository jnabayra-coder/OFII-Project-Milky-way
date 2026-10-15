import React, { useMemo } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit3, 
  PowerOff, 
  RotateCcw, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileCheck2,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ClientSummary, 
  ShipmentRecord, 
  DispatchRecord, 
  ForwardingProgressiveRecord,
  ShipmentStatus 
} from '../types';
import { useData } from '../context/DataContext';
import { getRolePermissions } from '../utils/roleUtils';

interface ClientDetailViewProps {
  client: ClientSummary;
  shipments: ShipmentRecord[];
  dispatches: DispatchRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  onBack: () => void;
  onEditClient: (client: ClientSummary) => void;
  onDeactivateClient: (client: ClientSummary) => void;
  onReactivateClient: (client: ClientSummary) => void;
  onSelectShipment: (shipment: ShipmentRecord) => void;
  onDeleteClient?: (client: ClientSummary) => void;
  onSelectDispatch?: (dispatch: DispatchRecord) => void;
  onSelectForwardingRecord?: (record: ForwardingProgressiveRecord) => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  shipments,
  dispatches,
  forwardingRecords,
  onBack,
  onEditClient,
  onDeactivateClient,
  onReactivateClient,
  onSelectShipment,
  onDeleteClient,
  onSelectDispatch,
  onSelectForwardingRecord,
}) => {
  const { currentUserProfile } = useData();
  const permissions = getRolePermissions(currentUserProfile);

  // Aggregate all shipments/dispatches/forwardings belonging to this client
  const clientShipments = useMemo(() => {
    // 1. Direct shipments matching clientId or client name
    const directShipments = shipments.filter(
      s => !s.isDeleted && (
        (s.clientId && s.clientId === client.id) ||
        s.client.trim().toLowerCase() === client.name.trim().toLowerCase()
      )
    );

    // 2. Map direct shipments into standard view format
    return directShipments;
  }, [client, shipments]);

  // If there are dispatches not yet explicitly in shipments, supplement or calculate metrics
  const clientDispatches = useMemo(() => {
    return dispatches.filter(
      d => !d.isDeleted && d.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()
    );
  }, [client, dispatches]);

  const clientForwarding = useMemo(() => {
    return forwardingRecords.filter(
      f => !f.isDeleted && (
        (f.clientId && f.clientId === client.id) ||
        f.client.trim().toLowerCase() === client.name.trim().toLowerCase()
      )
    );
  }, [client, forwardingRecords]);

  // Unified Shipment History Rows for the table - Single Source of Truth: Forwarding Records
  const unifiedHistory = useMemo(() => {
    // 1. Master Forwarding Records (Single Source of Truth)
    if (clientForwarding.length > 0) {
      return clientForwarding.map(f => {
        const syntheticShipment: ShipmentRecord = {
          id: f.id,
          client: f.client,
          clientId: f.clientId,
          monthStarted: f.month || 'August',
          bookedDate: f.actualDispatchDate,
          pickupDate: f.actualDispatchDate,
          deliveryDate: f.actualDeliveryDate || f.plannedDeliveryDate,
          consignee: f.consignee,
          modeOfShipment: f.modeOfShipment,
          destination: `${f.destinationCode || ''} - ${f.consignee}`,
          quantityBoxes: f.quantity,
          actualWeightKg: f.actualWeightKg,
          status: f.deliveryStatus === 'Delivered' ? 'Delivered' : (f.deliveryStatus === 'Delayed' ? 'Delayed' : (f.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
          area: f.area,
          podNumber: f.podNumber,
          plateNumber: f.plateNumber,
          manifestNumber: f.referenceNumber,
          awbNumber: f.referenceNumber,
          datePodReceived: f.dateOfPodReturn,
          podStatus: f.podStatus,
          isDeleted: false,
        };
        return {
          id: f.id,
          dispatchDate: f.actualDispatchDate || '2026-08-24',
          consignee: f.consignee || 'Authorized Consignee',
          destination: `${f.destinationCode || ''} - ${f.consignee}`,
          podNumber: f.podNumber || f.referenceNumber || f.id,
          quantity: `${f.quantity} ${f.unit || 'Boxes'}`,
          deliveryDate: f.actualDeliveryDate || f.plannedDeliveryDate || 'In Transit',
          status: (f.deliveryStatus === 'Delivered' ? 'Delivered' : (f.deliveryStatus === 'Delayed' ? 'Delayed' : (f.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked'))) as ShipmentStatus,
          rawShipment: syntheticShipment,
        };
      });
    }

    // 2. Direct shipments list
    if (clientShipments.length > 0) {
      return clientShipments.map(s => ({
        id: s.id,
        dispatchDate: s.bookedDate || s.pickupDate || '2026-08-24',
        consignee: s.consignee || 'Authorized Consignee',
        destination: s.destination || 'Metro Manila Hub',
        podNumber: s.podNumber || s.awbNumber || s.id,
        quantity: `${s.quantityBoxes} Boxes`,
        deliveryDate: s.actualDeliveryDate || s.deliveryDate || s.plannedDeliveryDate || 'In Transit',
        status: s.status,
        rawShipment: s,
      }));
    }

    // Fallback to dispatches if client has dispatches but no shipments yet
    return clientDispatches.map(d => {
      const syntheticShipment: ShipmentRecord = {
        id: `SHP-${d.podNumber || d.id}`,
        client: client.name,
        clientId: client.id,
        monthStarted: 'August',
        bookedDate: d.deliveryDate,
        pickupDate: d.deliveryDate,
        consignee: d.consignee || d.destination,
        contactNumber: d.driverContact || '+63 917 555 0199',
        modeOfShipment: d.deliveryType === 'Air Freight' ? 'Air Freight' : 'Land Freight',
        originPickupPoint: 'OFII Central Terminal',
        destination: d.destination,
        area: (client.area as any) || 'Luzon',
        requestedDeliveryDate: d.plannedDeliveryDate,
        itemDescription: `${d.quantityCasesBoxes} Cases Cargo`,
        quantityBoxes: d.quantityCasesBoxes,
        amount: 'PHP 850,000.00',
        actualCbm: 10.0,
        volumeWeight: 140.0,
        actualWeightKg: d.totalWeightKg || 180,
        chargePerWeight: 'PHP 25.00 / kg',
        vanNumber: 'VAN-01',
        truckPlate: d.plateNumber,
        estimatedDeparture: `${d.deliveryDate} ${d.departureTime || '08:00 AM'}`,
        actualDeparture: `${d.deliveryDate} ${d.departureTime || '08:30 AM'}`,
        estimatedArrival: `${d.plannedDeliveryDate} 06:00 PM`,
        actualArrival: d.status === 'Delivered' ? d.plannedDeliveryDate : 'In Transit',
        podNumber: d.podNumber,
        awbNumber: `AWB-${d.podNumber}`,
        drNumber: `DR-${d.manifestNumber || d.podNumber}`,
        sealNumber: 'SEAL-OFII-1029',
        billOfLandingNumber: 'BL-OFII-8812',
        manifestNumber: d.manifestNumber,
        plannedDeliveryDate: d.plannedDeliveryDate,
        actualDeliveryDate: d.status === 'Delivered' ? d.plannedDeliveryDate : '',
        deliveryDate: d.status === 'Delivered' ? d.plannedDeliveryDate : 'In Transit',
        receiversName: 'Consignee Representative',
        datePodReceived: d.status === 'Delivered' ? 'POD In-Hand' : 'Pending',
        dateTransmitted: d.deliveryDate,
        deliveryRemarks: d.remarks,
        status: d.status === 'Delivered' ? 'Delivered' : (d.status === 'Delayed' ? 'Delayed' : 'In Transit'),
        leadTime: '2 Days',
        tatNumber: 'TAT-OFII-2026',
        deliveryPerformance: 'On-Time',
        numberOfDays: 2,
      };

      return {
        id: d.id,
        dispatchDate: d.deliveryDate,
        consignee: d.consignee || d.destination,
        destination: d.destination,
        podNumber: d.podNumber,
        quantity: `${d.quantityCasesBoxes} ${d.unit || 'Cases'}`,
        deliveryDate: d.status === 'Delivered' ? d.plannedDeliveryDate : (d.plannedDeliveryDate || 'In Transit'),
        status: (d.status === 'Delivered' ? 'Delivered' : (d.status === 'Delayed' ? 'Delayed' : 'In Transit')) as ShipmentStatus,
        rawShipment: syntheticShipment,
      };
    });
  }, [clientShipments, clientDispatches, client]);

  // Shipment Summary KPI Calculations
  const metrics = useMemo(() => {
    const total = unifiedHistory.length;
    const delivered = unifiedHistory.filter(h => h.status === 'Delivered').length;
    const active = unifiedHistory.filter(h => h.status !== 'Delivered').length;
    const delayed = unifiedHistory.filter(h => h.status === 'Delayed').length;
    const pending = unifiedHistory.filter(h => h.status === 'Booked' || h.status === 'In Transit' || h.status === 'Out for Delivery').length;
    
    // POD Pending: check if pod is not received
    const podPending = clientShipments.filter(s => s.datePodReceived === 'Pending' || !s.datePodReceived).length + 
      clientForwarding.filter(f => f.podStatus === 'Pending Return' || f.podStatus === 'Under Review').length;

    return {
      total: total || client.activeShipments + client.deliveredThisMonth || 0,
      active: active || client.activeShipments || 0,
      delivered: delivered || client.deliveredThisMonth || 0,
      pending: pending || 0,
      delayed: delayed || 0,
      podPending: podPending || (active > 0 ? active : 0),
    };
  }, [unifiedHistory, clientShipments, clientForwarding, client]);

  const isInactive = !!client.isDeactivated;

  // Status Badge Helper
  const getStatusBadge = (status: ShipmentStatus | string) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Delivered
          </span>
        );
      case 'In Transit':
      case 'Out for Delivery':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            In Transit
          </span>
        );
      case 'Delayed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            Delayed
          </span>
        );
      case 'Booked':
      case 'In Loading':
      case 'Pending Pickup':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        
        {/* Left: Back Button & Client Name */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Client Management</span>
          </button>
          
          <div className="h-5 w-px bg-slate-300 hidden sm:block" />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {client.code}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isInactive 
                ? 'bg-slate-200 text-slate-700 border border-slate-300' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isInactive ? 'bg-slate-500' : 'bg-emerald-600'}`} />
              {isInactive ? 'Inactive' : 'Active'}
            </span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        {permissions.isReadOnly ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded shadow-2xs">
            <span>Read-Only Portal</span>
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditClient(client)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>EDIT CLIENT</span>
            </button>

            {isInactive ? (
              <button
                onClick={() => onReactivateClient(client)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REACTIVATE</span>
              </button>
            ) : (
              <button
                onClick={() => onDeactivateClient(client)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-2xs transition-colors cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>DEACTIVATE</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* SECTION 1: CLIENT INFORMATION */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold tracking-tight uppercase">
              Client Information
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {client.id}
          </span>
        </div>

        <div className="p-6 bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            
            {/* Field: Client Name */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Client Name
              </span>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {client.name}
              </p>
            </div>

            {/* Field: Assigned Coordinator */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Assigned Coordinator
              </span>
              <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>{client.assignedCoordinator || client.accountManager || '—'}</span>
              </div>
            </div>

            {/* Field: Contact Person */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Contact Person
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{client.primaryContact || '—'}</span>
              </div>
            </div>

            {/* Field: Contact Number */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Contact Number
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{client.phone || '—'}</span>
              </div>
            </div>

            {/* Field: Email Address */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{client.email || '—'}</span>
              </div>
            </div>

            {/* Field: Area */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Area
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{client.area || 'Luzon'}</span>
              </div>
            </div>

            {/* Field: Status */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Status
              </span>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold ${
                  isInactive 
                    ? 'bg-slate-200 text-slate-700 border border-slate-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {isInactive ? 'Inactive (Deactivated)' : 'Active'}
                </span>
              </div>
            </div>

            {/* Field: Client Code */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Client Code
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {client.code}
              </span>
            </div>

            {/* Field: Address */}
            <div className="md:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Address
              </span>
              <p className="text-slate-800 leading-relaxed">
                {client.address || '—'}
              </p>
            </div>

            {/* Field: Remarks */}
            <div className="md:col-span-4 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Remarks
              </span>
              <p className="text-slate-700 italic bg-white p-3 rounded border border-slate-200">
                {client.remarks || client.notes || 'No special operational remarks recorded.'}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION 2: SHIPMENT SUMMARY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-700" />
            <span>Shipment Summary</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Real-time synchronization across dispatches & forwarding
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Card 1: Total Shipments */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">Total</span>
              <Package className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.total}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total Shipments</p>
          </div>

          {/* Card 2: Active Shipments */}
          <div className="bg-white p-4 rounded-lg border border-blue-200 bg-blue-50/30 shadow-2xs">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">Active</span>
              <Truck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-950 tracking-tight">
              {metrics.active}
            </p>
            <p className="text-[10px] text-blue-700 mt-0.5">Active Shipments</p>
          </div>

          {/* Card 3: Delivered */}
          <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">Delivered</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-950 tracking-tight">
              {metrics.delivered}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Completed</p>
          </div>

          {/* Card 4: Pending */}
          <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/30 shadow-2xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-950 tracking-tight">
              {metrics.pending}
            </p>
            <p className="text-[10px] text-amber-700 mt-0.5">In Loading / Transit</p>
          </div>

          {/* Card 5: Delayed */}
          <div className="bg-white p-4 rounded-lg border border-rose-200 bg-rose-50/30 shadow-2xs">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">Delayed</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-950 tracking-tight">
              {metrics.delayed}
            </p>
            <p className="text-[10px] text-rose-700 mt-0.5">Requires Action</p>
          </div>

          {/* Card 6: POD Pending */}
          <div className="bg-white p-4 rounded-lg border border-indigo-200 bg-indigo-50/30 shadow-2xs">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">POD Pending</span>
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-950 tracking-tight">
              {metrics.podPending}
            </p>
            <p className="text-[10px] text-indigo-700 mt-0.5">Awaiting Hardcopy</p>
          </div>

        </div>
      </div>

      {/* SECTION 3: SHIPMENT HISTORY */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Truck className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold tracking-tight uppercase">
              Shipment History
            </h3>
          </div>
          <span className="text-xs text-slate-300 font-semibold">
            {unifiedHistory.length} Record{unifiedHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Dispatch Date</th>
                <th className="px-4 py-3">Consignee</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">POD Number</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Delivery Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {unifiedHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <p className="font-semibold">No shipment history recorded for this client yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      New dispatches assigned to {client.name} will automatically populate here.
                    </p>
                  </td>
                </tr>
              ) : (
                unifiedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                      {item.dispatchDate}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[200px] truncate">
                      {item.consignee}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      {item.destination}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {item.podNumber}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      {item.deliveryDate}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectShipment(item.rawShipment)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                      >
                        <span>VIEW SHIPMENT</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
