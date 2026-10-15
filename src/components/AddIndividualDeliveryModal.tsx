import React, { useState } from 'react';
import { X, PlusCircle, Building2, MapPin, Package, Calendar, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { DeliveryBatch, IndividualDelivery } from '../types';

interface AddIndividualDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: DeliveryBatch;
  onDeliveryAdded?: (delivery: IndividualDelivery) => void;
}

export const AddIndividualDeliveryModal: React.FC<AddIndividualDeliveryModalProps> = ({
  isOpen,
  onClose,
  batch,
  onDeliveryAdded,
}) => {
  const { addIndividualDelivery } = useData();

  const [deliveryId, setDeliveryId] = useState(
    () => `DEL-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [consignee, setConsignee] = useState('');
  const [individualDeliveryPod, setIndividualDeliveryPod] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [area, setArea] = useState('Luzon');
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [modeOfShipment, setModeOfShipment] = useState('Land Freight');
  const [rdd, setRdd] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState(batch.name);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict validation
    if (!consignee.trim()) {
      setError('Consignee / Store is required.');
      return;
    }

    if (!individualDeliveryPod.trim()) {
      setError('Individual Delivery POD Number is required.');
      return;
    }

    if (!area.trim()) {
      setError('Delivery Area is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const added = await addIndividualDelivery({
        deliveryId: deliveryId.trim() || `DEL-${individualDeliveryPod.trim()}`,
        batchId: batch.id,
        batchName: batch.name,
        client: batch.client,
        clientId: batch.clientId,
        coordinator: batch.coordinator,
        consignee: consignee.trim(),
        individualDeliveryPod: individualDeliveryPod.trim(),
        destinationCode: destinationCode.trim() || 'HUB-01',
        area: area.trim(),
        destination: destination.trim(),
        quantity: Number(quantity) || 1,
        unit: 'cases',
        modeOfShipment,
        rdd,
        referenceNumber: referenceNumber.trim() || batch.name,
        status: 'Pending Assignment',
      });

      if (onDeliveryAdded) {
        onDeliveryAdded(added);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-individual-delivery-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="add-individual-delivery-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Add Individual Delivery
              </h2>
              <p className="text-xs text-slate-300">
                Belongs to Batch: <span className="font-semibold text-emerald-300">{batch.name}</span>
              </p>
            </div>
          </div>
          <button
            id="close-add-delivery-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Info Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500">Client:</span>{' '}
            <span className="font-semibold text-slate-800">{batch.client}</span>
          </div>
          <div>
            <span className="text-slate-500">Coordinator:</span>{' '}
            <span className="font-semibold text-slate-800">{batch.coordinator}</span>
          </div>
          <div>
            <span className="text-slate-500">Project:</span>{' '}
            <span className="font-semibold text-indigo-700">{batch.name}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Delivery ID & Consignee */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Delivery ID
              </label>
              <input
                id="individual-delivery-id-input"
                type="text"
                value={deliveryId}
                onChange={(e) => setDeliveryId(e.target.value)}
                placeholder="DEL-0001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Store / Consignee <span className="text-red-500">*</span>
              </label>
              <input
                id="individual-delivery-consignee-input"
                type="text"
                required
                value={consignee}
                onChange={(e) => setConsignee(e.target.value)}
                placeholder="e.g. Store 114 - Robinson Antipolo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Individual Delivery POD & Destination Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                <span>Individual Delivery POD # <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-blue-600 font-normal">Belongs to this store</span>
              </label>
              <input
                id="individual-delivery-pod-input"
                type="text"
                required
                value={individualDeliveryPod}
                onChange={(e) => setIndividualDeliveryPod(e.target.value)}
                placeholder="e.g. 87890"
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-blue-950 font-bold text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Destination Code
              </label>
              <input
                id="individual-delivery-dest-code-input"
                type="text"
                value={destinationCode}
                onChange={(e) => setDestinationCode(e.target.value)}
                placeholder="e.g. ANT-01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Area & Place / Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Delivery Area <span className="text-red-500">*</span>
              </label>
              <select
                id="individual-delivery-area-select"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Luzon">Luzon</option>
                <option value="Visayas">Visayas</option>
                <option value="Mindanao">Mindanao</option>
                <option value="NCR">NCR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Place / Location
              </label>
              <input
                id="individual-delivery-location-input"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Antipolo City, Rizal"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quantity, Mode, RDD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Quantity (cases/boxes)
              </label>
              <input
                id="individual-delivery-qty-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Mode of Shipment
              </label>
              <select
                id="individual-delivery-mode-select"
                value={modeOfShipment}
                onChange={(e) => setModeOfShipment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Land Freight">Land Freight</option>
                <option value="Air Freight">Air Freight</option>
                <option value="Sea Freight">Sea Freight</option>
                <option value="RORO">RORO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                RDD (Request Delivery Date)
              </label>
              <input
                id="individual-delivery-rdd-input"
                type="date"
                value={rdd}
                onChange={(e) => setRdd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Reference Number / Code
            </label>
            <input
              id="individual-delivery-ref-input"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. GADC-2026-08A"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              id="cancel-add-delivery-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-add-delivery-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add Delivery'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
