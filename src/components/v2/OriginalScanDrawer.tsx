/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface OriginalScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  studentName: string;
  fileName: string;
}

export const OriginalScanDrawer: React.FC<OriginalScanDrawerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  studentName,
  fileName,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Original Performa Form
            </h3>
            <p className="text-xs text-slate-500">
              {studentName} &bull; {fileName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-600 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 border-l border-slate-200"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Canvas / Viewport */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center">
          <div
            className="transition-transform duration-100 origin-center"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              src={imageUrl}
              alt="Original scan"
              className="max-w-none shadow-lg rounded-lg border border-slate-300 bg-white"
              style={{ maxHeight: '85vh' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
