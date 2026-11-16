/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CardTemplate,
  StudentCardRecord,
  CardElement,
  TextEl,
  PhotoEl,
  PhotoRowEl,
} from '../../types/idcard';
import {
  renderCardSide,
  getStudentFieldValue,
  resolveCardTemplateText,
  CARD_PX_WIDTH,
  CARD_PX_HEIGHT,
} from '../../utils/cardRenderer';
import {
  Crop,
  Upload,
  UserCheck,
  Trash2,
  Check,
  X,
  Edit2,
  AlertCircle,
} from 'lucide-react';

interface CardCanvasWithEditorProps {
  student: StudentCardRecord;
  template: CardTemplate;
  onUpdateField: (fieldKey: string, newValue: string) => void;
  onAdjustCrop: (photoKey: string) => void;
  onReplacePhoto: (photoKey: string, file: File) => void;
  onChangePhotoRole: (photoKey: string, newRole: string) => void;
  onRemovePhoto: (photoKey: string) => void;
  highlightedElementId?: string | null;
  flaggedFields?: Set<string>;
  onSelectElement?: (id: string) => void;
}

export const CardCanvasWithEditor: React.FC<CardCanvasWithEditorProps> = ({
  student,
  template,
  onUpdateField,
  onAdjustCrop,
  onReplacePhoto,
  onChangePhotoRole,
  onRemovePhoto,
  highlightedElementId,
  flaggedFields = new Set(),
  onSelectElement,
}) => {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);

  // Active inline popover state
  const [activeTextEdit, setActiveTextEdit] = useState<{
    elementId: string;
    fieldKey: string;
    label: string;
    side: 'front' | 'back';
    value: string;
    rect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const [activePhotoMenu, setActivePhotoMenu] = useState<{
    elementId: string;
    photoKey: string;
    label: string;
    side: 'front' | 'back';
    rect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoToReplace, setPhotoToReplace] = useState<string | null>(null);

  // Render front and back canvases
  const renderCanvases = useCallback(async () => {
    if (frontCanvasRef.current) {
      await renderCardSide(frontCanvasRef.current, 'front', template, student);
    }
    if (backCanvasRef.current) {
      await renderCardSide(backCanvasRef.current, 'back', template, student);
    }
  }, [template, student]);

  useEffect(() => {
    let cancelled = false;
    renderCanvases();
    return () => {
      cancelled = true;
    };
  }, [renderCanvases]);

  // Extract the primary data field key from a placeholder string like "{studentName}"
  const getPrimaryFieldKey = (content: string): string => {
    const match = content.match(/\{([^}]+)\}/);
    if (!match) return 'studentName';
    const rawKey = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {
      studentname: 'studentName',
      name: 'studentName',
      fathername: 'fatherName',
      father: 'fatherName',
      mothername: 'motherName',
      mother: 'motherName',
      dateofbirth: 'dateOfBirth',
      dob: 'dateOfBirth',
      classsection: 'classSection',
      class: 'classSection',
      addressline1: 'addressLine1',
      addressline2: 'addressLine2',
      city: 'city',
      pincode: 'pincode',
      addressfull: 'addressLine1',
      address: 'addressLine1',
      fathermobile: 'fatherMobile',
      mothermobile: 'motherMobile',
      serialnumber: 'serialNumber',
      admno: 'serialNumber',
      bloodgroup: 'bloodGroup',
      bg: 'bloodGroup',
      academicsession: 'academicSession',
    };
    return map[rawKey] || match[1];
  };

  const handleTextClick = (el: TextEl, side: 'front' | 'back') => {
    onSelectElement?.(el.id);
    const fieldKey = getPrimaryFieldKey(el.content);
    const currentValue = getStudentFieldValue(student, fieldKey);
    setActivePhotoMenu(null);
    setActiveTextEdit({
      elementId: el.id,
      fieldKey,
      label: el.label,
      side,
      value: currentValue,
      rect: { x: el.x, y: el.y, w: el.w, h: el.h },
    });
  };

  const handlePhotoClick = (photoKey: string, el: CardElement, side: 'front' | 'back') => {
    setActiveTextEdit(null);
    setActivePhotoMenu({
      elementId: el.id,
      photoKey,
      label: el.label,
      side,
      rect: { x: el.x, y: el.y, w: el.w, h: el.h },
    });
  };

  const handleSaveTextEdit = () => {
    if (activeTextEdit) {
      onUpdateField(activeTextEdit.fieldKey, activeTextEdit.value);
      setActiveTextEdit(null);
    }
  };

  // Keyboard shortcut for inline editor
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTextEdit();
    } else if (e.key === 'Escape') {
      setActiveTextEdit(null);
      setActivePhotoMenu(null);
    }
  };

  const renderOverlaysForSide = (side: 'front' | 'back') => {
    const sideElements = template.elements.filter((el) => el.side === side);

    return (
      <div className="absolute inset-0 pointer-events-auto">
        {sideElements.map((el) => {
          const isHighlighted = highlightedElementId === el.id;
          const leftPct = (el.x / 90) * 100;
          const topPct = (el.y / 58) * 100;
          const widthPct = (el.w / 90) * 100;
          const heightPct = (el.h / 58) * 100;

          if (el.type === 'text') {
            const fieldKey = getPrimaryFieldKey(el.content);
            const isFlagged = flaggedFields.has(fieldKey) || isHighlighted;

            return (
              <div
                key={el.id}
                onClick={() => handleTextClick(el, side)}
                title={`Click to edit ${el.label}`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className={`absolute group cursor-pointer transition-all duration-150 rounded flex items-center justify-center ${
                  isFlagged
                    ? 'ring-2 ring-amber-500 bg-amber-500/15 shadow-xs animate-pulse'
                    : 'hover:ring-1 hover:ring-blue-600 hover:bg-blue-600/10'
                }`}
              >
                {/* Small indicator pill on hover */}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 left-0 bg-slate-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                  {el.label}
                </span>
              </div>
            );
          }

          if (el.type === 'photo') {
            const photoKey = el.field || 'student';
            const isFlagged = flaggedFields.has(photoKey) || isHighlighted;

            return (
              <div
                key={el.id}
                onClick={() => handlePhotoClick(photoKey, el, side)}
                title={`Click to adjust ${el.label}`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className={`absolute group cursor-pointer transition-all duration-150 rounded-xs flex items-center justify-center ${
                  isFlagged
                    ? 'ring-2 ring-amber-500 bg-amber-500/15 shadow-xs'
                    : 'hover:ring-2 hover:ring-blue-600 hover:bg-blue-600/10'
                }`}
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 left-0 bg-slate-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                  {el.label}
                </span>
              </div>
            );
          }

          if (el.type === 'photos') {
            const slots = el.slots || 3;
            const gap = el.gap || 6.5;
            const totalGaps = (slots - 1) * gap;
            const slotWidthMm = (el.w - totalGaps) / slots;
            const photoKeys = el.fields || ['mother', 'father', 'pickup3'];

            return (
              <React.Fragment key={el.id}>
                {photoKeys.slice(0, slots).map((pk, idx) => {
                  const slotLeftMm = el.x + idx * (slotWidthMm + gap);
                  const sLeftPct = (slotLeftMm / 90) * 100;
                  const sTopPct = (el.y / 58) * 100;
                  const sWidthPct = (slotWidthMm / 90) * 100;
                  const sHeightPct = (el.h / 58) * 100;
                  const isFlagged = flaggedFields.has(pk);

                  const roleLabel =
                    pk === 'mother'
                      ? "Mother's Photo"
                      : pk === 'father'
                      ? "Father's Photo"
                      : 'Authorised Pickup';

                  return (
                    <div
                      key={`${el.id}_${pk}_${idx}`}
                      onClick={() => handlePhotoClick(pk, el, side)}
                      title={`Click to adjust ${roleLabel}`}
                      style={{
                        left: `${sLeftPct}%`,
                        top: `${sTopPct}%`,
                        width: `${sWidthPct}%`,
                        height: `${sHeightPct}%`,
                      }}
                      className={`absolute group cursor-pointer transition-all duration-150 rounded-xs ${
                        isFlagged
                          ? 'ring-2 ring-amber-500 bg-amber-500/15'
                          : 'hover:ring-2 hover:ring-blue-600 hover:bg-blue-600/10'
                      }`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 left-0 bg-slate-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                        {roleLabel}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full flex flex-col items-center gap-6">
      {/* Hidden file input for photo replacement */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && photoToReplace) {
            onReplacePhoto(photoToReplace, e.target.files[0]);
            setActivePhotoMenu(null);
            setPhotoToReplace(null);
          }
        }}
      />

      {/* FRONT SIDE CARD */}
      <div className="w-full max-w-[620px] flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 mb-1 px-1">
          <span className="uppercase tracking-wider">Front Side</span>
          <span className="text-[11px] text-slate-400">Click any text or photo to edit</span>
        </div>

        <div className="relative w-full aspect-[90/58] bg-white rounded-xl shadow-md border border-slate-200/90 overflow-hidden select-none">
          <canvas
            ref={frontCanvasRef}
            width={CARD_PX_WIDTH}
            height={CARD_PX_HEIGHT}
            className="w-full h-full object-contain block"
          />

          {renderOverlaysForSide('front')}

          {/* Inline Popover Editor for Front text */}
          {activeTextEdit && activeTextEdit.side === 'front' && (
            <div
              className="absolute z-40 bg-white rounded-xl shadow-xl border border-slate-300 p-3 flex flex-col gap-2 min-w-[260px] animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${Math.min(Math.max((activeTextEdit.rect.x / 90) * 100, 5), 65)}%`,
                top: `${Math.min(Math.max((activeTextEdit.rect.y / 58) * 100 - 15, 5), 70)}%`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Edit {activeTextEdit.label}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTextEdit(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                autoFocus
                type="text"
                value={activeTextEdit.value}
                onChange={(e) =>
                  setActiveTextEdit({ ...activeTextEdit, value: e.target.value })
                }
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1e3a8a] text-slate-900"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTextEdit(null)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 rounded-md font-medium"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="button"
                  onClick={handleSaveTextEdit}
                  className="px-3 py-1 bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}

          {/* Photo Actions Popover for Front */}
          {activePhotoMenu && activePhotoMenu.side === 'front' && (
            <div
              className="absolute z-40 bg-white rounded-xl shadow-xl border border-slate-300 p-2 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${Math.min(Math.max((activePhotoMenu.rect.x / 90) * 100, 10), 65)}%`,
                top: `${Math.min(Math.max((activePhotoMenu.rect.y / 58) * 100, 5), 60)}%`,
              }}
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1">
                <span className="text-xs font-bold text-slate-800">Photo Actions</span>
                <button
                  type="button"
                  onClick={() => setActivePhotoMenu(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAdjustCrop(activePhotoMenu.photoKey);
                  setActivePhotoMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
              >
                <Crop className="w-3.5 h-3.5 text-blue-600" />
                <span>Adjust Crop &amp; Tilt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhotoToReplace(activePhotoMenu.photoKey);
                  photoInputRef.current?.click();
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Replace Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BACK SIDE CARD */}
      <div className="w-full max-w-[620px] flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 mb-1 px-1">
          <span className="uppercase tracking-wider">Back Side (Pick-up Authorization)</span>
          <span className="text-[11px] text-slate-400">Click photo to adjust or re-assign</span>
        </div>

        <div className="relative w-full aspect-[90/58] bg-white rounded-xl shadow-md border border-slate-200/90 overflow-hidden select-none">
          <canvas
            ref={backCanvasRef}
            width={CARD_PX_WIDTH}
            height={CARD_PX_HEIGHT}
            className="w-full h-full object-contain block"
          />

          {renderOverlaysForSide('back')}

          {/* Photo Actions Popover for Back */}
          {activePhotoMenu && activePhotoMenu.side === 'back' && (
            <div
              className="absolute z-40 bg-white rounded-xl shadow-xl border border-slate-300 p-2 flex flex-col gap-1 min-w-[210px] animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${Math.min(Math.max((activePhotoMenu.rect.x / 90) * 100, 10), 65)}%`,
                top: `${Math.min(Math.max((activePhotoMenu.rect.y / 58) * 100 - 10, 5), 55)}%`,
              }}
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1">
                <span className="text-xs font-bold text-slate-800">
                  {activePhotoMenu.label || 'Pick-up Photo'}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePhotoMenu(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAdjustCrop(activePhotoMenu.photoKey);
                  setActivePhotoMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
              >
                <Crop className="w-3.5 h-3.5 text-blue-600" />
                <span>Adjust Crop &amp; Tilt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhotoToReplace(activePhotoMenu.photoKey);
                  photoInputRef.current?.click();
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Replace Photo</span>
              </button>

              <div className="border-t border-slate-100 my-1" />

              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase">
                Change Person
              </div>

              <div className="grid grid-cols-2 gap-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    onChangePhotoRole(activePhotoMenu.photoKey, 'mother');
                    setActivePhotoMenu(null);
                  }}
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    activePhotoMenu.photoKey === 'mother'
                      ? 'bg-blue-100 text-[#1e3a8a] font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Mother
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangePhotoRole(activePhotoMenu.photoKey, 'father');
                    setActivePhotoMenu(null);
                  }}
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    activePhotoMenu.photoKey === 'father'
                      ? 'bg-blue-100 text-[#1e3a8a] font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Father
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangePhotoRole(activePhotoMenu.photoKey, 'pickup3');
                    setActivePhotoMenu(null);
                  }}
                  className={`text-xs px-2 py-1 rounded font-medium col-span-2 ${
                    activePhotoMenu.photoKey === 'pickup3'
                      ? 'bg-blue-100 text-[#1e3a8a] font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Authorised Pickup 3
                </button>
              </div>

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={() => {
                  onRemovePhoto(activePhotoMenu.photoKey);
                  setActivePhotoMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
