/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Building2,
  Upload,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Palette,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { CardTemplate } from '../../types/idcard';
import {
  BUILTIN_SCHOOLS,
  MODERN_SCHOOL_DEFAULT_TEMPLATE,
  loadAllSchoolTemplates,
  saveSchoolTemplate,
  deleteSchoolTemplate,
  restoreDefaultSchools,
} from '../../utils/cardTemplates';

interface SchoolDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchoolId: string;
  onSelectSchool: (template: CardTemplate) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const SchoolDesignModal: React.FC<SchoolDesignModalProps> = ({
  isOpen,
  onClose,
  currentSchoolId,
  onSelectSchool,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [schoolsList, setSchoolsList] = useState<CardTemplate[]>(BUILTIN_SCHOOLS);

  // Upload Form State
  const [schoolName, setSchoolName] = useState('');
  const [schoolSubtitle, setSchoolSubtitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [frontBgDataUrl, setFrontBgDataUrl] = useState<string>('');
  const [backBgDataUrl, setBackBgDataUrl] = useState<string>('');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load all schools including custom uploaded ones
  useEffect(() => {
    if (isOpen) {
      loadAllSchoolTemplates().then((list) => {
        setSchoolsList(list);
      });
    }
  }, [isOpen]);

  const [schoolToDelete, setSchoolToDelete] = useState<CardTemplate | null>(null);

  const handleSelectSchool = (school: CardTemplate) => {
    onSelectSchool(school);
    onShowToast(`Switched active school to "${school.schoolName || school.name}"`, 'success');
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!schoolToDelete) return;
    await deleteSchoolTemplate(schoolToDelete.id);
    const updated = await loadAllSchoolTemplates();
    setSchoolsList(updated);
    if (currentSchoolId === schoolToDelete.id && updated.length > 0) {
      onSelectSchool(updated[0]);
    }
    onShowToast(`Deleted school "${schoolToDelete.schoolName || schoolToDelete.name}"`, 'info');
    setSchoolToDelete(null);
  };

  const handleRestoreDefaults = async () => {
    const restored = await restoreDefaultSchools();
    setSchoolsList(restored);
    onShowToast('Restored all default school presets', 'success');
  };

  const handleFileRead = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomDesign = async () => {
    if (!schoolName.trim()) {
      onShowToast('Please enter a School Name', 'warning');
      return;
    }

    const id = `school_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSchoolTemplate: CardTemplate = {
      ...structuredClone(MODERN_SCHOOL_DEFAULT_TEMPLATE),
      id,
      name: schoolName.trim(),
      schoolName: schoolName.trim().toUpperCase(),
      schoolSubtitle: schoolSubtitle.trim() || 'Student Identity Card',
      primaryColor,
      accentColor,
      schoolLogo: logoDataUrl || undefined,
      isCustomUpload: true,
      bg: {
        front: frontBgDataUrl,
        back: backBgDataUrl,
      },
      elements: MODERN_SCHOOL_DEFAULT_TEMPLATE.elements.map((el) => {
        if (el.id === 'name') return { ...el, color: primaryColor };
        return el;
      }),
    };

    await saveSchoolTemplate(newSchoolTemplate);
    const updated = await loadAllSchoolTemplates();
    setSchoolsList(updated);
    onSelectSchool(newSchoolTemplate);
    onShowToast(`Saved and applied "${schoolName.trim()}"!`, 'success');

    // Reset form
    setSchoolName('');
    setSchoolSubtitle('');
    setFrontBgDataUrl('');
    setBackBgDataUrl('');
    setLogoDataUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                School Profiles &amp; Card Designs
              </h3>
              <p className="text-xs text-slate-500">
                Switch between different schools or upload your own custom school card designs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100/80 px-5 pt-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 font-bold text-xs rounded-t-xl transition-all border-t border-x ${
              activeTab === 'presets'
                ? 'bg-white text-[#1e3a8a] border-slate-200 shadow-2xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <span>Different School Presets ({schoolsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-bold text-xs rounded-t-xl transition-all border-t border-x flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-[#1e3a8a] border-slate-200 shadow-2xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload School Design</span>
          </button>
        </div>

        {/* Tab 1: Presets & School List */}
        {activeTab === 'presets' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Choose a school design to apply to all student cards:
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New School Design</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {schoolsList.map((school) => {
                const isSelected = school.id === currentSchoolId;
                const primary = school.primaryColor || '#1e3a8a';
                const accent = school.accentColor || '#f59e0b';

                return (
                  <div
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden bg-white shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-[#1e3a8a] bg-blue-50/20 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Color Accent Strip */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: primary }}
                    />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-2xs"
                            style={{ backgroundColor: primary }}
                          >
                            🎓
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {school.schoolName || school.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                              {school.schoolSubtitle || 'CBSE Affiliated'}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold shrink-0">
                            Select
                          </span>
                        )}
                      </div>

                      {/* Theme preview badges */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: primary }}
                          />
                          <span>Primary</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: accent }}
                          />
                          <span>Accent</span>
                        </span>

                        {school.isCustomUpload ? (
                          <span className="ml-auto text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        ) : (
                          <span className="ml-auto text-[10px] font-semibold text-slate-400">
                            Preset
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={schoolsList.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSchoolToDelete(school);
                          }}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-1"
                          title={
                            schoolsList.length <= 1
                              ? 'At least one school profile must remain'
                              : 'Delete this school profile'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions: Restore Defaults */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                {schoolsList.length} school {schoolsList.length === 1 ? 'profile' : 'profiles'} active.
              </span>

              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-xs font-semibold text-slate-700 hover:text-[#1e3a8a] flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                title="Restore default preset schools (DPS, St. Xavier, etc.)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Restore Default School Presets</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Upload School Design */}
        {activeTab === 'upload' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
              <Sparkles className="w-4 h-4 text-[#1e3a8a] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Upload Custom School ID Card Design:</strong>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  You can upload your school's official pre-printed background design images (Front &amp; Back) or logo, and the generator will render student details onto it.
                </p>
              </div>
            </div>

            {/* School Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. ST. MARY'S CONVENT SCHOOL"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Subtitle / Location
                </label>
                <input
                  type="text"
                  value={schoolSubtitle}
                  onChange={(e) => setSchoolSubtitle(e.target.value)}
                  placeholder="e.g. Affiliated to CBSE • New Delhi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded-xl cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Upload Front & Back Background Artworks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* School Logo */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center text-center">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileRead(e, setLogoDataUrl)}
                  className="hidden"
                />
                <span className="text-xs font-bold text-slate-800 mb-2">School Logo</span>
                {logoDataUrl ? (
                  <div className="w-16 h-16 rounded-xl border border-slate-300 bg-white p-1 mb-2 relative group">
                    <img
                      src={logoDataUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl('')}
                      className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 mb-2">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  {logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>

              {/* Front Background Artwork */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center text-center">
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileRead(e, setFrontBgDataUrl)}
                  className="hidden"
                />
                <span className="text-xs font-bold text-slate-800 mb-2">Front Card Design</span>
                {frontBgDataUrl ? (
                  <div className="w-24 h-16 rounded-xl border border-slate-300 bg-white p-0.5 mb-2 relative group overflow-hidden">
                    <img
                      src={frontBgDataUrl}
                      alt="Front card preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFrontBgDataUrl('')}
                      className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 mb-2">
                    <span className="text-[10px] text-center px-1">Vector / Custom</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  {frontBgDataUrl ? 'Change Front' : 'Upload Front Artwork'}
                </button>
              </div>

              {/* Back Background Artwork */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center text-center">
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileRead(e, setBackBgDataUrl)}
                  className="hidden"
                />
                <span className="text-xs font-bold text-slate-800 mb-2">Back Card Design</span>
                {backBgDataUrl ? (
                  <div className="w-24 h-16 rounded-xl border border-slate-300 bg-white p-0.5 mb-2 relative group overflow-hidden">
                    <img
                      src={backBgDataUrl}
                      alt="Back card preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setBackBgDataUrl('')}
                      className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 mb-2">
                    <span className="text-[10px] text-center px-1">Vector / Custom</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  {backBgDataUrl ? 'Change Back' : 'Upload Back Artwork'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'upload' ? (
            <button
              type="button"
              onClick={handleSaveCustomDesign}
              className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 active:bg-blue-950 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save &amp; Apply School Design</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold rounded-xl text-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Delete School Confirmation Modal */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Delete School Profile?
            </h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to delete <strong>{schoolToDelete.schoolName || schoolToDelete.name}</strong>? You can restore default presets anytime using "Restore Default Schools".
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSchoolToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Delete School
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
