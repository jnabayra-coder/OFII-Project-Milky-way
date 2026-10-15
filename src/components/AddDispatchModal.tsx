import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Truck, 
  Calendar, 
  Clock, 
  Package, 
  Check, 
  Sparkles, 
  MapPin, 
  Building2,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Info 
} from 'lucide-react';
import { 
  DispatchRecord, 
  DeliveryType, 
  DispatchStatus, 
  ClientSummary,
  ForwardingMode,
  PhilippineArea 
} from '../types';
import { SearchableClientSelect } from './SearchableClientSelect';
import { AddClientModal } from './AddClientModal';
import { MilitaryTimeInput } from './MilitaryTimeInput';
import { getAutoDeliveryLeadTime, calculateExpectedDeliveryDate } from '../utils/forwardingCalculations';
import { validateDispatchTimeSequence } from '../utils/timeUtils';
import { UnsavedChangesModal } from './UnsavedChangesModal';

export interface DispatchPrefillData {
  clientName?: string;
  consignee?: string;
  podNumber?: string;
  referenceNumber?: string;
  deliveryDate?: string;
  destination?: string;
  quantity?: number | string;
  unit?: string;
  modeOfShipment?: ForwardingMode;
  area?: PhilippineArea;
  notificationId?: string;
}

interface AddDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDispatch?: (dispatch: DispatchRecord, notificationId?: string) => void | Promise<any>;
  onAdd?: (dispatch: DispatchRecord, notificationId?: string) => void | Promise<any>;
  clients: ClientSummary[];
  onAddNewClient?: (client: ClientSummary) => void;
  initialPrefillData?: DispatchPrefillData | null;
  prefillData?: DispatchPrefillData | null;
  existingDispatches?: DispatchRecord[];
  onViewExistingDispatch?: (dispatch: DispatchRecord) => void;
}

const COMMON_TRUCK_PROVIDERS = [
  'OFII Fleet Logistics',
  'OFII Fleet RoRo Transporter',
  'MetroFreight Express Corp.',
  'TransLuzon Cargo Haulers',
  'Islands Inter-Island Logistics',
  'QuickHaul Freight Services',
  'Fast Logistics Carrier',
  '2GO Freight Partner',
  'Apex Heavy Transport Inc.',
  'SafeWay Fleet Solutions',
];

