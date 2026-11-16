/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Check, Crop } from 'lucide-react';
import { PhotoRole, ProcessedPhoto } from '../types/icard';
import { cropImageFromBox } from '../utils/crop';

interface AddCropModalProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onAddPhoto: (newPhoto: ProcessedPhoto) => void;
}

export const AddCropModal: React.FC<AddCropModalProps> = ({
  imageSrc,
  imageWidth,
  imageHeight,
  onClose,
  onAddPhoto,
}) => {
  const [role, setRole] = useState<PhotoRole>('father');
  const [box, setBox] = useState<[number, number, number, number] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1000, ((e.clientX - rect.left) / rect.width) * 1000));
    const y = Math.max(0, Math.min(1000, ((e.clientY - rect.top) / rect.height) * 1000));

    startPosRef.current = { x, y };
    setIsDrawing(true);
    setBox([y, x, y, x]);
    setPreviewUrl(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1000, ((e.clientX - rect.left) / rect.width) * 1000));
    const currentY = Math.max(0, Math.min(1000, ((e.clientY - rect.top) / rect.height) * 1000));

    const ymin = Math.min(startPosRef.current.y, currentY);
    const xmin = Math.min(startPosRef.current.x, currentX);
    const ymax = Math.max(startPosRef.current.y, currentY);
    const xmax = Math.max(startPosRef.current.x, currentX);

    setBox([Math.round(ymin), Math.round(xmin), Math.round(ymax), Math.round(xmax)]);
  };

  const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (box && (box[2] - box[0] > 15) && (box[3] - box[1] > 15)) {
      try {
        const cropped = await cropImageFromBox(imageSrc, box, 0);
        setPreviewUrl(cropped);
      } catch {
        // Handled
      }
    } else {
      setBox(null);
    }
  };

  const handleConfirm = async () => {
    if (!box) return;
    const finalCropped = previewUrl || (await cropImageFromBox(imageSrc, box, 0));

    const newPhoto: ProcessedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      originalBox2d: box,
      currentBox2d: box,
      role,
      roleGuess: role === 'exclude' ? 'unknown' : (role as 'student' | 'father' | 'mother' | 'guardian' | 'unknown'),
      roleConfidence: 1.0, // manually created photo
      confirmed: true,
      reason: 'Manually drawn crop box on scan',
      dataUrl: finalCropped,
      rotation: 0,
    };

    onAddPhoto(newPhoto);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Crop className="w-5 h-5 text-indigo-400" />
              Draw New Photo Crop Box
            </h3>
            <p className="text-xs text-slate-400">
              Click and drag directly on the scan below to mark the photo boundaries.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
          <div className="md:col-span-3 flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-4 relative overflow-hidden select-none">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              className="relative max-h-[60vh] max-w-full cursor-crosshair inline-block shadow-lg"
              style={{
                aspectRatio: `${imageWidth || 1000} / ${imageHeight || 1400}`,
              }}
            >
              <img
                src={imageSrc}
                alt="Scan to Mark"
                className="max-h-[60vh] max-w-full object-contain pointer-events-none block"
              />

              {box && (
                <div
                  style={{
                    top: `${(box[0] / 1000) * 100}%`,
                    left: `${(box[1] / 1000) * 100}%`,
                    height: `${((box[2] - box[0]) / 1000) * 100}%`,
                    width: `${((box[3] - box[1]) / 1000) * 100}%`,
                  }}
                  className="absolute border-2 border-indigo-400 bg-indigo-500/25 pointer-events-none shadow-md"
                >
                  <span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
                    New Photo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right details */}
          <div className="flex flex-col justify-between gap-6 bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assign Photo Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PhotoRole)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="student">Student</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                  <option value="exclude">Exclude</option>
                </select>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Preview
                </h4>
                <div className="w-full aspect-[35/45] bg-slate-950 rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center p-2">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Crop Preview"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-xs text-slate-500 text-center px-4">
                      Drag a box on the scan to see preview
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <button
                type="button"
                disabled={!box || !previewUrl}
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save New Photo</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-slate-400 hover:text-slate-200 text-xs py-2 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
