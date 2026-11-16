/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { get, set, del, keys } from 'idb-keyval';
import { FormRecord } from '../types/icard';

const FORMS_KEY_PREFIX = 'icard_form_';
const FORMS_INDEX_KEY = 'icard_forms_index';

/**
 * Loads all saved FormRecords from IndexedDB.
 */
export async function loadAllForms(): Promise<FormRecord[]> {
  try {
    const formIds = (await get<string[]>(FORMS_INDEX_KEY)) || [];
    const forms: FormRecord[] = [];
    for (const id of formIds) {
      const record = await get<FormRecord>(`${FORMS_KEY_PREFIX}${id}`);
      if (record) {
        forms.push(record);
      }
    }
    return forms.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Saves or updates a FormRecord in IndexedDB.
 */
export async function saveForm(record: FormRecord): Promise<void> {
  const formIds = (await get<string[]>(FORMS_INDEX_KEY)) || [];
  if (!formIds.includes(record.id)) {
    formIds.push(record.id);
    await set(FORMS_INDEX_KEY, formIds);
  }
  await set(`${FORMS_KEY_PREFIX}${record.id}`, record);
}

/**
 * Deletes a single FormRecord by ID.
 */
export async function deleteForm(id: string): Promise<void> {
  const formIds = (await get<string[]>(FORMS_INDEX_KEY)) || [];
  const updatedIds = formIds.filter((fid) => fid !== id);
  await set(FORMS_INDEX_KEY, updatedIds);
  await del(`${FORMS_KEY_PREFIX}${id}`);
}

/**
 * Clears all stored data from IndexedDB.
 */
export async function clearAllForms(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (typeof key === 'string' && (key.startsWith(FORMS_KEY_PREFIX) || key === FORMS_INDEX_KEY)) {
      await del(key);
    }
  }
}
