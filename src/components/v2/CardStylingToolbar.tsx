/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Type,
  Palette,
  Sliders,
  RotateCcw,
  Maximize2,
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  X,
  Plus,
  Minus,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { CardTemplate, CardElement, TextEl, PhotoEl, TextAlignment, TextFormat } from '../../types/idcard';
import { BUILTIN_SCHOOLS } from '../../utils/cardTemplates';

interface CardStylingToolbarProps {
  template: CardTemplate;
  onUpdateTemplate: (newTemplate: CardTemplate) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const FONT_FAMILIES = [
  'Open Sans',
  'Roboto',
  'Inter',
  'Montserrat',
  'Poppins',
  'Merriweather',
  'Arial',
];

const PRESET_COLORS = [
  '#1e3a8a', // Deep Navy
  '#065f46', // Emerald Green
  '#b91c1c', // Ruby Red
  '#831843', // Maroon
  '#0f766e', // Teal
  '#1e293b', // Slate Charcoal
  '#0f172a', // Jet Black
  '#f59e0b', // Amber Gold
  '#ffffff', // White
];

export const CardStylingToolbar: React.FC<CardStylingToolbarProps> = ({
  template,
  onUpdateTemplate,
  selectedElementId,
  onSelectElement,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'fonts' | 'elements' | 'theme'>('fonts');
  const [activeElementId, setActiveElementId] = useState<string>(
    selectedElementId || template.elements.find((e) => e.type === 'text')?.id || 'name'
  );

  // Sync with selectedElementId prop if provided
  React.useEffect(() => {
    if (selectedElementId) {
      setActiveElementId(selectedElementId);
      setActiveTab('elements');
    }
  }, [selectedElementId]);

  // Current active element
  const currentElement =
    template.elements.find((el) => el.id === activeElementId) || null;

  // Update a single element in the template
  const updateCurrentElement = (partial: Partial<CardElement>) => {
    if (!currentElement) return;
    const updatedElements = template.elements.map((el) =>
      el.id === currentElement.id ? ({ ...el, ...partial } as CardElement) : el
    );
    onUpdateTemplate({ ...template, elements: updatedElements });
  };

  // Global font scale adjustment
  const handleFontScaleChange = (scale: number) => {
    const clamped = Math.max(0.7, Math.min(1.5, Math.round(scale * 100) / 100));
    onUpdateTemplate({ ...template, fontScale: clamped });
    onShowToast(`Font scale set to ${Math.round(clamped * 100)}%`, 'info');
  };

  // Global font family adjustment
  const handleGlobalFontChange = (font: string) => {
    const updatedElements = template.elements.map((el) =>
      el.type === 'text' ? { ...el, font } : el
    );
    onUpdateTemplate({ ...template, elements: updatedElements, fontFamily: font });
    onShowToast(`Applied font ${font} to all text`, 'success');
  };

  const [showAddFieldMenu, setShowAddFieldMenu] = useState<boolean>(false);

  // Delete current active element
  const handleDeleteCurrentElement = () => {
    if (!currentElement) return;
    const remaining = template.elements.filter((el) => el.id !== currentElement.id);
    onUpdateTemplate({ ...template, elements: remaining });
    const nextActive = remaining.length > 0 ? remaining[0].id : '';
    setActiveElementId(nextActive);
    onSelectElement?.(nextActive || null);
    onShowToast(`Deleted "${currentElement.label}" from card`, 'info');
  };

  // Add a standard or custom field
  const handleAddPresetField = (type: 'blood' | 'transport' | 'emergency' | 'validity' | 'custom') => {
    let newElement: CardElement;
    const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const yPos = 46;

    if (type === 'blood') {
      newElement = {
        id,
        type: 'text',
        side: 'back',
        label: 'Blood Group',
        content: 'Blood Group: {BloodGroup}',
        x: 45,
        y: yPos,
        w: 80,
        h: 5,
        align: 'center',
        size: 2.3,
        weight: 600,
        color: template.textColor || '#1e293b',
        font: template.fontFamily || 'Open Sans',
        lines: 1,
        fmt: 'none',
      };
    } else if (type === 'transport') {
      newElement = {
        id,
        type: 'text',
        side: 'back',
        label: 'Mode of Transport',
        content: 'Transport: {Transport}',
        x: 45,
        y: yPos,
        w: 80,
        h: 5,
        align: 'center',
        size: 2.2,
        weight: 600,
        color: template.textColor || '#1e293b',
        font: template.fontFamily || 'Open Sans',
        lines: 1,
        fmt: 'none',
      };
    } else if (type === 'emergency') {
      newElement = {
        id,
        type: 'text',
        side: 'back',
        label: 'Emergency Contact',
        content: 'Emerg: {FatherPhone}',
        x: 45,
        y: yPos,
        w: 80,
        h: 5,
        align: 'center',
        size: 2.2,
        weight: 600,
        color: '#b91c1c',
        font: template.fontFamily || 'Open Sans',
        lines: 1,
        fmt: 'none',
      };
    } else if (type === 'validity') {
      newElement = {
        id,
        type: 'text',
        side: 'front',
        label: 'Valid Till',
        content: 'Valid Till: March 2027',
        x: 45,
        y: 50,
        w: 80,
        h: 5,
        align: 'center',
        size: 2.0,
        weight: 600,
        color: '#065f46',
        font: template.fontFamily || 'Open Sans',
        lines: 1,
        fmt: 'none',
      };
    } else {
      newElement = {
        id,
        type: 'text',
        side: 'back',
        label: 'Custom Field',
        content: 'Note: School Property',
        x: 45,
        y: yPos,
        w: 80,
        h: 5,
        align: 'center',
        size: 2.0,
        weight: 500,
        color: '#475569',
        font: template.fontFamily || 'Open Sans',
        lines: 1,
        fmt: 'none',
      };
    }

    const updatedElements = [...template.elements, newElement];
    onUpdateTemplate({ ...template, elements: updatedElements });
    setActiveElementId(id);
    onSelectElement?.(id);
    setShowAddFieldMenu(false);
    onShowToast(`Added "${newElement.label}" to card`, 'success');
  };

  // Reset elements to school default
  const handleResetElements = () => {
    const builtin = BUILTIN_SCHOOLS.find((b) => b.id === template.id);
    if (builtin) {
      onUpdateTemplate({
        ...template,
        elements: structuredClone(builtin.elements),
        fontScale: builtin.fontScale || 1.0,
      });
      onShowToast(`Reset card layout to "${builtin.name}" default`, 'info');
    } else {
      onShowToast('Current design is custom; cannot reset to preset', 'warning');
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('fonts')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'fonts'
                ? 'bg-white text-[#1e3a8a] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Font Size &amp; Typography</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('elements')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'elements'
                ? 'bg-white text-[#1e3a8a] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Field Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'theme'
                ? 'bg-white text-[#1e3a8a] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Colors &amp; Header</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Live Real-Time Card Updates
        </span>
      </div>

      {/* Tab 1: Global Font Scale & Typography */}
      {activeTab === 'fonts' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Global Font Scale Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Overall Font Scale (All Fields)</span>
              </label>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                {Math.round((template.fontScale || 1.0) * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFontScaleChange((template.fontScale || 1.0) - 0.05)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                title="Decrease font scale"
              >
                <Minus className="w-3 h-3" />
              </button>

              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={template.fontScale || 1.0}
                onChange={(e) => handleFontScaleChange(parseFloat(e.target.value))}
                className="flex-1 accent-[#1e3a8a] cursor-pointer"
              />

              <button
                type="button"
                onClick={() => handleFontScaleChange((template.fontScale || 1.0) + 0.05)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                title="Increase font scale"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Quick scale presets */}
            <div className="flex items-center gap-1.5 pt-1">
              {[0.85, 0.95, 1.0, 1.1, 1.2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleFontScaleChange(s)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                    Math.abs((template.fontScale || 1.0) - s) < 0.02
                      ? 'bg-[#1e3a8a] text-white border-blue-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {Math.round(s * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Global Font Family & Text Color */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Font Family
              </label>
              <select
                value={template.fontFamily || 'Open Sans'}
                onChange={(e) => handleGlobalFontChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700 focus:outline-hidden"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Quick Text Color Preset
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.slice(0, 7).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      const updatedElements = template.elements.map((el) =>
                        el.type === 'text' && el.id !== 'name'
                          ? { ...el, color }
                          : el
                      );
                      onUpdateTemplate({ ...template, elements: updatedElements });
                      onShowToast('Updated text colors', 'info');
                    }}
                    style={{ backgroundColor: color }}
                    className="w-6 h-6 rounded-lg border border-slate-300 hover:scale-110 transition-transform shadow-2xs"
                    title={`Apply ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Field Inspector (Select and customize individual fields) */}
      {activeTab === 'elements' && (
        <div className="p-4 space-y-4">
          {/* Element Selector Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="font-bold text-slate-700 whitespace-nowrap">
                Select Field:
              </label>
              <select
                value={activeElementId}
                onChange={(e) => {
                  setActiveElementId(e.target.value);
                  onSelectElement?.(e.target.value);
                }}
                className="flex-1 sm:w-64 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 shadow-2xs"
              >
                {template.elements.map((el) => (
                  <option key={el.id} value={el.id}>
                    [{el.side.toUpperCase()}] {el.label} ({el.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentElement && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentElement}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                  title={`Delete "${currentElement.label}" from card`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Field</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddFieldMenu(!showAddFieldMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Add Field</span>
                </button>
                {showAddFieldMenu && (
                  <div className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30">
                    <button
                      type="button"
                      onClick={() => handleAddPresetField('blood')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between"
                    >
                      <span>Blood Group</span>
                      <span className="text-[10px] text-slate-400">Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetField('transport')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between"
                    >
                      <span>Mode of Transport</span>
                      <span className="text-[10px] text-slate-400">Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetField('emergency')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between"
                    >
                      <span>Emergency Contact</span>
                      <span className="text-[10px] text-slate-400">Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetField('validity')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between"
                    >
                      <span>Valid Till Date</span>
                      <span className="text-[10px] text-slate-400">Front</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetField('custom')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between border-t border-slate-100"
                    >
                      <span>Custom Text Field</span>
                      <span className="text-[10px] text-slate-400">Back</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetElements}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                title="Reset elements back to default preset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              {currentElement && (
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 ml-auto hidden sm:inline">
                  Side: <strong className="text-slate-800 uppercase">{currentElement.side}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Text Element Detailed Controls */}
          {currentElement && currentElement.type === 'text' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Font Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Font Size (mm)</label>
                  <span className="font-mono font-bold text-slate-800">
                    {currentElement.size.toFixed(1)}mm
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentElement({
                        size: Math.max(1.2, currentElement.size - 0.2),
                      })
                    }
                    className="p-1 rounded border border-slate-200 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3 text-slate-600" />
                  </button>
                  <input
                    type="range"
                    min="1.2"
                    max="6.0"
                    step="0.1"
                    value={currentElement.size}
                    onChange={(e) =>
                      updateCurrentElement({ size: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-[#1e3a8a] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentElement({
                        size: Math.min(6.5, currentElement.size + 0.2),
                      })
                    }
                    className="p-1 rounded border border-slate-200 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Font Weight */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Font Weight</label>
                <select
                  value={currentElement.weight}
                  onChange={(e) =>
                    updateCurrentElement({ weight: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  <option value={400}>400 - Regular</option>
                  <option value={500}>500 - Medium</option>
                  <option value={600}>600 - Semi-Bold</option>
                  <option value={700}>700 - Bold</option>
                  <option value={800}>800 - Extra Bold</option>
                </select>
              </div>

              {/* Font Color */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentElement.color.startsWith('#') ? currentElement.color : '#000000'}
                    onChange={(e) => updateCurrentElement({ color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={currentElement.color}
                    onChange={(e) => updateCurrentElement({ color: e.target.value })}
                    className="flex-1 px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Alignment</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                  {(['left', 'center', 'right'] as TextAlignment[]).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateCurrentElement({ align })}
                      className={`py-1 rounded font-bold capitalize ${
                        currentElement.align === align
                          ? 'bg-white text-[#1e3a8a] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Photo Element Border Controls */}
          {currentElement && (currentElement.type === 'photo' || currentElement.type === 'photos') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Photo Border Width: {currentElement.border}mm
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={currentElement.border}
                  onChange={(e) =>
                    updateCurrentElement({ border: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Border Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentElement.borderColor || '#000000'}
                    onChange={(e) =>
                      updateCurrentElement({ borderColor: e.target.value })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                  />
                  <span className="font-mono text-xs">{currentElement.borderColor}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Colors & School Header */}
      {activeTab === 'theme' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* School Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                School Name on ID Card
              </label>
              <input
                type="text"
                value={template.schoolName || template.name}
                onChange={(e) =>
                  onUpdateTemplate({
                    ...template,
                    schoolName: e.target.value,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. ST. XAVIER SENIOR SECONDARY SCHOOL"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
              />
            </div>

            {/* School Subtitle */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Card Subtitle / Affiliation
              </label>
              <input
                type="text"
                value={template.schoolSubtitle || ''}
                onChange={(e) =>
                  onUpdateTemplate({ ...template, schoolSubtitle: e.target.value })
                }
                placeholder="e.g. Affiliated to CBSE • Session 2026-27"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Primary Header Color */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Primary Header &amp; Footer Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={template.primaryColor || '#1e3a8a'}
                  onChange={(e) =>
                    onUpdateTemplate({ ...template, primaryColor: e.target.value })
                  }
                  className="w-9 h-9 rounded-xl cursor-pointer border border-slate-300 p-0.5"
                />
                <input
                  type="text"
                  value={template.primaryColor || '#1e3a8a'}
                  onChange={(e) =>
                    onUpdateTemplate({ ...template, primaryColor: e.target.value })
                  }
                  className="flex-1 px-3 py-2 font-mono bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Accent Stripe &amp; Crest Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={template.accentColor || '#f59e0b'}
                  onChange={(e) =>
                    onUpdateTemplate({ ...template, accentColor: e.target.value })
                  }
                  className="w-9 h-9 rounded-xl cursor-pointer border border-slate-300 p-0.5"
                />
                <input
                  type="text"
                  value={template.accentColor || '#f59e0b'}
                  onChange={(e) =>
                    onUpdateTemplate({ ...template, accentColor: e.target.value })
                  }
                  className="flex-1 px-3 py-2 font-mono bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
