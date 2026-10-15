import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  ShieldCheck, 
  Bell, 
  Sliders, 
  Building2, 
  Check, 
  Monitor, 
  Key, 
  Save, 
  Info,
  MapPin
} from 'lucide-react';
import { currentUser } from '../data/mockData';

export const SettingsView: React.FC = () => {
  const [userName, setUserName] = useState(currentUser.name);
  const [userRole, setUserRole] = useState(currentUser.role);
  const [userEmail, setUserEmail] = useState(currentUser.email);
  const [hubLocation, setHubLocation] = useState(currentUser.hubLocation);
  
  // Preferences
  const [tableDensity, setTableDensity] = useState<'compact' | 'comfortable'>('compact');
  const [defaultDeliveryType, setDefaultDeliveryType] = useState('ALL');
  const [notifyOnDelays, setNotifyOnDelays] = useState(true);
  const [notifyOnPODReceipt, setNotifyOnPODReceipt] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState('60');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-700" />
            <span>System Settings & Preferences</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure operator workstation profiles, notifications, and default monitoring parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700">
            OFII Monitoring System — Initial Prototype v0.1
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Workstation settings successfully saved and applied to your current session.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. User Profile */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-700" />
              <span>1. User Profile & Station Assignment</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">{currentUser.employeeId}</span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-white font-bold text-base flex items-center justify-center border-2 border-blue-500 shadow-xs">
                JD
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{userName}</h3>
                <p className="text-slate-500">{userRole} • {currentUser.department}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                  Authenticated User
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Full Operator Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Assigned Operational Role
                </label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Primary Terminal / Logistics Station
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={hubLocation}
                    onChange={(e) => setHubLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Account Settings */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-700" />
              <span>2. Account Security & Session Management</span>
            </h2>
            <span className="text-[11px] text-slate-400">Enterprise Standard</span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-1">Station Authentication Mode</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Single Sign-On (SSO) integrated with Orient Freight Microsoft Active Directory. Password cycles occur every 90 days.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-1">Workstation Inactivity Lock</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Terminal session automatically secures after 30 minutes of keyboard or mouse inactivity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. System Preferences */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-700" />
              <span>3. System & Monitoring Preferences</span>
            </h2>
            <span className="text-[11px] text-slate-400">Layout & Alerts</span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Default Delivery Type Filter
                </label>
                <select
                  value={defaultDeliveryType}
                  onChange={(e) => setDefaultDeliveryType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Show All (GADC / ISCI / XSEED)</option>
                  <option value="GADC">Default to GADC</option>
                  <option value="ISCI">Default to ISCI</option>
                  <option value="XSEED">Default to XSEED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Table Layout Density
                </label>
                <select
                  value={tableDensity}
                  onChange={(e) => setTableDensity(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="compact">Compact (Higher Data Density)</option>
                  <option value="comfortable">Comfortable (Spaced Padding)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Telemetry Poll Frequency
                </label>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="30">Every 30 Seconds</option>
                  <option value="60">Every 1 Minute (Recommended)</option>
                  <option value="300">Every 5 Minutes</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnDelays}
                  onChange={(e) => setNotifyOnDelays(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-700 border-slate-300"
                />
                <span>Alert on port sea swell warnings or traffic-induced route delays</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnPODReceipt}
                  onChange={(e) => setNotifyOnPODReceipt(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-700 border-slate-300"
                />
                <span>Auto-log signed POD documentation received in the electronic repository</span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-700" />
            <span>Changes persist for this browser workstation session.</span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-xs cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
