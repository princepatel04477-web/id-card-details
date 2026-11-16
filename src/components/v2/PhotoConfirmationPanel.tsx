/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, ShieldCheck, User, Users, Crop } from 'lucide-react';
import { StudentCardRecord } from '../../types/idcard';

interface PhotoConfirmationPanelProps {
  student: StudentCardRecord;
  onConfirmRole: (currentKey: string, assignedRole: 'mother' | 'father' | 'pickup3' | 'not_needed') => void;
  onCropPhoto?: (photoKey: 'mother' | 'father' | 'pickup3') => void;
}

export const PhotoConfirmationPanel: React.FC<PhotoConfirmationPanelProps> = ({
  student,
  onConfirmRole,
  onCropPhoto,
}) => {
  // Collect all available adult photos
  const adultPhotos = [
    { key: 'mother' as const, label: 'Mother', url: student.photos.mother, confirmed: student.photoConfirmations.mother },
    { key: 'father' as const, label: 'Father', url: student.photos.father, confirmed: student.photoConfirmations.father },
    { key: 'pickup3' as const, label: 'Pickup Person', url: student.photos.pickup3, confirmed: student.photoConfirmations.pickup3 },
  ].filter((p) => Boolean(p.url));

  if (adultPhotos.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            Who is this? (Pick-up Authorization)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            These people will be printed as authorised to pick up the child. Please confirm each one.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {adultPhotos.map((item) => (
          <div
            key={item.key}
            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
              item.confirmed
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            {/* Photo Thumbnail */}
            <div className="relative mb-3">
              <img
                src={item.url}
                alt={item.label}
                className="w-24 h-28 object-cover rounded-lg border border-slate-300 shadow-xs bg-white"
              />
              {item.confirmed && (
                <div className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full p-1 shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Direct Crop Button */}
            {onCropPhoto && (
              <button
                type="button"
                onClick={() => onCropPhoto(item.key)}
                className="mb-2.5 py-1 px-3 bg-white hover:bg-slate-100 text-[#1e3a8a] border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                title={`Crop and align ${item.label}`}
              >
                <Crop className="w-3 h-3" />
                <span>Crop Photo</span>
              </button>
            )}

            {/* Quick Confirmation Buttons */}
            <div className="w-full grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onConfirmRole(item.key, 'mother')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all min-h-[34px] ${
                  item.key === 'mother' && item.confirmed
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                Mother
              </button>

              <button
                type="button"
                onClick={() => onConfirmRole(item.key, 'father')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all min-h-[34px] ${
                  item.key === 'father' && item.confirmed
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                Father
              </button>

              <button
                type="button"
                onClick={() => onConfirmRole(item.key, 'pickup3')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all min-h-[34px] ${
                  item.key === 'pickup3' && item.confirmed
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                Pickup Person
              </button>

              <button
                type="button"
                onClick={() => onConfirmRole(item.key, 'not_needed')}
                className="py-1.5 px-2 text-xs font-medium rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-all min-h-[34px]"
              >
                Not needed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
