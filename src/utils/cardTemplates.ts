/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardTemplate } from '../types/idcard';
import { get, set } from 'idb-keyval';

export const CARD_WIDTH_MM = 90;
export const CARD_HEIGHT_MM = 58;
export const CARD_DPI = 300;
// 90mm at 300 DPI = 1063px, 58mm at 300 DPI = 685px
export const CARD_PX_WIDTH = 1063;
export const CARD_PX_HEIGHT = 685;
export const MM_TO_PX = CARD_PX_WIDTH / CARD_WIDTH_MM; // ~11.8111 px/mm

export const MODERN_SCHOOL_DEFAULT_TEMPLATE: CardTemplate = {
  id: 'modern_school',
  name: 'Modern Universal Academy',
  schoolName: 'MODERN UNIVERSAL ACADEMY',
  schoolSubtitle: 'Excellence in Education • CBSE Affiliated',
  primaryColor: '#1e40af',
  accentColor: '#f59e0b',
  textColor: '#1e293b',
  fontScale: 1.0,
  w: 90,
  h: 58,
  bg: {
    front: '',
    back: '',
  },
  elements: [
    {
      id: 'name',
      label: 'Student Name',
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 16.5,
      w: 56.0,
      h: 4.5,
      content: '{studentName}',
      font: 'Open Sans',
      weight: 700,
      size: 3.2,
      color: '#1e3a8a',
      align: 'left',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'class',
      label: 'Class & Section',
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 21.8,
      w: 56.0,
      h: 3.2,
      content: 'Class & Sec : {classSection}',
      font: 'Open Sans',
      weight: 600,
      size: 2.1,
      color: '#334155',
      align: 'left',
      lines: 1,
      fmt: 'roman',
    },
    {
      id: 'adm',
      label: 'Admission / Roll No',
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 25.4,
      w: 56.0,
      h: 3.2,
      content: 'Adm / S.No  : {serialNumber}',
      font: 'Open Sans',
      weight: 600,
      size: 2.1,
      color: '#334155',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'father',
      label: "Father's Name",
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 29.0,
      w: 56.0,
      h: 3.2,
      content: 'Father : {fatherName}',
      font: 'Open Sans',
      weight: 500,
      size: 2.0,
      color: '#334155',
      align: 'left',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'mother',
      label: "Mother's Name",
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 32.6,
      w: 56.0,
      h: 3.2,
      content: 'Mother : {motherName}',
      font: 'Open Sans',
      weight: 500,
      size: 2.0,
      color: '#334155',
      align: 'left',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'dob_bg',
      label: 'DOB & Blood Group',
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 36.2,
      w: 56.0,
      h: 3.2,
      content: 'DOB: {dateOfBirth}  |  BG: {bloodGroup}',
      font: 'Open Sans',
      weight: 500,
      size: 2.0,
      color: '#334155',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'contact1',
      label: 'Emergency Mobile',
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 39.8,
      w: 56.0,
      h: 3.2,
      content: 'Contact : {fatherMobile}  {motherMobile}',
      font: 'Open Sans',
      weight: 600,
      size: 2.0,
      color: '#0f172a',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'address',
      label: 'Residential Address',
      side: 'front',
      type: 'text',
      x: 6.0,
      y: 43.6,
      w: 78.0,
      h: 5.8,
      content: 'Address: {addressFull} - {pincode}',
      font: 'Open Sans',
      weight: 500,
      size: 1.7,
      color: '#475569',
      align: 'left',
      lines: 2,
      fmt: 'upper',
    },
    {
      id: 'photo',
      label: 'Student Photo',
      side: 'front',
      type: 'photo',
      x: 64.0,
      y: 16.5,
      w: 20.0,
      h: 25.5,
      field: 'student',
      fit: 'cover',
      border: 0.35,
      borderColor: '#1e3a8a',
    },
    {
      id: 'pickup',
      label: 'Authorised Pickup Photos',
      side: 'back',
      type: 'photos',
      x: 6.0,
      y: 19.5,
      w: 78.0,
      h: 24.5,
      fields: ['mother', 'father', 'pickup3'],
      slots: 3,
      gap: 5.0,
      layout: 'fixed',
      fit: 'cover',
      border: 0.3,
      borderColor: '#1e3a8a',
    },
  ],
};

