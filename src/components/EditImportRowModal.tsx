import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Building2, 
  User, 
  MapPin, 
  Calendar, 
  Package, 
  Truck, 
  FileText 
} from 'lucide-react';
import { ForwardingProgressiveRecord, ClientSummary, ForwardingMode, PhilippineArea } from '../types';
import { ValidatedImportRow } from '../utils/excelValidation';
import { 
  getAutoDeliveryLeadTime, 
  computeDeliveryPerformance, 
  computePodPerformance, 
  calculateExpectedDeliveryDate, 
  determineAutomaticDeliveryStatus,
  calculatePodReturnDueDate,
  determineAutomaticPodStatus,
} from '../utils/forwardingCalculations';

interface EditImportRowModalProps {
  isOpen: boolean;
  row: ValidatedImportRow | null;
  clients: ClientSummary[];
  onClose: () => void;
  onSaveRow: (updatedRecord: ForwardingProgressiveRecord, isRecognized: boolean) => void;
  onOpenAddClientModal?: (initialName: string) => void;
}

export const EditImportRowModal: React.FC<EditImportRowModalProps> = ({
  isOpen,
  row,
  clients,
  onClose,
  onSaveRow,
  onOpenAddClientModal,
}) => {
  if (!isOpen || !row) return null;

  const [formData, setFormData] = useState<ForwardingProgressiveRecord>({ ...row.mappedRecord });
  const [selectedClientName, setSelectedClientName] = useState(row.mappedRecord.client);
  const [consignee, setConsignee] = useState(row.mappedRecord.consignee);
  const [mode, setMode] = useState<ForwardingMode>(row.mappedRecord.modeOfShipment);
  const [area, setArea] = useState<PhilippineArea>(row.mappedRecord.area);
  const [refNo, setRefNo] = useState(row.mappedRecord.referenceNumber);
  const [dispatchDate, setDispatchDate] = useState(row.mappedRecord.actualDispatchDate);
  const [requestDeliveryDate, setRequestDeliveryDate] = useState(row.mappedRecord.requestDeliveryDate || '');
  const [podNumber, setPodNumber] = useState(row.mappedRecord.podNumber);
  const [awbNumber, setAwbNumber] = useState(row.mappedRecord.awbCourierRefNumber);
  const [quantity, setQuantity] = useState(row.mappedRecord.quantity);
  const [destinationCode, setDestinationCode] = useState(row.mappedRecord.destinationCode);
  const [courier, setCourier] = useState(row.mappedRecord.courier);
  const [actualDeliveryDate, setActualDeliveryDate] = useState(row.mappedRecord.actualDeliveryDate || '');
  const [receiversName, setReceiversName] = useState(row.mappedRecord.receiversName || '');
  const [dateOfPodReturn, setDateOfPodReturn] = useState(row.mappedRecord.dateOfPodReturn || '');

  // Find recognized client
  const matchedClient = clients.find(
    (c) => c.name.trim().toLowerCase() === selectedClientName.trim().toLowerCase()
  );
  const coordinator = matchedClient?.assignedCoordinator || matchedClient?.accountManager || 'Alodia Manalansan';

  const handleClientChange = (name: string) => {
    setSelectedClientName(name);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const leadTime = getAutoDeliveryLeadTime(selectedClientName, mode, area);

    let delTat = 0;
    let delPerf = formData.deliveryPerformance;
    if (dispatchDate && actualDeliveryDate) {
      const p = computeDeliveryPerformance(
        dispatchDate,
        actualDeliveryDate,
        leadTime,
        undefined,
        requestDeliveryDate ? requestDeliveryDate.trim() : undefined
      );
      delTat = p.tatDays;
      delPerf = p.performance;
    }

    const podResult = calculatePodReturnDueDate(
      actualDeliveryDate.trim(),
      selectedClientName,
      area
    );

    const autoPod = determineAutomaticPodStatus({
      actualDeliveryDate: actualDeliveryDate.trim(),
      podReturnDueDate: podResult.podReturnDueDate,
      actualPodReturnDate: dateOfPodReturn.trim(),
      clientName: selectedClientName,
      deliveryArea: area,
    });

    const expResult = calculateExpectedDeliveryDate(dispatchDate, mode, area);
    const autoStatus = determineAutomaticDeliveryStatus({
      actualDispatchDate: dispatchDate,
      actualDeliveryDate: actualDeliveryDate.trim(),
      expectedDeliveryDate: expResult.expectedDeliveryDate || formData.expectedDeliveryDate,
      requestDeliveryDate: requestDeliveryDate ? requestDeliveryDate.trim() : undefined,
      leadTimeDaysOrConfig: leadTime,
    });

    const updated: ForwardingProgressiveRecord = {
      ...formData,
      client: selectedClientName,
      clientId: matchedClient?.id,
      coordinator,
      consignee: consignee.trim(),
      modeOfShipment: mode,
      area,
      referenceNumber: refNo.trim(),
      actualDispatchDate: dispatchDate,
      expectedDeliveryDate: expResult.expectedDeliveryDate || formData.expectedDeliveryDate,
      expectedDeliveryDateFormatted: expResult.expectedDeliveryDateFormatted || formData.expectedDeliveryDateFormatted,
      requestDeliveryDate: requestDeliveryDate ? requestDeliveryDate.trim() : undefined,
      podNumber: podNumber.trim(),
      awbCourierRefNumber: awbNumber.trim(),
      quantity: Number(quantity) || 100,
      destinationCode: destinationCode.trim(),
      courier: courier.trim(),
      actualDeliveryDate: actualDeliveryDate.trim(),
      receiversName: receiversName.trim(),
      deliveryStatus: autoStatus.status,
      dateOfPodReturn: dateOfPodReturn.trim(),
      podStatus: autoPod.status,
      deliveryLeadTimeDays: leadTime,
      deliveryTatDays: delTat,
      deliveryPerformance: delPerf,
      podLeadTimeDays: podResult.podLeadTimeDays,
      podReturnDueDate: podResult.podReturnDueDate || undefined,
      podReturnDueDateFormatted: podResult.podReturnDueDateFormatted || undefined,
      podTatDays: autoPod.podTatDays,
      podPerformance: autoPod.podPerformance,
    };

    onSaveRow(updated, !!matchedClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              #{row.rowIndex}
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Edit Import Row #{row.rowIndex}</h3>
              <p className="text-xs text-slate-400">Review and modify mapped values prior to bulk import</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Validation Warnings / Errors Banner */}
          {(row.errors.length > 0 || row.warnings.length > 0) && (
            <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Validation Feedback for Row #{row.rowIndex}</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800 pl-1">
                {row.errors.map((e, i) => (
                  <li key={`err-${i}`} className="font-semibold text-rose-700">{e}</li>
                ))}
                {row.warnings.map((w, i) => (
                  <li key={`warn-${i}`}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1: Client & Coordinator */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              1. Client & Auto-Coordinator
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedClientName}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  required
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                  {!matchedClient && selectedClientName && (
                    <option value={selectedClientName}>⚠️ {selectedClientName} (Unregistered)</option>
                  )}
                </select>
                {!matchedClient && (
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-rose-600 font-medium">Unknown client</span>
                    {onOpenAddClientModal && (
                      <button
                        type="button"
                        onClick={() => onOpenAddClientModal(selectedClientName)}
                        className="text-blue-700 font-bold hover:underline"
                      >
                        + Register Client
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Coordinator (Auto)
                </label>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-200/80 border border-slate-300 rounded font-bold text-slate-800">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>{coordinator}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Consignment Details */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              2. Core Shipment Data
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Consignee <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="e.g. Mercury Drug - Cebu"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mode of Shipment <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ForwardingMode)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Sea Freight">Sea Freight</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="RORO">RORO</option>
                  <option value="Land Freight">Land Freight</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Area <span className="text-rose-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as PhilippineArea)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Luzon">Luzon</option>
                  <option value="Visayas">Visayas</option>
                  <option value="Mindanao">Mindanao</option>
                  <option value="NCR">NCR</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g. PRJ-VAM-801"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actual Dispatched Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-purple-900">
                    Request Delivery Date (RDD)
                  </label>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                    Optional &bull; Client Request
                  </span>
                </div>
                <input
                  type="date"
                  value={requestDeliveryDate}
                  onChange={(e) => setRequestDeliveryDate(e.target.value)}
                  placeholder="Select client requested date..."
                  className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded font-medium text-purple-900 focus:ring-1 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  POD Number
                </label>
                <input
                  type="text"
                  value={podNumber}
                  onChange={(e) => setPodNumber(e.target.value)}
                  placeholder="e.g. POD-94101"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  AWB / Courier Ref
                </label>
                <input
                  type="text"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="e.g. AWB-55410"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity (Boxes / Cases)
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination Code
                </label>
                <input
                  type="text"
                  value={destinationCode}
                  onChange={(e) => setDestinationCode(e.target.value)}
                  placeholder="e.g. CEB-01"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Delivery Details (Optional) */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              3. Delivery & POD (If completed)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actual Delivery Date
                </label>
                <input
                  type="date"
                  value={actualDeliveryDate}
                  onChange={(e) => setActualDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Receiver's Name
                </label>
                <input
                  type="text"
                  value={receiversName}
                  onChange={(e) => setReceiversName(e.target.value)}
                  placeholder="e.g. Ramon Bautista"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of POD Return
                </label>
                <input
                  type="date"
                  value={dateOfPodReturn}
                  onChange={(e) => setDateOfPodReturn(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Row Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
