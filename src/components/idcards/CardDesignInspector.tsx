/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  CardTemplate,
  CardElement,
  TextEl,
  PhotoEl,
  PhotoRowEl,
  TextFormat,
  TextAlignment,
} from '../../types/idcard';
import {
  saveSchoolTemplate,
  BAL_BHAVAN_DEFAULT_TEMPLATE,
} from '../../utils/cardTemplates';
import {
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Save,
  Layers,
} from 'lucide-react';
import saveAs from 'file-saver';

interface CardDesignInspectorProps {
  template: CardTemplate;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateTemplate: (template: CardTemplate) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const AVAILABLE_FIELDS = [
  'studentName',
  'fatherName',
  'motherName',
  'classSection',
  'dateOfBirth',
  'bloodGroup',
  'serialNumber',
  'academicSession',
  'fatherMobile',
  'motherMobile',
  'addressFull',
  'addressLine1',
  'city',
  'pincode',
];

export const CardDesignInspector: React.FC<CardDesignInspectorProps> = ({
  template,
  selectedElementId,
  onSelectElement,
  onUpdateTemplate,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = template.elements.find((el) => el.id === selectedElementId) || null;

  // Handle template property update
  const updateElement = (updated: CardElement) => {
    const updatedElements = template.elements.map((el) =>
      el.id === updated.id ? updated : el
    );
    onUpdateTemplate({ ...template, elements: updatedElements });
  };

  // Add new element
  const handleAddText = () => {
    const id = `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newText: TextEl = {
      id,
      label: 'New Text',
      side: 'front',
      type: 'text',
      x: 20,
      y: 20,
      w: 40,
      h: 4,
      content: '{studentName}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'none',
    };
    onUpdateTemplate({ ...template, elements: [...template.elements, newText] });
    onSelectElement(id);
    onShowToast('Added new text element', 'info');
  };

  const handleAddPhoto = () => {
    const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newPhoto: PhotoEl = {
      id,
      label: 'New Photo',
      side: 'front',
      type: 'photo',
      x: 60,
      y: 20,
      w: 18,
      h: 24,
      field: 'student',
      fit: 'cover',
      border: 0.22,
      borderColor: '#2a2a2a',
    };
    onUpdateTemplate({ ...template, elements: [...template.elements, newPhoto] });
    onSelectElement(id);
    onShowToast('Added new photo element', 'info');
  };

  const handleAddPhotoRow = () => {
    const id = `photos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRow: PhotoRowEl = {
      id,
      label: 'New Photo Row',
      side: 'back',
      type: 'photos',
      x: 10,
      y: 20,
      w: 70,
      h: 25,
      fields: ['mother', 'father', 'pickup3'],
      slots: 3,
      gap: 6.5,
      layout: 'fixed',
      fit: 'cover',
      border: 0.22,
      borderColor: '#222222',
    };
    onUpdateTemplate({ ...template, elements: [...template.elements, newRow] });
    onSelectElement(id);
    onShowToast('Added new photo row element', 'info');
  };

  const handleDuplicate = (elem: CardElement) => {
    const id = `${elem.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cloned = {
      ...structuredClone(elem),
      id,
      label: `${elem.label} (Copy)`,
      x: elem.x + 2,
      y: elem.y + 2,
    };
    onUpdateTemplate({ ...template, elements: [...template.elements, cloned] });
    onSelectElement(id);
    onShowToast(`Duplicated ${elem.label}`, 'info');
  };

  const handleDelete = (id: string) => {
    const updated = template.elements.filter((el) => el.id !== id);
    onUpdateTemplate({ ...template, elements: updated });
    onSelectElement(null);
    onShowToast('Element deleted', 'info');
  };

  // Background replacement
  const handleBackgroundUpload = (side: 'front' | 'back', file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = {
        ...template,
        bg: {
          ...template.bg,
          [side]: dataUrl,
        },
      };
      onUpdateTemplate(updated);
      onShowToast(`Updated ${side} background image`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Save to IndexedDB
  const handleSaveAsSchool = async () => {
    try {
      await saveSchoolTemplate(template);
      onShowToast(`Saved design "${template.name}" in IndexedDB`, 'success');
    } catch {
      onShowToast('Failed to save template', 'error');
    }
  };

  // Reset to Bal Bhavan
  const handleResetToDefault = () => {
    onUpdateTemplate(structuredClone(BAL_BHAVAN_DEFAULT_TEMPLATE));
    onSelectElement(null);
    onShowToast('Reset design to Bal Bhavan default template', 'info');
  };

  // Download template JSON
  const handleExportTemplateJson = () => {
    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = `${template.name.replace(/[^A-Za-z0-9]/g, '_')}_Template.json`;
    saveAs(blob, fileName);
    onShowToast(`Exported template ${fileName}`, 'success');
  };

  // Import template JSON
  const handleImportTemplateJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as CardTemplate;
        if (!parsed.elements || !parsed.bg) {
          throw new Error('Invalid template schema');
        }
        onUpdateTemplate(parsed);
        onSelectElement(null);
        onShowToast(`Imported template "${parsed.name}"`, 'success');
      } catch {
        onShowToast('Invalid template JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-slate-100 overflow-y-auto">
      {/* 1. Template Management & Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>School Template</span>
          </h4>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Bal Bhavan</span>
          </button>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1">
            School / Template Title
          </label>
          <input
            type="text"
            value={template.name}
            onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
          />
        </div>

        {/* Template Storage & Transfer Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleSaveAsSchool}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-1.5 px-2.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Storage</span>
          </button>

          <button
            type="button"
            onClick={handleExportTemplateJson}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-1.5 px-2.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>

          <label className="col-span-2 flex items-center justify-center gap-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs py-1.5 px-2.5 rounded-lg border border-slate-700/80 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Template File (.json)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportTemplateJson(file);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 2. Card Backgrounds Upload */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Blank Background Assets (300 DPI)
        </h4>
        <p className="text-[11px] text-slate-500 leading-tight">
          Export front and back PNGs from Photoshop at 1063 &times; 685 px with text &amp; photos hidden.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-slate-700 bg-slate-950 hover:bg-slate-800/50 cursor-pointer text-center transition-colors">
            <Upload className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-[11px] font-semibold text-slate-200">Front Blank</span>
            <span className="text-[9px] text-slate-500">Upload PNG/JPG</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleBackgroundUpload('front', f);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>

          <label className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-slate-700 bg-slate-950 hover:bg-slate-800/50 cursor-pointer text-center transition-colors">
            <Upload className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-[11px] font-semibold text-slate-200">Back Blank</span>
            <span className="text-[9px] text-slate-500">Upload PNG/JPG</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleBackgroundUpload('back', f);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3. Add Element Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAddText}
          className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-700 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Text</span>
        </button>
        <button
          type="button"
          onClick={handleAddPhoto}
          className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-700 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Photo</span>
        </button>
        <button
          type="button"
          onClick={handleAddPhotoRow}
          className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-700 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Photo Row</span>
        </button>
      </div>

      {/* 4. Elements List on Card */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Card Elements ({template.elements.length})
        </span>
        <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-900 border border-slate-800 rounded-xl p-1.5">
          {template.elements.map((el) => {
            const isSelected = el.id === selectedElementId;
            return (
              <button
                key={el.id}
                type="button"
                onClick={() => onSelectElement(el.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase ${
                      isSelected
                        ? 'bg-indigo-800 text-indigo-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {el.type}
                  </span>
                  <span className="truncate">{el.label}</span>
                </div>
                <span className="text-[10px] uppercase font-mono opacity-70">
                  {el.side}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Selected Element Inspector Form */}
      {selectedElement && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Selected:</span>
              <span className="text-indigo-400">{selectedElement.label}</span>
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDuplicate(selectedElement)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                title="Duplicate element"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selectedElement.id)}
                className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10"
                title="Delete element"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Label & Side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Label
              </label>
              <input
                type="text"
                value={selectedElement.label}
                onChange={(e) => updateElement({ ...selectedElement, label: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Card Side
              </label>
              <select
                value={selectedElement.side}
                onChange={(e) =>
                  updateElement({
                    ...selectedElement,
                    side: e.target.value as 'front' | 'back',
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
              </select>
            </div>
          </div>

          {/* Coordinates in mm: x, y, w, h */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Position &amp; Size (mm)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="text-[9px] text-slate-500 font-mono">X (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  value={selectedElement.x}
                  onChange={(e) =>
                    updateElement({
                      ...selectedElement,
                      x: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-white"
                />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-mono">Y (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  value={selectedElement.y}
                  onChange={(e) =>
                    updateElement({
                      ...selectedElement,
                      y: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-white"
                />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-mono">W (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  value={selectedElement.w}
                  onChange={(e) =>
                    updateElement({
                      ...selectedElement,
                      w: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-white"
                />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-mono">H (mm)</span>
                <input
                  type="number"
                  step="0.1"
                  value={selectedElement.h}
                  onChange={(e) =>
                    updateElement({
                      ...selectedElement,
                      h: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          {/* Type-Specific Properties: TEXT */}
          {selectedElement.type === 'text' && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              {/* Content & Field insertion */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Content template
                  </label>
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const added = `{${e.target.value}}`;
                      updateElement({
                        ...selectedElement,
                        content: `${selectedElement.content}${added}`,
                      });
                      e.target.value = '';
                    }}
                    className="text-[10px] bg-slate-800 border border-slate-700 text-indigo-300 rounded px-1.5 py-0.5"
                  >
                    <option value="">+ Insert field...</option>
                    {AVAILABLE_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={selectedElement.content}
                  onChange={(e) =>
                    updateElement({ ...selectedElement, content: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>

              {/* Font, Weight, Size */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Font
                  </label>
                  <select
                    value={selectedElement.font}
                    onChange={(e) =>
                      updateElement({ ...selectedElement, font: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                  >
                    <option value="Open Sans">Open Sans</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Inter">Inter</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Weight
                  </label>
                  <select
                    value={selectedElement.weight}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        weight: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                  >
                    <option value="400">400 Regular</option>
                    <option value="500">500 Medium</option>
                    <option value="600">600 Semibold</option>
                    <option value="700">700 Bold</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Size (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedElement.size}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        size: parseFloat(e.target.value) || 2.0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Color, Align, Max lines, Format */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={selectedElement.color}
                    onChange={(e) =>
                      updateElement({ ...selectedElement, color: e.target.value })
                    }
                    className="w-full h-7 bg-slate-950 border border-slate-700 rounded p-0.5 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Align
                  </label>
                  <select
                    value={selectedElement.align}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        align: e.target.value as TextAlignment,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Lines
                  </label>
                  <select
                    value={selectedElement.lines}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        lines: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Format
                  </label>
                  <select
                    value={selectedElement.fmt}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        fmt: e.target.value as TextFormat,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                  >
                    <option value="none">None</option>
                    <option value="upper">UPPER</option>
                    <option value="date">Date</option>
                    <option value="roman">Roman</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Type-Specific Properties: SINGLE PHOTO */}
          {selectedElement.type === 'photo' && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Photo Field
                  </label>
                  <select
                    value={selectedElement.field}
                    onChange={(e) =>
                      updateElement({ ...selectedElement, field: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="student">Student Photo</option>
                    <option value="father">Father Photo</option>
                    <option value="mother">Mother Photo</option>
                    <option value="pickup3">Authorised Pickup 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Fit
                  </label>
                  <select
                    value={selectedElement.fit}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        fit: e.target.value as 'cover' | 'contain',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="cover">Cover (Fill &amp; Crop)</option>
                    <option value="contain">Contain (Fit Whole)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Border (mm)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={selectedElement.border}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        border: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Border Color
                  </label>
                  <input
                    type="color"
                    value={selectedElement.borderColor}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        borderColor: e.target.value,
                      })
                    }
                    className="w-full h-7 bg-slate-950 border border-slate-700 rounded p-0.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Type-Specific Properties: PHOTO ROW */}
          {selectedElement.type === 'photos' && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Slots
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={selectedElement.slots}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        slots: parseInt(e.target.value, 10) || 3,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Gap (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElement.gap}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        gap: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Layout
                  </label>
                  <select
                    value={selectedElement.layout}
                    onChange={(e) =>
                      updateElement({
                        ...selectedElement,
                        layout: e.target.value as 'fixed' | 'center',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                  >
                    <option value="fixed">Fixed Left</option>
                    <option value="center">Centered</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
