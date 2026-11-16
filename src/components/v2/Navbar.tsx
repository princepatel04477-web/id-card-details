/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CreditCard,
  Settings,
  MoreVertical,
  Palette,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  FileText,
  Share2,
  Building2,
} from 'lucide-react';
import { CardTemplate } from '../../types/idcard';

interface NavbarProps {
  currentStep: 1 | 2 | 3;
  step1Completed: boolean;
  step2Completed: boolean;
  step3Completed: boolean;
  onSelectStep: (step: 1 | 2 | 3) => void;
  onOpenDesign: () => void;
  onOpenSettings: () => void;
  onOpenManualForm: () => void;
  onOpenShareTeacher: () => void;
  onOpenTeacherPortalDirectly?: () => void;
  onOpenSchoolModal?: () => void;
  template?: CardTemplate;
  onImportExcel: () => void;
  onLoadSample: () => void;
  onClearAll: () => void;
  readyCardsCount: number;
  totalCardsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  step1Completed,
  step2Completed,
  step3Completed,
  onSelectStep,
  onOpenDesign,
  onOpenSettings,
  onOpenManualForm,
  onOpenShareTeacher,
  onOpenTeacherPortalDirectly,
  onOpenSchoolModal,
  template,
  onImportExcel,
  onLoadSample,
  onClearAll,
  readyCardsCount,
  totalCardsCount,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center shadow-sm">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
              School ID Cards
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Direct form-to-card generator
            </p>
          </div>
        </div>

        {/* 3 Step Indicator */}
        <nav className="flex items-center gap-1 sm:gap-3 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          {/* Step 1: Upload */}
          <button
            type="button"
            onClick={() => onSelectStep(1)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[38px] ${
              currentStep === 1
                ? 'bg-white text-[#1e3a8a] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step1Completed
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 1
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {step1Completed ? <Check className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span>Upload</span>
          </button>

          <span className="text-slate-300 font-bold">&rarr;</span>

          {/* Step 2: Check Cards */}
          <button
            type="button"
            onClick={() => {
              if (totalCardsCount > 0) onSelectStep(2);
            }}
            disabled={totalCardsCount === 0}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[38px] ${
              currentStep === 2
                ? 'bg-white text-[#1e3a8a] shadow-xs font-bold'
                : totalCardsCount === 0
                ? 'text-slate-400 opacity-60 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step2Completed
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 2
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {step2Completed ? <Check className="w-3.5 h-3.5" /> : '2'}
            </span>
            <span>Check Cards</span>
            {totalCardsCount > 0 && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  readyCardsCount === totalCardsCount
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {readyCardsCount}/{totalCardsCount}
              </span>
            )}
          </button>

          <span className="text-slate-300 font-bold">&rarr;</span>

          {/* Step 3: Print */}
          <button
            type="button"
            onClick={() => {
              if (totalCardsCount > 0) onSelectStep(3);
            }}
            disabled={totalCardsCount === 0}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[38px] ${
              currentStep === 3
                ? 'bg-white text-[#1e3a8a] shadow-xs font-bold'
                : totalCardsCount === 0
                ? 'text-slate-400 opacity-60 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step3Completed
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 3
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {step3Completed ? <Check className="w-3.5 h-3.5" /> : '3'}
            </span>
            <span>Print</span>
          </button>
        </nav>

        {/* Gear Menu & Settings (Moved out of the main flow) */}
        <div className="flex items-center gap-2" ref={menuRef}>
          {onOpenSchoolModal && (
            <button
              type="button"
              onClick={onOpenSchoolModal}
              className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-2xs min-h-[38px] max-w-[200px]"
              title="Switch school profile or upload custom card design"
            >
              <Building2 className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" />
              <span className="truncate">{template?.schoolName || template?.name || 'School Profile'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenShareTeacher}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[38px]"
            title="Share student entry form link with teachers"
          >
            <Share2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Share Link to Teachers</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Options & Tools"
            aria-label="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-4 top-16 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-sm">
              {onOpenSchoolModal && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSchoolModal();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 mb-1"
                >
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" />
                  <span>School Profiles &amp; Upload Design</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (onOpenTeacherPortalDirectly) {
                    onOpenTeacherPortalDirectly();
                  } else {
                    onOpenShareTeacher();
                  }
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-[#1e3a8a] font-bold"
              >
                <Sparkles className="w-4 h-4 text-[#1e3a8a]" />
                <span>Start Teacher Form Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenShareTeacher();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
              >
                <Share2 className="w-4 h-4 text-blue-600" />
                <span>Share Link (QR / WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenManualForm();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
              >
                <FileText className="w-4 h-4 text-[#1e3a8a]" />
                <span>+ Fill Form Manually</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Template &amp; Session</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenDesign();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
              >
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Card Designer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onImportExcel();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Old Excel File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLoadSample();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Load Sample Form</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onClearAll();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-medium"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Clear All Data</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
