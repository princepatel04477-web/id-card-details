/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudentCardRecord, CardIssue } from '../../types/idcard';
import { User } from 'lucide-react';

interface StudentStripProps {
  students: StudentCardRecord[];
  selectedStudentUid: string | null;
  onSelectStudent: (uid: string) => void;
  studentIssuesMap: Map<string, CardIssue[]>;
}

export const StudentStrip: React.FC<StudentStripProps> = ({
  students,
  selectedStudentUid,
  onSelectStudent,
  studentIssuesMap,
}) => {
  const [filter, setFilter] = useState<'all' | 'needs_checking' | 'ready'>('all');

  const getStudentStatus = (student: StudentCardRecord): 'ready' | 'needs_checking' | 'error' => {
    const issues = studentIssuesMap.get(student.uid) || [];
    if (issues.length === 0) return 'ready';
    const hasError = issues.some((i) => i.level === 'error');
    return hasError ? 'needs_checking' : 'needs_checking';
  };

  const filteredStudents = students.filter((s) => {
    const status = getStudentStatus(s);
    if (filter === 'ready') return status === 'ready';
    if (filter === 'needs_checking') return status === 'needs_checking';
    return true;
  });

  const readyCount = students.filter((s) => getStudentStatus(s) === 'ready').length;
  const needsCheckingCount = students.length - readyCount;

  return (
    <div className="w-full bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-xs">
      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('needs_checking')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[32px] ${
            filter === 'needs_checking'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Needs checking ({needsCheckingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('ready')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[32px] ${
            filter === 'ready'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Ready ({readyCount})</span>
        </button>
      </div>

      {/* Horizontal Strip of Thumbnails */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin flex-1 max-w-full">
        {filteredStudents.map((s, idx) => {
          const isSelected = s.uid === selectedStudentUid;
          const status = getStudentStatus(s);

          return (
            <button
              key={s.uid}
              type="button"
              onClick={() => onSelectStudent(s.uid)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all shrink-0 min-w-[130px] max-w-[170px] text-left cursor-pointer min-h-[42px] ${
                isSelected
                  ? 'bg-blue-50/80 border-[#1e3a8a] ring-2 ring-blue-600/30 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              {/* Photo Thumbnail */}
              <div className="relative w-8 h-9 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                {s.photos.student ? (
                  <img
                    src={s.photos.student}
                    alt={s.studentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                )}
                {/* Dot */}
                <span
                  className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-white shadow-xs ${
                    status === 'ready'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
              </div>

              {/* Student info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {s.studentName || 'Unnamed'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {s.classSection ? `Class ${s.classSection}` : `S.No ${s.serialNumber || '—'}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
