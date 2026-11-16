/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FlipHorizontal,
  Check,
  Undo2,
  Crop as CropIcon,
  Eye,
  Sliders,
  FileImage,
  User,
  Trash2,
} from 'lucide-react';

export interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
  onDelete?: () => void;
  photoRole: 'student' | 'father' | 'mother' | 'pickup3';
  photoUrl: string;
  originalScanUrl?: string;
  initialBox?: [number, number, number, number];
}

const ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  student: { label: 'Student Passport Photo', badge: 'Front Card' },
  father: { label: "Father's Photo", badge: 'Back Card (Pick-up)' },
  mother: { label: "Mother's Photo", badge: 'Back Card (Pick-up)' },
  pickup3: { label: 'Authorised Pickup / Guardian', badge: 'Back Card (Pick-up)' },
};

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  photoRole,
  photoUrl,
  originalScanUrl,
}) => {
  const [sourceMode, setSourceMode] = useState<'current' | 'scan'>('current');
  const activeImageSrc = sourceMode === 'scan' && originalScanUrl ? originalScanUrl : photoUrl;

  // Transform states
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0); // in degrees
  const [flipX, setFlipX] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:5'>('3:4');
  const [showFaceGuide, setShowFaceGuide] = useState<boolean>(true);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Reset transforms when photoUrl or source changes
  useEffect(() => {
    if (!activeImageSrc) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setImageLoaded(true);
      setZoom(1.0);
      setRotation(0);
      setFlipX(false);
      setPan({ x: 0, y: 0 });
    };
    img.src = activeImageSrc;
  }, [activeImageSrc]);

  // Determine viewport aspect ratio in pixels
  const viewportWidth = 270;
  const viewportHeight =
    aspectRatio === '3:4'
      ? Math.round((viewportWidth * 4) / 3) // 360px
      : aspectRatio === '1:1'
      ? viewportWidth // 270px
      : Math.round((viewportWidth * 5) / 4); // 338px

  // Draw viewport canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewportWidth;
    canvas.height = viewportHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill background with light neutral tone
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Translate to center of canvas for rotate, zoom, and pan
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipX) ctx.scale(-1, 1);

    // Calculate base cover scaling
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight) * zoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }, [viewportWidth, viewportHeight, zoom, rotation, flipX, pan, imageLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(0.5, Math.min(3.5, newZoom)));
  };

  // Rotation handlers
  const handleRotateBy = (deg: number) => {
    setRotation((prev) => (prev + deg + 360) % 360);
  };

  // Reset transforms
  const handleReset = () => {
    setZoom(1.0);
    setRotation(0);
    setFlipX(false);
    setPan({ x: 0, y: 0 });
  };

  // Export high-res cropped image
  const handleSave = () => {
    const img = imageObjRef.current;
    if (!img) return;

    // High resolution output: 600 x 800 for 3:4
    const outWidth = 600;
    const outHeight =
      aspectRatio === '3:4' ? 800 : aspectRatio === '1:1' ? 600 : 750;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    // Fill white base
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outWidth, outHeight);

    outCtx.save();
    // Scale factor from preview viewport to outCanvas
    const scaleFactor = outWidth / viewportWidth;

    outCtx.translate(outWidth / 2 + pan.x * scaleFactor, outHeight / 2 + pan.y * scaleFactor);
    outCtx.rotate((rotation * Math.PI) / 180);
    if (flipX) outCtx.scale(-1, 1);

    const baseScale =
      Math.max(viewportWidth / img.naturalWidth, viewportHeight / img.naturalHeight) * zoom * scaleFactor;
    const drawW = img.naturalWidth * baseScale;
    const drawH = img.naturalHeight * baseScale;

    outCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    outCtx.restore();

    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.95);
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  const roleInfo = ROLE_LABELS[photoRole] || { label: 'Photo', badge: 'ID Card' };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none"
      onMouseUp={handleMouseUp}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-xs">
              <CropIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{roleInfo.label}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1e3a8a]">
                  {roleInfo.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag to center the face, zoom in/out, and rotate for a crisp ID card photo
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

        {/* Source switch (if scan is available) */}
        {originalScanUrl && (
          <div className="bg-slate-100/80 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-blue-600" />
              <span>Image Source:</span>
            </span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSourceMode('current')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  sourceMode === 'current'
                    ? 'bg-[#1e3a8a] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Current Photo
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('scan')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  sourceMode === 'scan'
                    ? 'bg-[#1e3a8a] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Original Full Scan Sheet
              </button>
            </div>
          </div>
        )}

        {/* Cropper Viewport & Controls */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col md:flex-row items-center justify-center gap-6 overflow-y-auto">
          {/* Canvas Box */}
          <div className="flex flex-col items-center">
            <div
              className="relative rounded-2xl overflow-hidden shadow-md border-2 border-slate-300 bg-slate-900 cursor-grab active:cursor-grabbing touch-none"
              style={{ width: viewportWidth, height: viewportHeight }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
              />

              {/* Studio Face Alignment Guide Overlay */}
              {showFaceGuide && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Head Oval Guide */}
                  <div className="w-[58%] h-[68%] rounded-[50%] border-2 border-dashed border-white/60 shadow-xs flex flex-col items-center justify-between py-2">
                    {/* Eye line */}
                    <div className="w-full h-px bg-white/40 mt-8" />
                    {/* Chin line */}
                    <div className="w-12 h-px bg-white/50 mb-3" />
                  </div>
                  {/* Crosshairs */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/20" />
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/20" />
                  <span className="absolute bottom-2 text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                    Align Eyes with Upper Guide
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Click &amp; drag anywhere on the photo to reposition
            </p>
          </div>

          {/* Right Control Sliders & Adjustments */}
          <div className="w-full md:w-64 flex flex-col gap-4 text-xs">
            {/* Aspect Ratio Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Card Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['3:4', '1:1', '4:5'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      aspectRatio === ratio
                        ? 'bg-white text-[#1e3a8a] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ratio === '3:4' ? '3:4 (ID)' : ratio === '1:1' ? '1:1 (Square)' : '4:5'}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>Zoom</span>
                </span>
                <span className="font-mono text-slate-500 font-semibold">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.1)}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="flex-1 accent-[#1e3a8a] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.1)}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Fine Tilt Rotation Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fine Tilt</span>
                </span>
                <span className="font-mono text-slate-500 font-semibold">
                  {rotation > 180 ? `${rotation - 360}°` : `${rotation}°`}
                </span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="0.5"
                value={rotation > 180 ? rotation - 360 : rotation}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setRotation((val + 360) % 360);
                }}
                className="w-full accent-[#1e3a8a] cursor-pointer"
              />
            </div>

            {/* Quick Rotate & Mirror Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRotateBy(-90)}
                className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
                title="Rotate 90° Counter-Clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>-90°</span>
              </button>

              <button
                type="button"
                onClick={() => handleRotateBy(90)}
                className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>+90°</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipX(!flipX)}
                className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center gap-1 transition-colors ${
                  flipX
                    ? 'bg-blue-100 text-[#1e3a8a] border border-blue-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Flip Horizontal (Mirror)"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip</span>
              </button>
            </div>

            {/* Face Alignment Guide Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFaceGuide}
                  onChange={(e) => setShowFaceGuide(e.target.checked)}
                  className="rounded text-[#1e3a8a] focus:ring-blue-500"
                />
                <span>Show Face Alignment Guide</span>
              </label>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 py-1 px-1.5 rounded hover:bg-slate-100"
                title="Reset to default"
              >
                <Undo2 className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                title="Remove photo from this card"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Photo</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 active:bg-blue-950 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save &amp; Apply Cropped Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
