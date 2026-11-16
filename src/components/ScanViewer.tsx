/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Crosshair } from 'lucide-react';
import { ProcessedPhoto, TextFieldKey } from '../types/icard';

interface ScanViewerProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  photos: ProcessedPhoto[];
  activeField: TextFieldKey | null;
  selectedPhotoId: string | null;
  onSelectPhoto: (photoId: string) => void;
  onAddPhotoClick?: () => void;
}

// Approximate normalized vertical bands for fields to guide the user's eye
const FIELD_APPROX_AREAS: Record<TextFieldKey, [number, number, number, number]> = {
  serialNumber: [50, 50, 180, 250],
  academicSession: [150, 300, 240, 700],
  formDate: [180, 700, 260, 950],
  studentName: [240, 80, 310, 750],
  fatherName: [300, 80, 370, 750],
  motherName: [360, 80, 430, 750],
  dateOfBirth: [420, 80, 490, 750],
  classSection: [480, 80, 550, 750],
  addressLine1: [540, 80, 610, 850],
  addressLine2: [600, 80, 670, 850],
  city: [660, 80, 730, 500],
  pincode: [660, 500, 730, 850],
  residencePhone: [720, 80, 790, 850],
  fatherMobile: [780, 80, 850, 850],
  motherMobile: [840, 80, 910, 850],
  modeOfTransport: [900, 80, 970, 850],
  bloodGroup: [960, 80, 1020, 850],
};

const ROLE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  student: { border: 'border-blue-400', bg: 'bg-blue-500/25', text: 'bg-blue-600 text-white' },
  father: { border: 'border-emerald-400', bg: 'bg-emerald-500/25', text: 'bg-emerald-600 text-white' },
  mother: { border: 'border-purple-400', bg: 'bg-purple-500/25', text: 'bg-purple-600 text-white' },
  guardian: { border: 'border-amber-400', bg: 'bg-amber-500/25', text: 'bg-amber-600 text-white' },
  other: { border: 'border-cyan-400', bg: 'bg-cyan-500/25', text: 'bg-cyan-600 text-white' },
  exclude: { border: 'border-slate-500', bg: 'bg-slate-500/10', text: 'bg-slate-600 text-slate-300' },
};

export const ScanViewer: React.FC<ScanViewerProps> = ({
  imageSrc,
  imageWidth,
  imageHeight,
  photos,
  activeField,
  selectedPhotoId,
  onSelectPhoto,
  onAddPhotoClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Fit to container on initial load
  const fitToView = useCallback(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 40) / imageWidth;
    const scaleY = (clientHeight - 40) / imageHeight;
    const initialScale = Math.min(scaleX, scaleY, 1.2);
    setScale(Math.max(0.2, initialScale));
    setPan({ x: 0, y: 0 });
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale((prev) => Math.min(4.0, Math.max(0.3, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drags
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const activeFieldBox = activeField ? FIELD_APPROX_AREAS[activeField] : null;

  return (
    <div className="relative flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden select-none">
      {/* Floating Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1 shadow-lg">
        <button
          onClick={() => setScale((s) => Math.min(4.0, s * 1.2))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.3, s * 0.8))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Fit to Screen"
          aria-label="Fit to screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setScale(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reset Zoom (100%)"
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-700 mx-0.5" />
        <span className="text-[11px] font-mono text-slate-400 px-1.5">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {onAddPhotoClick && (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={onAddPhotoClick}
            className="flex items-center gap-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-400/40 shadow-lg backdrop-blur transition-all"
            aria-label="Add missing photo"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Add Missing Photo</span>
          </button>
        </div>
      )}

      {/* Main Pan/Zoom Stage */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 overflow-hidden flex items-center justify-center p-4 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
          className="relative shadow-2xl rounded-sm bg-white"
        >
          {/* Original Scan Image */}
          <img
            src={imageSrc}
            alt="Original I-Card Performa Scan"
            className="block max-w-none pointer-events-none"
            style={{
              width: imageWidth ? `${imageWidth}px` : 'auto',
              height: imageHeight ? `${imageHeight}px` : 'auto',
            }}
          />

          {/* Active Field Focus Overlay */}
          {activeFieldBox && (
            <div
              style={{
                top: `${(activeFieldBox[0] / 1000) * 100}%`,
                left: `${(activeFieldBox[1] / 1000) * 100}%`,
                height: `${((activeFieldBox[2] - activeFieldBox[0]) / 1000) * 100}%`,
                width: `${((activeFieldBox[3] - activeFieldBox[1]) / 1000) * 100}%`,
              }}
              className="absolute border-2 border-amber-400 bg-amber-400/15 pointer-events-none rounded transition-all animate-pulse z-10"
            >
              <span className="absolute -top-6 left-0 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase px-1.5 py-0.5 rounded shadow">
                Focused Field
              </span>
            </div>
          )}

          {/* Overlaid Photo Crop Boxes */}
          {photos.map((photo) => {
            const [ymin, xmin, ymax, xmax] = photo.currentBox2d;
            const topPct = (ymin / 1000) * 100;
            const leftPct = (xmin / 1000) * 100;
            const widthPct = ((xmax - xmin) / 1000) * 100;
            const heightPct = ((ymax - ymin) / 1000) * 100;

            const isSelected = selectedPhotoId === photo.id;
            const colorScheme = ROLE_COLORS[photo.role] || ROLE_COLORS.other;

            return (
              <div
                key={photo.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPhoto(photo.id);
                }}
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className={`absolute border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-4 ring-indigo-400 border-white z-20 shadow-xl'
                    : `${colorScheme.border} ${colorScheme.bg} hover:ring-2 hover:ring-white z-10`
                }`}
              >
                {/* Role badge */}
                <span
                  className={`absolute -top-6 left-0 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded shadow-md whitespace-nowrap ${colorScheme.text}`}
                >
                  {photo.role} ({Math.round(photo.roleConfidence * 100)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Drag to pan &bull; Scroll wheel to zoom</span>
        <span className="text-slate-500 font-mono">
          Resolution: {imageWidth} &times; {imageHeight}px
        </span>
      </div>
    </div>
  );
};
