/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, RotateCw, Check, Undo2 } from 'lucide-react';
import { ProcessedPhoto } from '../types/icard';
import { cropImageFromBox } from '../utils/crop';

interface AdjustCropModalProps {
  photo: ProcessedPhoto;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onSave: (updatedPhoto: ProcessedPhoto) => void;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

export const AdjustCropModal: React.FC<AdjustCropModalProps> = ({
  photo,
  imageSrc,
  imageWidth,
  imageHeight,
  onClose,
  onSave,
}) => {
  // Crop box in 0-1000 normalized coordinates [ymin, xmin, ymax, xmax]
  const [box, setBox] = useState<[number, number, number, number]>(photo.currentBox2d);
  const [rotation, setRotation] = useState<number>(photo.rotation || 0);
  const [previewUrl, setPreviewUrl] = useState<string>(photo.dataUrl);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const startPosRef = useRef<{ clientX: number; clientY: number; box: [number, number, number, number] }>({
    clientX: 0,
    clientY: 0,
    box: photo.currentBox2d,
  });

  // Update live preview when box or rotation changes
  const updatePreview = useCallback(async () => {
    try {
      const cropped = await cropImageFromBox(imageSrc, box, rotation);
      setPreviewUrl(cropped);
    } catch {
      // preview failure handled gracefully
    }
  }, [imageSrc, box, rotation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
    }, 100);
    return () => clearTimeout(timer);
  }, [updatePreview]);

  const handleMouseDown = (e: React.MouseEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    setDragMode(mode);
    startPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      box: [...box],
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startPosRef.current.clientX) / rect.width) * 1000;
    const deltaY = ((e.clientY - startPosRef.current.clientY) / rect.height) * 1000;

    const [origYmin, origXmin, origYmax, origXmax] = startPosRef.current.box;
    let [ymin, xmin, ymax, xmax] = [origYmin, origXmin, origYmax, origXmax];

    const minSize = 30; // min 3% width/height

    switch (dragMode) {
      case 'move': {
        const width = origXmax - origXmin;
        const height = origYmax - origYmin;
        xmin = Math.max(0, Math.min(1000 - width, origXmin + deltaX));
        ymin = Math.max(0, Math.min(1000 - height, origYmin + deltaY));
        xmax = xmin + width;
        ymax = ymin + height;
        break;
      }
      case 'nw': {
        xmin = Math.max(0, Math.min(origXmax - minSize, origXmin + deltaX));
        ymin = Math.max(0, Math.min(origYmax - minSize, origYmin + deltaY));
        break;
      }
      case 'ne': {
        xmax = Math.max(origXmin + minSize, Math.min(1000, origXmax + deltaX));
        ymin = Math.max(0, Math.min(origYmax - minSize, origYmin + deltaY));
        break;
      }
      case 'sw': {
        xmin = Math.max(0, Math.min(origXmax - minSize, origXmin + deltaX));
        ymax = Math.max(origYmin + minSize, Math.min(1000, origYmax + deltaY));
        break;
      }
      case 'se': {
        xmax = Math.max(origXmin + minSize, Math.min(1000, origXmax + deltaX));
        ymax = Math.max(origYmin + minSize, Math.min(1000, origYmax + deltaY));
        break;
      }
      case 'n': {
        ymin = Math.max(0, Math.min(origYmax - minSize, origYmin + deltaY));
        break;
      }
      case 's': {
        ymax = Math.max(origYmin + minSize, Math.min(1000, origYmax + deltaY));
        break;
      }
      case 'w': {
        xmin = Math.max(0, Math.min(origXmax - minSize, origXmin + deltaX));
        break;
      }
      case 'e': {
        xmax = Math.max(origXmin + minSize, Math.min(1000, origXmax + deltaX));
        break;
      }
    }

    setBox([Math.round(ymin), Math.round(xmin), Math.round(ymax), Math.round(xmax)]);
  };

  const handleMouseUp = () => {
    setDragMode(null);
  };

  const handleReset = () => {
    setBox(photo.originalBox2d);
    setRotation(0);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => ((prev - 90) % 360 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    const finalCropped = await cropImageFromBox(imageSrc, box, rotation);
    onSave({
      ...photo,
      currentBox2d: box,
      rotation,
      dataUrl: finalCropped,
      confirmed: true, // Manual crop adjustment confirms the photo
    });
    onClose();
  };

  const [ymin, xmin, ymax, xmax] = box;
  const topPct = (ymin / 1000) * 100;
  const leftPct = (xmin / 1000) * 100;
  const widthPct = ((xmax - xmin) / 1000) * 100;
  const heightPct = ((ymax - ymin) / 1000) * 100;

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
              Adjust Photo Crop &bull; <span className="capitalize text-indigo-400">{photo.role}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Drag corners to resize or grab inside to reposition the crop frame.
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

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
          {/* Main Scan with Crop Box (3 cols) */}
          <div className="md:col-span-3 flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-4 relative overflow-hidden">
            <div
              ref={containerRef}
              className="relative max-h-[60vh] max-w-full select-none inline-block shadow-lg"
              style={{
                aspectRatio: `${imageWidth || 1000} / ${imageHeight || 1400}`,
              }}
            >
              <img
                src={imageSrc}
                alt="Scan to Crop"
                className="max-h-[60vh] max-w-full object-contain pointer-events-none block"
              />

              {/* Dimmed Overlay outside box */}
              <div
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                className="absolute border-2 border-indigo-400 bg-indigo-500/20 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] z-20 group"
              >
                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                  <div className="w-3 h-px bg-white" />
                  <div className="h-3 w-px bg-white absolute" />
                </div>

                {/* Corner Handles */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize shadow"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize shadow"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow"
                />

                {/* Edge Handles */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'n')}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-indigo-400 rounded cursor-ns-resize"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 's')}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-indigo-400 rounded cursor-ns-resize"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'w')}
                  className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-6 bg-indigo-400 rounded cursor-ew-resize"
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'e')}
                  className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-6 bg-indigo-400 rounded cursor-ew-resize"
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar: Tools & Preview (1 col) */}
          <div className="flex flex-col justify-between gap-6 bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Live Preview
              </h4>
              <div className="w-full aspect-[35/45] bg-slate-950 rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Cropped Preview"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Loading...</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Aspect ratio: Standard portrait &bull; {rotation}&deg;
              </p>
            </div>

            {/* Rotation and Fine Tilt Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Orientation &amp; Tilt</span>
                <span className="font-mono text-indigo-400 font-bold">{rotation}&deg;</span>
              </div>

              {/* 90 degree rotation buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-90&deg;</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-700 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>+90&deg;</span>
                </button>
              </div>

              {/* Fine ±15° tilt slider for tilted phone photos */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1.5">
                  <span className="font-medium">Fine Tilt Slider (&plusmn;15&deg;)</span>
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => Math.round(prev / 90) * 90)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Reset tilt
                  </button>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={((rotation % 90 + 135) % 90) - 45 > -16 && ((rotation % 90 + 135) % 90) - 45 < 16 ? ((rotation % 90 + 135) % 90) - 45 : (rotation % 90 > 45 ? rotation % 90 - 90 : rotation % 90)}
                  onChange={(e) => {
                    const tilt = parseFloat(e.target.value);
                    const base90 = Math.round(rotation / 90) * 90;
                    setRotation(base90 + tilt);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  aria-label="Fine tilt angle slider"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>-15&deg;</span>
                  <span>0&deg;</span>
                  <span>+15&deg;</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs py-2 px-3 rounded-lg border border-slate-700 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Reset to AI Box</span>
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <button
                type="button"
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
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