export const BAL_BHAVAN_DEFAULT_TEMPLATE: CardTemplate = {
  id: 'balbhavan',
  name: 'Bal Bhavan Pre-printed Template',
  w: 90,
  h: 58,
  bg: {
    front: '/backgrounds/BalBhavan_front_blank.png',
    back: '/backgrounds/BalBhavan_back_blank.png',
  },
  elements: [
    {
      id: 'name',
      label: 'Student Name',
      side: 'front',
      type: 'text',
      x: 11.1,
      y: 16.4,
      w: 47.6,
      h: 4.2,
      content: '{studentName}',
      font: 'Open Sans',
      weight: 600,
      size: 3.0,
      color: '#e31e24',
      align: 'center',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'father',
      label: "Father's Name",
      side: 'front',
      type: 'text',
      x: 15.9,
      y: 20.75,
      w: 49.6,
      h: 3.2,
      content: ': {fatherName}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'mother',
      label: "Mother's Name",
      side: 'front',
      type: 'text',
      x: 15.9,
      y: 24.05,
      w: 49.6,
      h: 3.2,
      content: ': {motherName}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'class',
      label: 'Class & Section',
      side: 'front',
      type: 'text',
      x: 15.9,
      y: 27.4,
      w: 49.6,
      h: 3.2,
      content: ': {classSection}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'roman',
    },
    {
      id: 'contact1',
      label: "Father's Mobile",
      side: 'front',
      type: 'text',
      x: 15.9,
      y: 30.7,
      w: 19.2,
      h: 3.2,
      content: ': {fatherMobile}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'contact2',
      label: "Mother's Mobile",
      side: 'front',
      type: 'text',
      x: 35.2,
      y: 30.7,
      w: 20.0,
      h: 3.2,
      content: '{motherMobile}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'dob',
      label: 'Date of Birth',
      side: 'front',
      type: 'text',
      x: 15.9,
      y: 34.05,
      w: 18.0,
      h: 3.2,
      content: ': {dateOfBirth}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'date',
    },
    {
      id: 'bg',
      label: 'Blood Group',
      side: 'front',
      type: 'text',
      x: 40.75,
      y: 34.05,
      w: 14.0,
      h: 3.2,
      content: '{bloodGroup}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'upper',
    },
    {
      id: 'adm',
      label: 'Serial / Adm. No',
      side: 'front',
      type: 'text',
      x: 15.9,
      y: 37.45,
      w: 30.0,
      h: 3.2,
      content: ': {serialNumber}',
      font: 'Open Sans',
      weight: 500,
      size: 2.3,
      color: '#1b1b1b',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'photo',
      label: 'Student Photo',
      side: 'front',
      type: 'photo',
      x: 66.75,
      y: 16.55,
      w: 17.85,
      h: 23.5,
      field: 'student',
      fit: 'cover',
      border: 0.22,
      borderColor: '#2a2a2a',
    },
    {
      id: 'address',
      label: 'Address',
      side: 'front',
      type: 'text',
      x: 16.4,
      y: 42.2,
      w: 66.8,
      h: 5.6,
      content: '{addressFull}-{pincode}',
      font: 'Open Sans',
      weight: 600,
      size: 1.75,
      color: '#2b2b2b',
      align: 'center',
      lines: 2,
      fmt: 'upper',
    },
    {
      id: 'year',
      label: 'Academic Session',
      side: 'front',
      type: 'text',
      x: 71.0,
      y: 50.95,
      w: 14.4,
      h: 3.5,
      content: ': {academicSession}',
      font: 'Roboto',
      weight: 700,
      size: 2.3,
      color: '#ffffff',
      align: 'left',
      lines: 1,
      fmt: 'none',
    },
    {
      id: 'pickup',
      label: 'Authorised Pickup Photos',
      side: 'back',
      type: 'photos',
      x: 7.42,
      y: 23.84,
      w: 76.45,
      h: 26.26,
      fields: ['mother', 'father', 'pickup3'],
      slots: 3,
      gap: 6.5,
      layout: 'fixed',
      fit: 'cover',
      border: 0.22,
      borderColor: '#222222',
    },
  ],
};

export const DPS_TEMPLATE: CardTemplate = {
  ...structuredClone(MODERN_SCHOOL_DEFAULT_TEMPLATE),
  id: 'dps',
  name: 'Delhi Public School (DPS)',
  schoolName: 'DELHI PUBLIC SCHOOL',
  schoolSubtitle: 'Service Before Self • CBSE Affiliated',
  primaryColor: '#065f46',
  accentColor: '#eab308',
  elements: MODERN_SCHOOL_DEFAULT_TEMPLATE.elements.map((el) =>
    el.id === 'name' ? { ...el, color: '#065f46' } : el
  ),
};

export const ST_XAVIERS_TEMPLATE: CardTemplate = {
  ...structuredClone(MODERN_SCHOOL_DEFAULT_TEMPLATE),
  id: 'st_xaviers',
  name: 'St. Xavier Senior Secondary',
  schoolName: 'ST. XAVIER SENIOR SECONDARY SCHOOL',
  schoolSubtitle: 'Est. 1968 • Excellence & Integrity',
  primaryColor: '#1e3a8a',
  accentColor: '#dc2626',
  elements: MODERN_SCHOOL_DEFAULT_TEMPLATE.elements.map((el) =>
    el.id === 'name' ? { ...el, color: '#1e3a8a' } : el
  ),
};

