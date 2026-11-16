/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CardTemplate,
  StudentCardRecord,
  CardElement,
} from '../../types/idcard';
import {
  drawCardFace,
  CARD_WIDTH_MM,
  CARD_HEIGHT_MM,
  CARD_PX_WIDTH,
  CARD_PX_HEIGHT,
} from '../../utils/cardRenderer';

interface CardCanvasPreviewProps {
  student: StudentCardRecord;
  template: CardTemplate;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: CardElement) => void;
  onDeleteElement: (id: string) => void;
  showGuides: boolean;
  isDesignMode: boolean;
  originalScanUrl?: string;
  showOriginalForm: boolean;
  onToggleOriginalForm: () => void;
}

export const CardCanvasPreview: React.FC<CardCanvasPreviewProps> = ({
  student,
  template,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  showGuides,
  isDesignMode,
  originalScanUrl,
  showOriginalForm,
  onToggleOriginalForm,
}) => {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container for responsive preview
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute display size in CSS pixels
  // Each card is 90 x 58 mm. Two cards side by side with gap ~ 24px
  const isTwoColumn = containerWidth >= 680 && !showOriginalForm;
  const availableCardWidth = isTwoColumn
    ? Math.min(420, (containerWidth - 48) / 2)
    : Math.min(440, containerWidth - 32);

  const displayWidth = Math.max(240, availableCardWidth);
  const displayHeight = (displayWidth * CARD_HEIGHT_MM) / CARD_WIDTH_MM;
  const scale = displayWidth / CARD_WIDTH_MM; // CSS px per mm

  // Render front & back faces on canvas
  const renderCanvases = useCallback(async () => {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Front Canvas
    if (frontCanvasRef.current) {
      const c = frontCanvasRef.current;
      c.width = Math.round(CARD_PX_WIDTH);
      c.height = Math.round(CARD_PX_HEIGHT);
      c.style.width = `${displayWidth}px`;
      c.style.height = `${displayHeight}px`;

      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Render at 300 DPI scale: 1063 / 90 ~ 11.8111 px/mm
        const fullScale = CARD_PX_WIDTH / template.w;
        await drawCardFace(ctx, 'front', student, template, fullScale, {
          showGuides: isDesignMode && showGuides,
          selectedElementId,
        });
      }
    }

    // Back Canvas
    if (backCanvasRef.current) {
      const c = backCanvasRef.current;
      c.width = Math.round(CARD_PX_WIDTH);
      c.height = Math.round(CARD_PX_HEIGHT);
      c.style.width = `${displayWidth}px`;
      c.style.height = `${displayHeight}px`;

      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const fullScale = CARD_PX_WIDTH / template.w;
        await drawCardFace(ctx, 'back', student, template, fullScale, {
          showGuides: isDesignMode && showGuides,
          selectedElementId,
        });
      }
    }
  }, [student, template, displayWidth, displayHeight, isDesignMode, showGuides, selectedElementId]);

  useEffect(() => {
    renderCanvases();
  }, [renderCanvases]);

  // Dragging and resizing state
  const [dragState, setDragState] = useState<{
    elementId: string;
    isResize: boolean;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
    originalW: number;
    originalH: number;
  } | null>(null);

  const handlePointerDown = (
    e: React.PointerEvent,
    elem: CardElement,
    isResize: boolean
  ) => {
    if (!isDesignMode) return;
    e.preventDefault();
    e.stopPropagation();

    onSelectElement(elem.id);
    setDragState({
      elementId: elem.id,
      isResize,
      startX: e.clientX,
      startY: e.clientY,
      originalX: elem.x,
      originalY: elem.y,
      originalW: elem.w,
      originalH: elem.h,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const deltaX = (e.clientX - dragState.startX) / scale;
    const deltaY = (e.clientY - dragState.startY) / scale;

    const elem = template.elements.find((el) => el.id === dragState.elementId);
    if (!elem) return;

    if (dragState.isResize) {
      const newW = Math.max(4, Math.round((dragState.originalW + deltaX) * 10) / 10);
      const newH = Math.max(2, Math.round((dragState.originalH + deltaY) * 10) / 10);
      onUpdateElement({ ...elem, w: newW, h: newH });
    } else {
      const newX = Math.round((dragState.originalX + deltaX) * 10) / 10;
      const newY = Math.round((dragState.originalY + deltaY) * 10) / 10;
      onUpdateElement({ ...elem, x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  // Keyboard nudge and delete listeners
  useEffect(() => {
    if (!isDesignMode || !selectedElementId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      const elem = template.elements.find((el) => el.id === selectedElementId);
      if (!elem) return;

      const step = e.shiftKey ? 1.0 : 0.1;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateElement({ ...elem, x: Math.round((elem.x - step) * 100) / 100 });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateElement({ ...elem, x: Math.round((elem.x + step) * 100) / 100 });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateElement({ ...elem, y: Math.round((elem.y - step) * 100) / 100 });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateElement({ ...elem, y: Math.round((elem.y + step) * 100) / 100 });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(elem.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesignMode, selectedElementId, template, onUpdateElement, onDeleteElement]);

  const renderSideOverlay = (side: 'front' | 'back') => {
    if (!isDesignMode || !showGuides) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {template.elements
          .filter((el) => el.side === side)
          .map((el) => {
            const isSelected = selectedElementId === el.id;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, el, false)}
                style={{
                  left: `${el.x * scale}px`,
                  top: `${el.y * scale}px`,
                  width: `${el.w * scale}px`,
                  height: `${el.h * scale}px`,
                }}
                className={`absolute pointer-events-auto cursor-move transition-colors ${
                  isSelected
                    ? 'border-2 border-indigo-400 bg-indigo-500/20 shadow-sm z-30'
                    : 'border border-dashed border-cyan-500/60 hover:bg-cyan-500/10 z-20'
                }`}
                title={el.label}
              >
                {/* Element Label Badge */}
                {isSelected && (
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-indigo-600 text-white font-mono text-[9px] font-bold rounded shadow-sm whitespace-nowrap">
                    {el.label}
                  </div>
                )}

                {/* Resize Handle at Bottom-Right */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => handlePointerDown(e, el, true)}
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow"
                  />
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto select-none"
    >
      {/* Top Banner Toolbar: Scan toggle & guidance */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">
            Card Size: 90 &times; 58 mm &bull; 300 DPI
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
            Scale: {Math.round(scale * 10) / 10} px/mm
          </span>
        </div>

        {originalScanUrl && (
          <button
            type="button"
            onClick={onToggleOriginalForm}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
              showOriginalForm
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{showOriginalForm ? 'Hide Original Form' : 'Show Original Form'}</span>
          </button>
        )}
      </div>

      {/* Cards Display Container */}
      <div
        className={`w-full flex ${
          showOriginalForm ? 'flex-col lg:flex-row' : 'flex-wrap'
        } items-center justify-center gap-6`}
      >
        {/* Optional Side-by-side Original Scan */}
        {showOriginalForm && originalScanUrl && (
          <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md max-w-md w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Original Handwritten Form
            </span>
            <div className="max-h-[380px] overflow-auto rounded border border-slate-700 bg-slate-950 p-1">
              <img
                src={originalScanUrl}
                alt="Original Performa Form"
                className="max-h-[360px] object-contain block mx-auto"
              />
            </div>
          </div>
        )}

        {/* Front Card Proof with Crop Marks */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Front Side
          </span>
          <div
            className="relative shadow-2xl rounded-sm group bg-white"
            style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
          >
            {/* Corner Crop Marks (Standard Print Shop Marks) */}
            <div className="absolute -top-2.5 -left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-400 pointer-events-none" />
            <div className="absolute -top-2.5 -right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-400 pointer-events-none" />
            <div className="absolute -bottom-2.5 -left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-slate-400 pointer-events-none" />
            <div className="absolute -bottom-2.5 -right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-slate-400 pointer-events-none" />

            <canvas
              ref={frontCanvasRef}
              onClick={() => isDesignMode && onSelectElement(null)}
              className="block cursor-default"
            />
            {renderSideOverlay('front')}
          </div>
        </div>

        {/* Back Card Proof with Crop Marks */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Back Side
          </span>
          <div
            className="relative shadow-2xl rounded-sm group bg-white"
            style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
          >
            {/* Corner Crop Marks */}
            <div className="absolute -top-2.5 -left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-400 pointer-events-none" />
            <div className="absolute -top-2.5 -right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-400 pointer-events-none" />
            <div className="absolute -bottom-2.5 -left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-slate-400 pointer-events-none" />
            <div className="absolute -bottom-2.5 -right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-slate-400 pointer-events-none" />

            <canvas
              ref={backCanvasRef}
              onClick={() => isDesignMode && onSelectElement(null)}
              className="block cursor-default"
            />
            {renderSideOverlay('back')}
          </div>
        </div>
      </div>
    </div>
  );
};
