/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  FileImage,
  RefreshCw,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  FileCheck,
} from 'lucide-react';
import { FormRecord, FormStatus } from '../types/icard';

interface UploadQueueProps {
  forms: FormRecord[];
  isProcessing: boolean;
  activeProcessingCount: number;
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadSample: () => void;
  onRetryForm: (formId: string) => void;
  onSelectForm: (formId: string) => void;
  onDeleteForm: (formId: string) => void;
  onClearAll: () => void;
  onOpenExport: () => void;
}

const STATUS_CONFIG: Record<
  FormStatus,
  { label: string; badgeClass: string; icon: React.FC<{ className?: string }> }
> = {
  Pending: {
    label: 'Pending',
    badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600/50',
    icon: Clock,
  },
  Extracting: {
    label: 'Extracting...',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse',
    icon: RefreshCw,
  },
  'Needs Review': {
    label: 'Needs Review',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: AlertCircle,
  },
  Approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
  Error: {
    label: 'Error',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: AlertCircle,
  },
};

export const UploadQueue: React.FC<UploadQueueProps> = ({
  forms,
  isProcessing,
  activeProcessingCount,
  onFilesSelected,
  onLoadSample,
  onRetryForm,
  onSelectForm,
  onDeleteForm,
  onClearAll,
  onOpenExport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const totalCount = forms.length;
  const processedCount = forms.filter(
    (f) => f.status === 'Needs Review' || f.status === 'Approved'
  ).length;
  const approvedCount = forms.filter((f) => f.status === 'Approved').length;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelected(e.target.files);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Drag &amp; drop I-Card forms here, or click to browse
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports multi-file upload of JPG, PNG, WEBP, and multi-page PDFs (rendered at 2&times; scale).
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-500/40 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Load Realistic Sample I-Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Instructions (when no forms loaded) */}
      {forms.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div className="text-center max-w-lg mx-auto">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              How I-Card Extractor Works
            </h4>
            <p className="text-slate-300 text-sm mt-1">
              Automated high-accuracy extraction for school performa forms with human-in-the-loop review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h5 className="font-semibold text-white text-sm">1. Upload &amp; Extract</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add scanned performa forms. Gemini Flash identifies all printed &amp; handwritten fields plus detects photo boundaries.
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h5 className="font-semibold text-white text-sm">2. Interactive Review</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect raw vs normalized text against the original scan. Uncertain fields and low-confidence photos are highlighted amber.
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h5 className="font-semibold text-white text-sm">3. Excel (.xlsx) &amp; DOCX Export</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Export rich Excel workbooks with photos inside cells (oneCell editAs, 90pt height), editable Word documents, and CSV photo archives.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Queue & Progress */}
      {forms.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-white">Extraction Queue</h3>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {forms.length} forms total
                </span>
                {isProcessing && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-700/50 px-2.5 py-0.5 rounded-full animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Processing ({activeProcessingCount} active)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {approvedCount} of {totalCount} approved &bull; {processedCount} ready for review
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
              >
                <FileCheck className="w-4 h-4" />
                <span>Export Documents ({approvedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-xs rounded-lg transition-colors"
                title="Clear all stored forms"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Overall Processing Progress</span>
              <span className="font-mono text-slate-200">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
              />
            </div>
          </div>

          {/* Forms List Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {forms.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectForm(item.id)}
                  className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-12 h-16 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.originalImageDataUrl ? (
                        <img
                          src={item.originalImageDataUrl}
                          alt="Scan preview"
                          className="max-h-full max-w-full object-cover"
                        />
                      ) : (
                        <FileImage className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                          {item.fileName}
                        </span>
                        {item.pageIndex && item.totalPages && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                            Page {item.pageIndex}/{item.totalPages}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        {item.fields.serialNumber.value && (
                          <span className="font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700 text-[11px]">
                            S.No: {item.fields.serialNumber.value}
                          </span>
                        )}
                        {item.fields.studentName.value ? (
                          <span className="text-slate-200 font-medium truncate">
                            {item.fields.studentName.value}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No student name extracted yet</span>
                        )}
                        {item.fields.classSection.value && (
                          <span className="text-slate-400">&bull; Class: {item.fields.classSection.value}</span>
                        )}
                      </div>

                      {item.errorMessage && (
                        <div className="text-[11px] text-rose-400 truncate">
                          &bull; {item.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.badgeClass}`}
                    >
                      <StatusIcon
                        className={`w-3.5 h-3.5 ${
                          item.status === 'Extracting' ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{statusCfg.label}</span>
                    </span>

                    {/* Retry button for errors or re-extraction */}
                    {(item.status === 'Error' || item.status === 'Pending') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryForm(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Retry extraction"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteForm(item.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                      aria-label="Open review screen"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Clear All Stored Data?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete all uploaded scans, extracted fields, and cropped photos from this browser&apos;s IndexedDB. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearAll();
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
