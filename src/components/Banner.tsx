/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const Banner: React.FC = () => {
  return (
    <div className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-2.5 text-xs text-slate-300 flex items-center justify-between gap-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 max-w-4xl">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong className="text-slate-100 font-medium">Privacy Guaranteed:</strong> Images are sent to Google Gemini for extraction. No data is stored on any server; everything stays in this browser.
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-slate-400 shrink-0">
        <Info className="w-3.5 h-3.5 text-indigo-400" />
        <span>IndexedDB local offline storage active</span>
      </div>
    </div>
  );
};