export const AddDispatchModal: React.FC<AddDispatchModalProps> = ({
  isOpen,
  onClose,
  onAddDispatch,
  onAdd,
  clients,
  onAddNewClient,
  initialPrefillData,
  prefillData,
  existingDispatches = [],
  onViewExistingDispatch,
}) => {
  const effectivePrefill = initialPrefillData || prefillData;

  // SECTION 1 — DELIVERY INFORMATION
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState('2026-08-25');
  const [deliveryDate, setDeliveryDate] = useState('2026-08-23');
  const [clientName, setClientName] = useState('Intelligent Skin Care Inc.');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('ISCI');
  const [modeOfShipment, setModeOfShipment] = useState<ForwardingMode>('RORO');
  const [area, setArea] = useState<PhilippineArea>('Visayas');
  const [consignee, setConsignee] = useState('Belo Aesthetic Center Central Cebu');
  const [destination, setDestination] = useState('Belo Medical Hub - Visayas Central, Cebu City');

  // SECTION 2 — SHIPMENT INFORMATION
  const [podNumber, setPodNumber] = useState(`POD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [manifestNumber, setManifestNumber] = useState(`MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [drNumber, setDrNumber] = useState(`DR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [sealNumber, setSealNumber] = useState(`SEAL-OFII-${Math.floor(10000 + Math.random() * 90000)}`);
  const [itemDescription, setItemDescription] = useState('Commercial Cargo Consignment');
  const [quantity, setQuantity] = useState('350');
  const [unit, setUnit] = useState('Boxes');
  const [status, setStatus] = useState<DispatchStatus>('In Loading');
  const [remarks, setRemarks] = useState('Priority scheduled dispatch. Cargo inspected and seals verified.');

  // SECTION 3 — TRUCK INFORMATION
  const [truckProvider, setTruckProvider] = useState('OFII Fleet RoRo Transporter');
  const [plateNumber, setPlateNumber] = useState('NDB-7890');
  const [driverName, setDriverName] = useState('Danilo P. Hernandez');
  const [driverContact, setDriverContact] = useState('+63 917 842 1190');

  // SECTION 4 — DISPATCH TIMELINE
  const [truckArrival, setTruckArrival] = useState('07:30 AM');
  const [loadingStart, setLoadingStart] = useState('08:00 AM');
  const [loadingEnd, setLoadingEnd] = useState('09:15 AM');
  const [departureTime, setDepartureTime] = useState('09:30 AM');

  // Add Client Sub-Modal state
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [initialNewClientName, setInitialNewClientName] = useState('');

  // Unsaved Changes and System State
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill state initialization when modal opens or prefill data is supplied
  useEffect(() => {
    if (isOpen) {
      setIsDirty(false);
      setErrorMessage(null);
      setShowUnsavedPrompt(false);
      setIsSubmitting(false);
      const prefill = initialPrefillData || prefillData;
      if (prefill) {
        // Automatically pre-fill ONLY the information available from Forwarding Progressive record
        setClientName(prefill.clientName || 'Intelligent Skin Care Inc.');
        setConsignee(prefill.consignee || '');
        setPodNumber(prefill.podNumber || '');
        setDeliveryDate(prefill.deliveryDate || '2026-08-24');
        setPlannedDeliveryDate(prefill.deliveryDate || '2026-08-25');
        setDestination(prefill.destination || prefill.consignee || '');
        setQuantity(prefill.quantity !== undefined ? String(prefill.quantity) : '100');
        setUnit(prefill.unit || 'Boxes');
        setArea(prefill.area || 'Luzon');
        setModeOfShipment(prefill.modeOfShipment || 'Land Freight');
        
        const isClientISCI = (prefill.clientName || '').toLowerCase().includes('isci') || 
                             (prefill.clientName || '').toLowerCase().includes('intelligent skin care');
        setDeliveryType(isClientISCI ? 'ISCI' : 'GADC');

        // Leave dispatch-specific fields clear / editable for manual employee entry
        setTruckProvider('');
        setPlateNumber('');
        setDriverName('');
        setDriverContact('');
        setTruckArrival('');
        setLoadingStart('');
        setLoadingEnd('');
        setDepartureTime('');
        setManifestNumber('');
        setRemarks(prefill.referenceNumber ? `[Forwarding Ref: ${prefill.referenceNumber}]` : '');
        setStatus('In Loading');
      } else {
        // Default standard initial values for manual Add Dispatch
        setPlannedDeliveryDate('2026-08-25');
        setDeliveryDate('2026-08-23');
        setClientName('Intelligent Skin Care Inc.');
        setDeliveryType('ISCI');
        setModeOfShipment('RORO');
        setArea('Visayas');
        setConsignee('Belo Aesthetic Center Central Cebu');
        setDestination('Belo Medical Hub - Visayas Central, Cebu City');
        setPodNumber(`POD-${Math.floor(100000 + Math.random() * 900000)}`);
        setManifestNumber(`MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        setQuantity('350');
        setUnit('Boxes');
        setStatus('In Loading');
        setRemarks('Priority scheduled dispatch. Cargo inspected and seals verified.');
        setTruckProvider('OFII Fleet RoRo Transporter');
        setPlateNumber('NDB-7890');
        setDriverName('Danilo P. Hernandez');
        setDriverContact('+63 917 842 1190');
        setTruckArrival('07:30 AM');
        setLoadingStart('08:00 AM');
        setLoadingEnd('09:15 AM');
        setDepartureTime('09:30 AM');
      }
    }
  }, [isOpen, initialPrefillData, prefillData]);

  // DUPLICATE PROTECTION CHECK
  const matchingExistingDispatch = React.useMemo(() => {
    if (!podNumber.trim()) return undefined;
    return existingDispatches.find(d => {
      if (d.isDeleted) return false;
      const cleanInputPod = podNumber.trim().toLowerCase();
      const cleanExistingPod = d.podNumber.trim().toLowerCase();
      return cleanInputPod === cleanExistingPod;
    });
  }, [podNumber, existingDispatches]);

  // Business Rule Evaluation
  const isISCI = 
    clientName.toLowerCase().includes('intelligent skin care') || 
    clientName.toLowerCase().includes('isci');
  const isRORO = modeOfShipment === 'RORO';
  const isVisayas = area === 'Visayas';
  const isBusinessRuleApplied = isISCI && isRORO && isVisayas;

  const leadTimeDays = getAutoDeliveryLeadTime(clientName, modeOfShipment, area);

  // Centralized Leadtime Calculation Engine (Prompt 2E-1)
  const leadtimeResult = React.useMemo(() => {
    return calculateExpectedDeliveryDate(
      deliveryDate,
      modeOfShipment,
      area
    );
  }, [deliveryDate, modeOfShipment, area]);

  useEffect(() => {
    // When client changes to ISCI, default type sensibly
    if (clientName.toLowerCase().includes('isci') || clientName.toLowerCase().includes('intelligent skin care')) {
      setDeliveryType('ISCI');
    }
  }, [clientName]);

  if (!isOpen) return null;

  const handleOpenAddClient = (typedName?: string) => {
    setInitialNewClientName(typedName || '');
    setIsAddClientModalOpen(true);
  };

  const handleSaveNewClient = (newClient: ClientSummary) => {
    if (onAddNewClient) {
      onAddNewClient(newClient);
    }
    setClientName(newClient.name);
    if (newClient.address && !destination) {
      setDestination(newClient.address);
    }
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    const cleanClient = clientName.trim();
    const cleanPod = podNumber.trim();

    if (!cleanClient || !cleanPod) {
      setErrorMessage('Client Name and POD Number are required.');
      return;
    }

    // Duplicate protection guard
    if (matchingExistingDispatch) {
      setErrorMessage('A record with this POD or Reference Number already exists.');
      return;
    }

    setIsSubmitting(true);

    try {
      // If client is newly typed and not in existing clients list, register it automatically
      const existing = clients.find(c => c.name.toLowerCase() === cleanClient.toLowerCase());
      if (!existing && cleanClient && onAddNewClient) {
        const autoClient: ClientSummary = {
          id: `client-${Date.now()}`,
          name: cleanClient,
          code: `${cleanClient.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          assignedCoordinator: 'Alodia Manalansan',
          accountManager: 'Alodia Manalansan',
          industry: 'General Freight & Logistics Consignment',
          activeShipments: 1,
          deliveredThisMonth: 0,
          onTimeRate: 98.0,
          primaryContact: consignee || 'Logistics Lead',
          email: `operations@${cleanClient.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com.ph`,
          phone: '+63 (2) 8876-0000',
          address: destination,
          area: area,
        };
        onAddNewClient(autoClient);
      }

      // Generate a unique record ID
      const newId = `DSP-2026-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;

      const newRecord: DispatchRecord = {
        id: newId,
        deliveryDate,
        podNumber: cleanPod,
        quantityCasesBoxes: parseInt(quantity, 10) || 100,
        unit,
        deliveryType,
        deliveryArea: area,
        area: area,
        modeOfShipment: modeOfShipment,
        destination: destination.trim(),
        consignee: consignee.trim(),
        truckProvider: truckProvider || 'OFII Dedicated Trucking',
        plateNumber: (plateNumber || 'TBD-000').toUpperCase(),
        truckArrivalTime: truckArrival || '07:30 AM',
        loadingStartTime: loadingStart || '08:00 AM',
        loadingEndTime: loadingEnd || '09:15 AM',
        departureTime: departureTime || '09:45 AM',
        timeArrived: truckArrival || '07:30 AM',
        startLoadingTime: loadingStart || '08:00 AM',
        endLoadingTime: loadingEnd || '09:15 AM',
        actualDepartureTime: departureTime || '09:45 AM',
        plannedDeliveryDate: plannedDeliveryDate || deliveryDate,
        dispatchDate: departureTime?.split(' ')[0] || deliveryDate,
        drNumber: drNumber || `DR-${Math.floor(100000 + Math.random() * 900000)}`,
        sealNumber: sealNumber || `SEAL-OFII-${Math.floor(10000 + Math.random() * 90000)}`,
        itemDescription: itemDescription || 'Commercial Cargo Consignment',
        expectedDeliveryDate: leadtimeResult.expectedDeliveryDate || undefined,
        manifestNumber: manifestNumber || `MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        remarks: remarks || '',
        status,
        clientName: cleanClient || 'General Freight',
        driverName: driverName || 'Assigned Fleet Driver',
        driverContact: driverContact || '+63 917 000 0000',
        totalWeightKg: (parseInt(quantity, 10) || 100) * 12,
        isDeleted: false,
      };

      const addHandler = onAddDispatch || onAdd;
      const targetNotificationId = (initialPrefillData || prefillData)?.notificationId;

      if (addHandler) {
        await addHandler(newRecord, targetNotificationId);
      }

      setIsDirty(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving dispatch:', err);
      setErrorMessage(err?.message || 'Unable to save Dispatch record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-2 sm:my-4 flex flex-col max-h-[94vh] sm:max-h-[92vh]">
          
          {/* Modal Header */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0 gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 rounded bg-blue-700 text-white shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Add Dispatch
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  Encode once — Automatically creates and updates records across Dispatching, Client Shipments, and Forwarding Progressive Reports
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Form - Organized in 4 Distinct Sections */}
          <form 
            onSubmit={handleSubmit} 
            onChange={() => setIsDirty(true)}
            className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto text-xs text-slate-700 bg-slate-50/40"
          >
            {/* ERROR STATE BANNER */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2.5 text-rose-900 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}
            
            {/* Forwarding -> Dispatch Notification Banner (When pre-filled) */}
            {initialPrefillData && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-700 text-white">
                      Forwarding → Dispatch Notification
                    </span>
                    <span className="font-bold text-blue-950 text-xs">
                      Pre-filled from Forwarding Progressive Report
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                    POD: {initialPrefillData.podNumber || 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Available shipment information (<strong>Client:</strong> {initialPrefillData.clientName} • <strong>Consignee:</strong> {initialPrefillData.consignee}{initialPrefillData.referenceNumber ? ` • Ref: ${initialPrefillData.referenceNumber}` : ''}) has been automatically pre-filled. Please manually enter the operational dispatch details (Truck Provider, Plate Number, Loading & Departure Times, and Manifest Number) below.
                </p>
              </div>
            )}

            {/* DUPLICATE PROTECTION ALERT BANNER */}
            {matchingExistingDispatch && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg shadow-xs space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-950 text-xs block">
                        A record with this POD or Reference Number already exists.
                      </span>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        A record matching POD <strong>{matchingExistingDispatch.podNumber}</strong> is already registered in Daily Dispatching Monitoring (Dispatch ID: <strong>{matchingExistingDispatch.id}</strong> • Plate: <strong>{matchingExistingDispatch.plateNumber}</strong> • Status: <strong>{matchingExistingDispatch.status}</strong>).
                      </p>
                    </div>
                  </div>

                  {onViewExistingDispatch && (
                    <button
                      type="button"
                      onClick={() => {
                        onViewExistingDispatch(matchingExistingDispatch);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>VIEW DISPATCH</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Automatic Business Rule Notice if triggered */}
            {isBusinessRuleApplied && !initialPrefillData && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-blue-950 block">
                      Automated Company Rule Applied
                    </span>
                    <span className="text-[11px] text-blue-800">
                      <strong>Intelligent Skin Care Inc.</strong> + <strong>RORO</strong> + <strong>Visayas</strong> = <strong>13 Days Delivery Lead Time</strong> auto-assigned.
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-blue-700 text-white font-mono font-bold text-xs shrink-0">
                  Lead Time: 13 Days
                </span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 1 — DELIVERY INFORMATION */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-700" />
                  <span>Section 1 — Delivery Information & Routing</span>
                </h4>
                <span className="text-[11px] font-medium text-slate-500">Core Logistics</span>
              </div>

              <div className="space-y-3.5">
                {/* Row 1: Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Planned Delivery Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={plannedDeliveryDate}
                      onChange={(e) => setPlannedDeliveryDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Dispatch Date / Actual Departure Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Expected Delivery Date (Calculated via Centralized Engine) */}
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-[11px]">
                      Expected Delivery Date (Leadtime Calculation Engine):
                    </span>
                    {leadtimeResult.status === 'SUCCESS' && (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                        {leadtimeResult.leadTimeDays} Working Days
                      </span>
                    )}
                  </div>
                  {leadtimeResult.status === 'SUCCESS' ? (
                    <div>
                      <div className="font-mono font-bold text-sm text-blue-900 flex items-center gap-2">
                        <span>{leadtimeResult.expectedDeliveryDate}</span>
                        <span className="text-xs font-sans font-semibold text-blue-700">
                          ({leadtimeResult.expectedDeliveryDateFormatted})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Starts day after dispatch &bull; Counts Mon–Sat, excludes Sundays & regular holidays ({leadtimeResult.skippedSundaysCount} Sun skipped{leadtimeResult.skippedHolidaysCount > 0 ? `, ${leadtimeResult.skippedHolidaysCount} holiday skipped` : ''})
                      </p>
                    </div>
                  ) : leadtimeResult.status === 'NOT_APPLICABLE' ? (
                    <p className="text-amber-800 text-[11px] font-medium">
                      No standard leadtime is configured for this mode ({modeOfShipment}) and destination area ({area}).
                    </p>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">
                      Expected delivery date cannot be calculated until departure date, delivery mode, and destination are provided.
                    </p>
                  )}
                </div>

                {/* Row 2: Client & Delivery Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-700">
                        Client <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenAddClient(clientName)}
                        className="text-[10px] text-blue-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ Add New Client</span>
                      </button>
                    </div>
                    
                    <SearchableClientSelect
                      clients={clients}
                      value={clientName}
                      onChange={(selectedName, clientObj) => {
                        setClientName(selectedName);
                        if (clientObj?.primaryContact && !consignee) {
                          setConsignee(`${clientObj.name} Hub`);
                        }
                        if (clientObj?.address && !destination) {
                          setDestination(clientObj.address);
                        }
                        if (clientObj?.area) {
                          if (clientObj.area.includes('Visayas')) setArea('Visayas');
                          else if (clientObj.area.includes('Mindanao')) setArea('Mindanao');
                          else if (clientObj.area.includes('NCR')) setArea('NCR');
                          else setArea('Luzon');
                        }
                      }}
                      onOpenAddClientModal={handleOpenAddClient}
                      placeholder="Search or enter client name..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Delivery Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    >
                      <option value="GADC">GADC</option>
                      <option value="ISCI">ISCI</option>
                      <option value="XSEED">XSEED</option>
                      <option value="LTL">LTL</option>
                      <option value="FTL">FTL</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Mode of Shipment & Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Mode of Shipment <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={modeOfShipment}
                      onChange={(e) => setModeOfShipment(e.target.value as ForwardingMode)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    >
                      <option value="RORO">RORO (Roll-on / Roll-off Ferry)</option>
                      <option value="Land Freight">Land Freight (Dedicated / LTL Trucking)</option>
                      <option value="Sea Freight">Sea Freight (Containerized Maritime)</option>
                      <option value="Air Freight">Air Freight (Express Air Cargo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Destination Philippine Area <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value as PhilippineArea)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    >
                      <option value="Visayas">Visayas (Cebu, Iloilo, Bacolod, Leyte)</option>
                      <option value="Luzon">Luzon (North/South Luzon Corridors)</option>
                      <option value="Mindanao">Mindanao (Davao, CDO, GenSan, Zamboanga)</option>
                      <option value="NCR">NCR / Metro Manila</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Consignee & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Consignee <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Distribution Center / Hub"
                      value={consignee}
                      onChange={(e) => setConsignee(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Destination Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. City, Province, Warehouse Address"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2 — SHIPMENT INFORMATION */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-700" />
                  <span>Section 2 — Cargo & Manifest Information</span>
                </h4>
                <span className="text-[11px] font-medium text-slate-500">Waybill & Volume</span>
              </div>

              <div className="space-y-3.5">
                {/* Row 1: POD Number & Manifest Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      POD Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={podNumber}
                      onChange={(e) => setPodNumber(e.target.value)}
                      placeholder="POD-XXXXXX"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Manifest Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manifestNumber}
                      onChange={(e) => setManifestNumber(e.target.value)}
                      placeholder="MNF-2026-XXXX"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 1b: DR Number & Seal Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      DR Number
                    </label>
                    <input
                      type="text"
                      value={drNumber}
                      onChange={(e) => setDrNumber(e.target.value)}
                      placeholder="e.g. DR-884102"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Seal Number
                    </label>
                    <input
                      type="text"
                      value={sealNumber}
                      onChange={(e) => setSealNumber(e.target.value)}
                      placeholder="e.g. SEAL-OFII-1029"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 1c: Item Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Item Description
                  </label>
                  <input
                    type="text"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="e.g. Pharmaceutical Products / Commercial Supplies"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Row 2: Quantity & Initial Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Quantity / Cases / Boxes <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                      />
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-semibold text-slate-700 shrink-0"
                      >
                        <option value="Boxes">Boxes</option>
                        <option value="Cases">Cases</option>
                        <option value="Cartons">Cartons</option>
                        <option value="Pallets">Pallets</option>
                        <option value="Crates">Crates</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Initial Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as DispatchStatus)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                    >
                      <option value="In Loading">In Loading</option>
                      <option value="Departed">Departed</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Delayed">Delayed</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Remarks */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Operational Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter dispatch notes, seal numbers, special handling instructions..."
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs resize-y"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 3 — TRUCK & DRIVER INFORMATION */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-700" />
                  <span>Section 3 — Truck & Driver Assignment</span>
                </h4>
                <span className="text-[11px] font-medium text-slate-500">Hauler Assignment</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Truck Provider <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="truck-providers-list"
                    required
                    value={truckProvider}
                    onChange={(e) => setTruckProvider(e.target.value)}
                    placeholder="Select or enter truck provider..."
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                  />
                  <datalist id="truck-providers-list">
                    {COMMON_TRUCK_PROVIDERS.map((provider) => (
                      <option key={provider} value={provider} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Plate Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. NDB-7890"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Assigned Driver
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Danilo P. Hernandez"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Driver Contact Number
                  </label>
                  <input
                    type="text"
                    value={driverContact}
                    onChange={(e) => setDriverContact(e.target.value)}
                    placeholder="e.g. +63 917 842 1190"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 4 — OPERATIONAL TIMELINE */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span>Section 4 — Operational Timestamps</span>
                </h4>
                <span className="text-[11px] font-medium text-slate-500">Chronological Sequence (24-Hour Military Input)</span>
              </div>

              {/* Time Sequence Validation Warnings */}
              {(() => {
                const seq = validateDispatchTimeSequence(truckArrival, loadingStart, loadingEnd, departureTime);
                if (seq.hasWarnings) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Timeline Sequence Warning:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                        {seq.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event 1: Time Arrived */}
                <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <span>Time Arrived</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Compound Arrival</span>
                  </div>
                  <MilitaryTimeInput
                    value={truckArrival}
                    onChange={(val) => {
                      setTruckArrival(val);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. 0730"
                  />
                </div>

                {/* Event 2: Start Loading Time */}
                <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <span>Start Loading Time</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Loading Started</span>
                  </div>
                  <MilitaryTimeInput
                    value={loadingStart}
                    onChange={(val) => {
                      setLoadingStart(val);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. 0800"
                  />
                </div>

                {/* Event 3: End Loading Time */}
                <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <span>End Loading Time</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Loading Finished</span>
                  </div>
                  <MilitaryTimeInput
                    value={loadingEnd}
                    onChange={(val) => {
                      setLoadingEnd(val);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. 0915"
                  />
                </div>

                {/* Event 4: Actual Departure Time */}
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center">
                        4
                      </span>
                      <span>Actual Departure Time</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-medium">Compound Departure</span>
                  </div>
                  <MilitaryTimeInput
                    value={departureTime}
                    onChange={(val) => {
                      setDepartureTime(val);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. 0945"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* FORM FOOTER — CANCEL / SAVE DISPATCH */}
            {/* ========================================================================= */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-500">
                {matchingExistingDispatch ? (
                  <span className="text-amber-800 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Duplicate shipment detected. Click "View Dispatch" to review existing record.
                  </span>
                ) : initialPrefillData ? (
                  <span className="text-blue-700 font-medium">
                    Completing dispatch record for POD: <strong>{initialPrefillData.podNumber}</strong>
                  </span>
                ) : (
                  <span>All dispatch details will be synchronized across operational reports.</span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="min-h-[38px] flex-1 sm:flex-initial px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-300 bg-white flex items-center justify-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!!matchingExistingDispatch || isSubmitting}
                  className={`min-h-[38px] flex-1 sm:flex-initial px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 tracking-wide ${
                    matchingExistingDispatch || isSubmitting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                      : 'text-white bg-blue-700 hover:bg-blue-800 shadow-sm cursor-pointer'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'SAVING...'
                      : matchingExistingDispatch
                      ? 'DUPLICATE RECORD'
                      : 'SAVE DISPATCH'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-modal: Add New Client */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSaveClient={handleSaveNewClient}
        initialClientName={initialNewClientName}
      />

      {/* Unsaved Changes Confirmation Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedPrompt}
        onKeepEditing={() => setShowUnsavedPrompt(false)}
        onConfirmDiscard={() => {
          setShowUnsavedPrompt(false);
          setIsDirty(false);
          onClose();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave?"
      />
    </>
  );
};
