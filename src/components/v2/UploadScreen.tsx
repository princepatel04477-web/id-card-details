/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
  Sparkles,
  ArrowRight,
  Share2,
  ExternalLink,
  Smartphone,
  Building2,
  Upload,
  Trash2,
} from 'lucide-react';
import { FormRecord } from '../../types/icard';
import { CardTemplate } from '../../types/idcard';

interface UploadScreenProps {
  forms: FormRecord[];
  isProcessing: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadSample: () => void;
  onRetryForm: (id: string) => void;
  onDeleteForm?: (id: string) => void;
  onGoToCheckCards: () => void;
  onOpenSettings: () => void;
  onOpenManualForm: () => void;
  onOpenShareTeacher: () => void;
  onOpenTeacherPortalDirectly?: () => void;
  onOpenSchoolModal?: () => void;
  onOpenUploadDesign?: () => void;
  template?: CardTemplate;
  sessionYear: string;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  forms,
  isProcessing,
  onFilesSelected,
  onLoadSample,
  onRetryForm,
  onDeleteForm,
  onGoToCheckCards,
  onOpenSettings,
  onOpenManualForm,
  onOpenShareTeacher,
  onOpenTeacherPortalDirectly,
  onOpenSchoolModal,
  onOpenUploadDesign,
  template,
  sessionYear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const completedCount = forms.filter(
    (f) => f.status === 'Needs Review' || f.status === 'Approved'
  ).length;
  const inProgressCount = forms.filter(
    (f) => f.status === 'Extracting' || f.status === 'Pending'
  ).length;
  const errorCount = forms.filter((f) => f.status === 'Error').length;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:py-10 bg-slate-50 flex flex-col items-center justify-start">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Active School Profile Banner (Shown from the very first screen) */}
        {template && (
          <div className="w-full mb-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-xs shrink-0"
                style={{ backgroundColor: template.primaryColor || '#1e3a8a' }}
              >
                {template.schoolLogo ? (
                  <img src={template.schoolLogo} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                  '🎓'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active School Profile
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-200"
                    style={{ backgroundColor: template.accentColor || '#f59e0b' }}
                    title="School Accent Color"
                  />
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {template.schoolName || template.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {template.schoolSubtitle || 'Card design loaded & active for ID generation'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={onOpenSchoolModal}
                className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                title="Select different school"
              >
                <Building2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <span>Switch School</span>
              </button>

              <button
                type="button"
                onClick={onOpenUploadDesign}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                title="Upload background design or logo for another school"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload School Design</span>
              </button>
            </div>
          </div>
        )}

        {/* Large Clean Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full rounded-2xl border-2 border-dashed p-8 sm:p-14 flex flex-col items-center text-center cursor-pointer transition-all duration-200 bg-white shadow-xs ${
            isDragOver
              ? 'border-[#1e3a8a] bg-blue-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files);
              }
            }}
            className="hidden"
          />

          <div className="w-20 h-20 rounded-2xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center mb-5 shadow-xs">
            <UploadCloud className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Drop form scans or phone photos here
          </h2>
          <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
            Upload student admission performa forms (JPG, PNG, or multi-page PDF). Photos and handwriting are read automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-6 py-3 bg-[#1e3a8a] hover:bg-blue-900 active:bg-blue-950 text-white font-semibold rounded-xl text-base shadow-sm hover:shadow transition-all min-h-[44px]"
            >
              Choose files
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenManualForm();
              }}
              className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm border border-slate-300 transition-all min-h-[44px] flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-[#1e3a8a]" />
              <span>Fill form manually</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenTeacherPortalDirectly) {
                  onOpenTeacherPortalDirectly();
                } else {
                  onOpenShareTeacher();
                }
              }}
              className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] font-bold rounded-xl text-sm border border-blue-200 transition-all min-h-[44px] flex items-center gap-2 shadow-2xs"
            >
              <Smartphone className="w-4 h-4 text-[#1e3a8a]" />
              <span>Start Teacher Link</span>
            </button>
          </div>
        </div>

        {/* Dedicated Teacher Form Link Callout */}
        <div className="w-full mt-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Teacher Submission Link</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Ready &amp; Active
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Share with class teachers so they can enter student details &amp; upload photos directly from their phones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => onOpenTeacherPortalDirectly ? onOpenTeacherPortalDirectly() : onOpenShareTeacher()}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Start Form Now</span>
            </button>

            <button
              type="button"
              onClick={onOpenShareTeacher}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Share Link (QR / WhatsApp)</span>
            </button>
          </div>
        </div>

        {/* Subtle Settings & Sample Form bar below dropzone */}
        <div className="w-full flex items-center justify-between text-xs text-slate-500 mt-3 px-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors py-1 px-2 rounded-lg hover:bg-slate-200/60"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Academic Session: <strong className="text-slate-700">{sessionYear}</strong> &bull; Settings</span>
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-blue-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load realistic sample form</span>
          </button>
        </div>

        {/* Progress List & Forms State */}
        {forms.length > 0 && (
          <div className="w-full mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {inProgressCount > 0
                    ? `Reading ${completedCount + 1} of ${forms.length} forms…`
                    : `${forms.length} forms ready`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {completedCount} completed &bull; {errorCount} errors
                </p>
              </div>

              {/* Action Button: Go to Step 2 Check Cards */}
              {forms.length > 0 && (
                <button
                  type="button"
                  onClick={onGoToCheckCards}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold rounded-xl text-sm shadow-sm transition-all min-h-[40px]"
                >
                  <span>Go to Check Cards</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* List of uploaded files */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={form.originalImageDataUrl}
                      alt={form.fileName}
                      className="w-10 h-12 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {form.fields.studentName.value
                          ? `${form.fields.studentName.value} (S.No ${form.fields.serialNumber.value || '—'})`
                          : form.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.fields.classSection.value ? `Class ${form.fields.classSection.value}` : form.fileName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {form.status === 'Extracting' ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Reading…</span>
                      </div>
                    ) : form.status === 'Pending' ? (
                      <span className="text-xs text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-full font-medium">
                        Waiting
                      </span>
                    ) : form.status === 'Error' ? (
                      <button
                        type="button"
                        onClick={() => onRetryForm(form.id)}
                        className="flex items-center gap-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-1 rounded-full font-medium transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </span>
                    )}

                    {onDeleteForm && (
                      <button
                        type="button"
                        onClick={() => onDeleteForm(form.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete this uploaded record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
