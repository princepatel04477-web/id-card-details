/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StudentCardRecord } from '../../types/idcard';
import { X, Check, AlertTriangle } from 'lucide-react';

interface DuplicatesModalProps {
  students: StudentCardRecord[];
  onKeepStudent: (keepUid: string, unselectUids: string[]) => void;
  onClose: () => void;
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({
  students,
  onKeepStudent,
  onClose,
}) => {
  // Group duplicate pairs or groups by serialNumber or name+DOB
  const duplicateGroups: StudentCardRecord[][] = [];
  const processed = new Set<string>();

  for (let i = 0; i < students.length; i++) {
    const s1 = students[i];
    if (processed.has(s1.uid)) continue;

    const group: StudentCardRecord[] = [s1];
    for (let j = i + 1; j < students.length; j++) {
      const s2 = students[j];
      const isSerialMatch = Boolean(s1.serialNumber && s1.serialNumber === s2.serialNumber);
      const isNameDobMatch = Boolean(
        s1.studentName &&
          s1.dateOfBirth &&
          s1.studentName.trim().toLowerCase() === s2.studentName.trim().toLowerCase() &&
          s1.dateOfBirth === s2.dateOfBirth
      );

      if (isSerialMatch || isNameDobMatch) {
        group.push(s2);
        processed.add(s2.uid);
      }
    }

    if (group.length > 1) {
      processed.add(s1.uid);
      duplicateGroups.push(group);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Duplicate Records Resolver ({duplicateGroups.length} Group{duplicateGroups.length > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-slate-400">
                Compare duplicate entries side by side and pick which card to keep for printing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No duplicate records detected.
            </div>
          ) : (
            duplicateGroups.map((group, groupIndex) => (
              <div
                key={`group_${groupIndex}`}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Conflict Group #{groupIndex + 1}: {group[0].studentName} (Serial:{' '}
                    {group[0].serialNumber || 'N/A'})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {group.length} records matching
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.map((stu) => {
                    const otherUids = group.map((g) => g.uid).filter((u) => u !== stu.uid);
                    return (
                      <div
                        key={stu.uid}
                        className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                          stu.includeInPrint
                            ? 'bg-indigo-950/20 border-indigo-500/60 shadow-md shadow-indigo-500/5'
                            : 'bg-slate-900 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white uppercase">
                              {stu.studentName || '(No Name)'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                stu.includeInPrint
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}
                            >
                              {stu.includeInPrint ? 'Included in Print' : 'Excluded'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-300">
                            <div>
                              <span className="text-slate-500">Serial No: </span>
                              <span className="font-mono font-bold text-indigo-300">
                                {stu.serialNumber || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Class: </span>
                              <span>{stu.classSection || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Father: </span>
                              <span className="uppercase">{stu.fatherName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Mother: </span>
                              <span className="uppercase">{stu.motherName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">DOB: </span>
                              <span>{stu.dateOfBirth || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Mobile: </span>
                              <span className="font-mono">{stu.fatherMobile || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-500">Address: </span>
                              <span className="text-slate-300">
                                {stu.addressFull || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Photos preview */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                            {stu.photos.student && (
                              <img
                                src={stu.photos.student}
                                alt="Student"
                                className="w-10 h-12 object-cover rounded border border-slate-700"
                              />
                            )}
                            {stu.photos.mother && (
                              <img
                                src={stu.photos.mother}
                                alt="Mother"
                                className="w-10 h-12 object-cover rounded border border-slate-700"
                              />
                            )}
                            {stu.photos.father && (
                              <img
                                src={stu.photos.father}
                                alt="Father"
                                className="w-10 h-12 object-cover rounded border border-slate-700"
                              />
                            )}
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => onKeepStudent(stu.uid, otherUids)}
                            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Keep this one</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
