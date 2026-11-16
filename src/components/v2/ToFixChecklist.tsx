/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileSearch,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { CardIssue, StudentCardRecord } from '../../types/idcard';

interface ToFixChecklistProps {
  issues: CardIssue[];
  student: StudentCardRecord;
  onFixIssue: (issueId: string) => void;
  onNextStudent: () => void;
  onToggleOriginalForm: () => void;
  onOpenFullForm: () => void;
  hasNextStudent: boolean;
}

export const ToFixChecklist: React.FC<ToFixChecklistProps> = ({
  issues,
  student,
  onFixIssue,
  onNextStudent,
  onToggleOriginalForm,
  onOpenFullForm,
  hasNextStudent,
}) => {
  const isReady = issues.length === 0;

  // Convert issues into human-friendly plain English single-line items
  const formatFriendlyMessage = (issue: CardIssue): string => {
    switch (issue.id) {
      case 'missing_student_photo':
        return 'Student photo is missing';
      case 'unconfirmed_student_photo':
        return 'Confirm student photo crop';
      case 'no_pickup_photos':
        return 'No authorised pickup photos found';
      case 'unconfirmed_adult_mother':
        return 'Confirm who is in mother photo';
      case 'unconfirmed_adult_father':
        return 'Confirm who is in father photo';
      case 'unconfirmed_adult_pickup3':
        return 'Confirm pickup person photo';
      case 'invalid_father_phone':
        return "Father's phone should be 10 digits";
      case 'invalid_mother_phone':
        return "Mother's phone should be 10 digits";
      case 'invalid_pincode':
        return 'Pincode should be 6 digits';
      case 'invalid_dob':
        return 'Check date of birth (DD-MM-YYYY)';
      case 'dup_serial':
        return 'Serial number appears twice';
      case 'dup_name_dob':
        return 'Duplicate name & birth date';
      default:
        return issue.message;
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">To Fix</h3>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isReady
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isReady ? '0 items' : `${issues.length} items`}
          </span>
        </div>

        {/* List of items to fix */}
        {!isReady ? (
          <div className="space-y-2 mb-6">
            {issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => onFixIssue(issue.id)}
                className="w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition-all text-xs font-medium text-amber-900 flex items-start gap-2.5 group cursor-pointer"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {formatFriendlyMessage(issue)}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 group-hover:underline">
                    Click to fix on card
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center text-center bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h4 className="text-lg font-bold text-emerald-950">Card ready</h4>
            <p className="text-xs text-emerald-700 mt-1 max-w-xs">
              All details, photos, and safety checks verified.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2.5">
        {/* Next Student Primary Action Button (ONE primary button per screen) */}
        {isReady && hasNextStudent ? (
          <button
            type="button"
            onClick={onNextStudent}
            className="w-full py-3 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>Next student</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : isReady && !hasNextStudent ? (
          <button
            type="button"
            onClick={onNextStudent}
            className="w-full py-3 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>All ready &bull; Go to Print</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : null}

        {/* Edit Full Form & Upload Photos */}
        <button
          type="button"
          onClick={onOpenFullForm}
          className="w-full py-2.5 px-3 bg-white hover:bg-blue-50/50 text-[#1e3a8a] font-semibold rounded-xl text-xs border border-blue-200 transition-colors flex items-center justify-center gap-2 min-h-[40px]"
        >
          <FileText className="w-4 h-4 text-[#1e3a8a]" />
          <span>Edit full form &amp; upload photos</span>
        </button>

        {/* Secondary Action: Show Original Form Scan */}
        <button
          type="button"
          onClick={onToggleOriginalForm}
          className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors flex items-center justify-center gap-2 min-h-[40px]"
        >
          <FileSearch className="w-4 h-4 text-slate-500" />
          <span>Show original form scan</span>
        </button>
      </div>
    </div>
  );
};