export const GREENWOOD_TEMPLATE: CardTemplate = {
  ...structuredClone(MODERN_SCHOOL_DEFAULT_TEMPLATE),
  id: 'greenwood',
  name: 'Greenwood World Academy',
  schoolName: 'GREENWOOD WORLD ACADEMY',
  schoolSubtitle: 'Cambridge & International Baccalaureate',
  primaryColor: '#0f766e',
  accentColor: '#d97706',
  elements: MODERN_SCHOOL_DEFAULT_TEMPLATE.elements.map((el) =>
    el.id === 'name' ? { ...el, color: '#0f766e' } : el
  ),
};

export const HERITAGE_TEMPLATE: CardTemplate = {
  ...structuredClone(MODERN_SCHOOL_DEFAULT_TEMPLATE),
  id: 'heritage',
  name: 'The Heritage Global School',
  schoolName: 'THE HERITAGE GLOBAL SCHOOL',
  schoolSubtitle: 'Empowering Minds • Shaping Futures',
  primaryColor: '#831843',
  accentColor: '#eab308',
  elements: MODERN_SCHOOL_DEFAULT_TEMPLATE.elements.map((el) =>
    el.id === 'name' ? { ...el, color: '#831843' } : el
  ),
};

export const BUILTIN_TEMPLATES: Record<string, CardTemplate> = {
  st_xaviers: ST_XAVIERS_TEMPLATE,
  dps: DPS_TEMPLATE,
  modern_school: MODERN_SCHOOL_DEFAULT_TEMPLATE,
  greenwood: GREENWOOD_TEMPLATE,
  heritage: HERITAGE_TEMPLATE,
  balbhavan: BAL_BHAVAN_DEFAULT_TEMPLATE,
};

export const BUILTIN_SCHOOLS: CardTemplate[] = [
  ST_XAVIERS_TEMPLATE,
  DPS_TEMPLATE,
  MODERN_SCHOOL_DEFAULT_TEMPLATE,
  GREENWOOD_TEMPLATE,
  HERITAGE_TEMPLATE,
  BAL_BHAVAN_DEFAULT_TEMPLATE,
];

const TEMPLATE_STORAGE_KEY = 'icard_current_template';
const SAVED_TEMPLATES_KEY = 'icard_saved_templates';
const DELETED_SCHOOL_IDS_KEY = 'icard_deleted_school_ids';

export async function loadDeletedSchoolIds(): Promise<string[]> {
  try {
    const list = await get<string[]>(DELETED_SCHOOL_IDS_KEY);
    return list || [];
  } catch {
    return [];
  }
}

export async function loadCurrentTemplate(): Promise<CardTemplate> {
  try {
    const saved = await get<CardTemplate>(TEMPLATE_STORAGE_KEY);
    if (saved && saved.elements && saved.elements.length > 0) {
      return saved;
    }
  } catch {
    // Return default on error
  }
  return structuredClone(ST_XAVIERS_TEMPLATE);
}

export async function saveCurrentTemplate(template: CardTemplate): Promise<void> {
  await set(TEMPLATE_STORAGE_KEY, template);
}

export async function loadSavedTemplates(): Promise<Record<string, CardTemplate>> {
  try {
    const saved = await get<Record<string, CardTemplate>>(SAVED_TEMPLATES_KEY);
    return saved || {};
  } catch {
    return {};
  }
}

export async function loadAllSchoolTemplates(): Promise<CardTemplate[]> {
  const deletedIds = new Set(await loadDeletedSchoolIds());
  const customMap = await loadSavedTemplates();
  const customList = Object.values(customMap);

  const map = new Map<string, CardTemplate>();
  for (const s of BUILTIN_SCHOOLS) {
    if (!deletedIds.has(s.id)) {
      map.set(s.id, s);
    }
  }
  for (const c of customList) {
    if (!deletedIds.has(c.id)) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values());
}

export async function saveSchoolTemplate(template: CardTemplate): Promise<void> {
  const all = await loadSavedTemplates();
  all[template.id] = structuredClone(template);
  await set(SAVED_TEMPLATES_KEY, all);

  // If it was in deleted IDs, un-delete it
  const deleted = await loadDeletedSchoolIds();
  if (deleted.includes(template.id)) {
    await set(DELETED_SCHOOL_IDS_KEY, deleted.filter((id) => id !== template.id));
  }
}

export async function deleteSchoolTemplate(templateId: string): Promise<void> {
  const all = await loadSavedTemplates();
  delete all[templateId];
  await set(SAVED_TEMPLATES_KEY, all);

  const deletedIds = await loadDeletedSchoolIds();
  if (!deletedIds.includes(templateId)) {
    deletedIds.push(templateId);
    await set(DELETED_SCHOOL_IDS_KEY, deletedIds);
  }
}

export async function restoreDefaultSchools(): Promise<CardTemplate[]> {
  await set(DELETED_SCHOOL_IDS_KEY, []);
  return await loadAllSchoolTemplates();
}
