import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, Building2, ChevronDown, User, MapPin } from 'lucide-react';
import { ClientSummary } from '../types';

interface SearchableClientSelectProps {
  clients: ClientSummary[];
  value: string;
  onChange: (clientName: string, clientObj?: ClientSummary) => void;
  onOpenAddClientModal?: (initialName?: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  clients,
  value,
  onChange,
  onOpenAddClientModal,
  placeholder = 'Search or enter client name...',
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal search input with external value when value changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients based on user input (Hide deactivated & deleted clients from new booking selections)
  const filteredClients = clients.filter((c) => {
    if (c.isDeactivated || c.isDeleted) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      (c.industry && c.industry.toLowerCase().includes(term))
    );
  });

  // Check if typed name already exists exactly (case-insensitive)
  const exactMatch = clients.find(
    (c) => c.name.trim().toLowerCase() === searchTerm.trim().toLowerCase()
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    onChange(newVal); // Allow direct typeable text
    setIsOpen(true);
  };

  const handleSelectClient = (client: ClientSummary) => {
    setSearchTerm(client.name);
    onChange(client.name, client);
    setIsOpen(false);
  };

  const handleCreateNewDirectly = (nameToCreate: string) => {
    const cleanName = nameToCreate.trim();
    if (!cleanName) return;
    setSearchTerm(cleanName);
    onChange(cleanName);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Field: Searchable & Typeable */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-300 rounded font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs transition-colors"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
          
          {/* Header row in dropdown */}
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Client Suggestions ({filteredClients.length})</span>
            {onOpenAddClientModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddClientModal(searchTerm.trim());
                }}
                className="text-blue-700 hover:text-blue-900 font-bold lowercase flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ full client form</span>
              </button>
            )}
          </div>

          {/* Option: Add New Typed Client if not an exact match */}
          {searchTerm.trim() && !exactMatch && (
            <div className="p-2 bg-blue-50/70 border-b border-blue-100">
              <button
                type="button"
                onClick={() => {
                  if (onOpenAddClientModal) {
                    setIsOpen(false);
                    onOpenAddClientModal(searchTerm.trim());
                  } else {
                    handleCreateNewDirectly(searchTerm);
                  }
                }}
                className="w-full text-left px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-between gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Add &ldquo;<strong>{searchTerm.trim()}</strong>&rdquo; as New Client</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-blue-700/60 rounded shrink-0">
                  New Client
                </span>
              </button>
            </div>
          )}

          {/* List of existing filtered clients */}
          {filteredClients.length > 0 ? (
            <div className="py-1">
              {filteredClients.map((client) => {
                const isSelected = client.name.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between group cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 font-bold text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-400 group-hover:text-blue-600'}`} />
                      <div className="truncate">
                        <div className="font-semibold truncate flex items-center gap-1.5">
                          <span>{client.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                            {client.code}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                          {(client.assignedCoordinator || client.accountManager) && (
                            <span className="text-blue-800 font-medium">Coord: {client.assignedCoordinator || client.accountManager}</span>
                          )}
                          {client.area && (
                            <span className="text-slate-400">• {client.area}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-700 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500">
              <p className="text-xs">No existing client matches &ldquo;{searchTerm}&rdquo;</p>
              <button
                type="button"
                onClick={() => {
                  if (onOpenAddClientModal) {
                    setIsOpen(false);
                    onOpenAddClientModal(searchTerm.trim());
                  } else {
                    handleCreateNewDirectly(searchTerm);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add &ldquo;{searchTerm.trim() || 'New Client'}&rdquo;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
