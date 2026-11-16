/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Settings, Check } from 'lucide-react';
import { CardTemplate } from '../../types/idcard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionYear: string;
  onSaveSessionYear: (year: string) => void;
  template: CardTemplate;
  onUpdateTemplateTitle: (title: string) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sessionYear,
  onSaveSessionYear,
  template,
  onUpdateTemplateTitle,
  onShowToast,
}) => {
  const [year, setYear] = useState(sessionYear);
  const [schoolName, setSchoolName] = useState(template.name);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSessionYear(year);
    onUpdateTemplateTitle(schoolName);
    onShowToast('Settings saved', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Template &amp; Session Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Academic Session Year
            </label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2026-27"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Printed on the front of all ID cards (e.g. Year : 2026-27).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              School Name / Template
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Bal Bhavan International School"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden text-slate-900"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 min-h-[38px]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
