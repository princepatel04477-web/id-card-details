/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Palette, Download, Upload, RotateCcw } from 'lucide-react';
import { CardTemplate, CardElement, StudentCardRecord } from '../../types/idcard';
import { CardDesignInspector } from '../idcards/CardDesignInspector';
import { CardCanvasPreview } from '../idcards/CardCanvasPreview';
import { BAL_BHAVAN_DEFAULT_TEMPLATE } from '../../utils/cardTemplates';

interface CardDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CardTemplate;
  onUpdateTemplate: (template: CardTemplate) => void;
  sampleStudent: StudentCardRecord;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const CardDesignModal: React.FC<CardDesignModalProps> = ({
  isOpen,
  onClose,
  template,
  onUpdateTemplate,
  sampleStudent,
  onShowToast,
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Card Template Designer
              </h3>
              <p className="text-xs text-slate-500">
                Adjust field coordinates, replace background graphics, or export template JSON.
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

        {/* Designer Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Card Canvas Visualizer */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-100/70 flex items-center justify-center">
            <div className="w-full max-w-[540px]">
              <CardCanvasPreview
                student={sampleStudent}
                template={template}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={(updated) => {
                  const newElements = template.elements.map((el) =>
                    el.id === updated.id ? updated : el
                  );
                  onUpdateTemplate({ ...template, elements: newElements });
                }}
                onDeleteElement={(id) => {
                  const newElements = template.elements.filter((el) => el.id !== id);
                  onUpdateTemplate({ ...template, elements: newElements });
                }}
                showGuides={true}
                isDesignMode={true}
                showOriginalForm={false}
                onToggleOriginalForm={() => {}}
              />
            </div>
          </div>

          {/* Inspector Panel */}
          <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 bg-white overflow-y-auto">
            <CardDesignInspector
              template={template}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateTemplate={onUpdateTemplate}
              onShowToast={onShowToast}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
