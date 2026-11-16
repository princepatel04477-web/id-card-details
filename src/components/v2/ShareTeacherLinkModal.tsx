/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  MessageCircle,
  Users,
  Smartphone,
  Trash2,
} from 'lucide-react';

interface ShareTeacherLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionsCount: number;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenTeacherPortalDirectly?: () => void;
}

export const ShareTeacherLinkModal: React.FC<ShareTeacherLinkModalProps> = ({
  isOpen,
  onClose,
  submissionsCount,
  onShowToast,
  onOpenTeacherPortalDirectly,
}) => {
  const [copied, setCopied] = useState(false);
  const [submissionsList, setSubmissionsList] = useState<Array<{
    id: string;
    studentName: string;
    classSection: string;
    serialNumber: string;
    submittedAt: number;
  }>>([]);

  // Fetch submissions from backend
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/submissions')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSubmissionsList(data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleDeleteSubmission = async (subId: string, studentName: string) => {
    try {
      const res = await fetch(`/api/submissions/${subId}`, { method: 'DELETE' });
      if (res.ok) {
        setSubmissionsList((prev) => prev.filter((s) => s.id !== subId));
        onShowToast(`Deleted submission for ${studentName || 'Student'}`, 'info');
      }
    } catch {
      onShowToast('Could not delete submission', 'error');
    }
  };

  if (!isOpen) return null;

  const teacherUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?mode=teacher-form`
    : 'https://ais-dev-...run.app/?mode=teacher-form';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(teacherUrl);
      setCopied(true);
      onShowToast('Teacher submission link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('Could not copy link', 'error');
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello Teachers! Please fill out student details and photos for the new school ID cards using this link:\n${teacherUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // QR Code URL using free reliable QR image service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    teacherUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Share Link with Teachers
              </h3>
              <p className="text-xs text-slate-500">
                Let class teachers enter details &amp; take photos directly
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* QR Code Presentation */}
          <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <div className="w-44 h-44 bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center mb-3">
              <img
                src={qrCodeUrl}
                alt="Teacher form QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#1e3a8a]" />
              <span>Scan with mobile camera to open form</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Works directly on Android &amp; iPhone without app install
            </p>
          </div>

          {/* Copy Link Input Bar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Submission Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={teacherUrl}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#1e3a8a] text-white hover:bg-blue-900'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Share on WhatsApp & Open Form */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenTeacherPortalDirectly) {
                  onOpenTeacherPortalDirectly();
                } else {
                  window.location.search = '?mode=teacher-form';
                }
              }}
              className="py-2.5 px-3 bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Start Form Now</span>
            </button>
          </div>

          {/* Submissions Received & Deletion List */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1e3a8a]" />
                <span className="font-bold">
                  {submissionsList.length} Teacher Submission{submissionsList.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Live sync enabled</span>
            </div>

            {submissionsList.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {submissionsList.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {sub.studentName} {sub.classSection ? `(Class ${sub.classSection})` : ''}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {sub.serialNumber ? `S.No: ${sub.serialNumber} • ` : ''}
                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubmission(sub.id, sub.studentName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors ml-2"
                      title={`Delete submission for ${sub.studentName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                No submissions received yet. Teachers can submit details using the link or QR above.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
