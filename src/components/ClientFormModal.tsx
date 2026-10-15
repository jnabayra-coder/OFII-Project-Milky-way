import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Check, 
  Save,
  ShieldCheck
} from 'lucide-react';
import { ClientSummary } from '../types';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveClient: (client: ClientSummary) => void;
  clientToEdit?: ClientSummary | null;
  initialClientName?: string;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSaveClient,
  clientToEdit = null,
  initialClientName = '',
}) => {
  const isEditMode = !!clientToEdit;

  const [name, setName] = useState('');
  const [assignedCoordinator, setAssignedCoordinator] = useState('Alodia Manalansan');
  const [primaryContact, setPrimaryContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('Luzon');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [code, setCode] = useState('');

  // System States
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate or reset form whenever modal opens or clientToEdit changes
  useEffect(() => {
    if (isOpen) {
      setIsDirty(false);
      setShowUnsavedPrompt(false);
      setErrorMessage(null);
      if (clientToEdit) {
        setName(clientToEdit.name || '');
        setCode(clientToEdit.code || '');
        setAssignedCoordinator(clientToEdit.assignedCoordinator || clientToEdit.accountManager || 'Alodia Manalansan');
        setPrimaryContact(clientToEdit.primaryContact || '');
        setPhone(clientToEdit.phone || '');
        setEmail(clientToEdit.email || '');
        setArea(clientToEdit.area || 'Luzon');
        setAddress(clientToEdit.address || '');
        setRemarks(clientToEdit.remarks || clientToEdit.notes || '');
      } else {
        setName(initialClientName || '');
        setAssignedCoordinator('Alodia Manalansan');
        setPrimaryContact('');
        setPhone('');
        setEmail('');
        setArea('Luzon');
        setAddress('');
        setRemarks('');
        setCode('');
      }
    }
  }, [isOpen, clientToEdit, initialClientName]);

  // Auto-generate code when creating a new client if name changes
  useEffect(() => {
    if (!isEditMode && name.trim() && !code) {
      const words = name.trim().split(/\s+/);
      let acronym = '';
      if (words.length === 1) {
        acronym = words[0].slice(0, 3).toUpperCase();
      } else {
        acronym = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
      }
      const randomNum = Math.floor(100 + Math.random() * 900);
      setCode(`${acronym}-${randomNum}`);
    }
  }, [name, isEditMode, code]);

  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Unable to save record. Please try again.');
      return;
    }

    let finalCode = code.trim();
    if (!finalCode) {
      const words = name.trim().split(/\s+/);
      const acronym = words.length === 1 ? words[0].slice(0, 3).toUpperCase() : words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
      finalCode = `${acronym}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const clientPayload: ClientSummary = {
      id: clientToEdit ? clientToEdit.id : `client-${Date.now()}`,
      name: name.trim(),
      code: finalCode,
      assignedCoordinator: assignedCoordinator.trim() || 'Alodia Manalansan',
      accountManager: assignedCoordinator.trim() || 'Alodia Manalansan',
      industry: clientToEdit?.industry || '—',
      activeShipments: clientToEdit?.activeShipments ?? 0,
      deliveredThisMonth: clientToEdit?.deliveredThisMonth ?? 0,
      onTimeRate: clientToEdit?.onTimeRate ?? 98.0,
      primaryContact: primaryContact.trim() || '—',
      email: email.trim() || '—',
      phone: phone.trim() || '—',
      address: address.trim() || '—',
      area: area || 'Luzon',
      remarks: remarks.trim() || '—',
      notes: remarks.trim() || '—',
      tin: clientToEdit?.tin || '—',
      isDeactivated: clientToEdit ? clientToEdit.isDeactivated : false,
      isDeleted: false,
    };

    onSaveClient(clientPayload);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-3 sm:my-6">
          
          {/* Modal Header */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-blue-700 text-white shadow-xs shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{isEditMode ? 'Edit Client' : 'Add Client'}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700">
                    {isEditMode ? 'Corporate Master Record' : 'New Account'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isEditMode 
                    ? 'Update corporate client information and primary dispatch contacts.'
                    : 'Register a client. The client will immediately be available across all monitoring modules.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border-b border-rose-300 px-4 sm:px-6 py-2.5 flex items-center gap-2.5 text-xs text-rose-900 animate-in fade-in shrink-0">
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Modal Form */}
          <form 
            onSubmit={handleSubmit} 
            onChange={() => setIsDirty(true)}
            className="p-4 sm:p-6 space-y-5 text-xs text-slate-700 bg-slate-50/50 overflow-y-auto flex-1"
          >
          
          {/* CLIENT INFORMATION GROUP */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Client Information</span>
              </h4>
              <span className="text-[10px] text-slate-400 italic">
                * Required fields
              </span>
            </div>

            {/* Row: Client Name & Assigned Coordinator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Intelligent Skin Care Inc."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Assigned Coordinator <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-blue-600 pointer-events-none" />
                  <input
                    type="text"
                    required
                    list="coordinator-options"
                    placeholder="e.g. Alodia Manalansan"
                    value={assignedCoordinator}
                    onChange={(e) => setAssignedCoordinator(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs"
                  />
                  <datalist id="coordinator-options">
                    <option value="Alodia Manalansan" />
                    <option value="Justine Ryan Paular" />
                    <option value="Rojay" />
                  </datalist>
                </div>
              </div>
            </div>

            {/* Row: Contact Person & Contact Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Contact Person <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos / Engr. Roberto Dimalanta"
                    value={primaryContact}
                    onChange={(e) => setPrimaryContact(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Contact Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. +63 (2) 8892-3400 or 0917 555 0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Row: Email Address & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="e.g. logistics@client.com.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Area
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs cursor-pointer"
                  >
                    <option value="Luzon">Luzon</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                    <option value="NCR">NCR</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Field: Address */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Address
              </label>
              <textarea
                rows={2}
                placeholder="Complete office, plant, or warehouse dispatch address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs resize-none"
              />
            </div>

            {/* Field: Remarks */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Special delivery instructions, dedicated truck types, account terms, or gate passes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs text-xs resize-none"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-xs transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'SAVE CHANGES' : 'SAVE CLIENT'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

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
