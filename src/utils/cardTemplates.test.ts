/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_SCHOOLS,
  BUILTIN_TEMPLATES,
  DPS_TEMPLATE,
  ST_XAVIERS_TEMPLATE,
  GREENWOOD_TEMPLATE,
  HERITAGE_TEMPLATE,
  MODERN_SCHOOL_DEFAULT_TEMPLATE,
  loadAllSchoolTemplates,
} from './cardTemplates';

test('BUILTIN_SCHOOLS provides distinct schools with names and theme colors from the first', () => {
  assert.ok(BUILTIN_SCHOOLS.length >= 5, 'Should have at least 5 preset schools');

  const dps = BUILTIN_SCHOOLS.find((s) => s.id === 'dps');
  assert.ok(dps, 'DPS preset should exist');
  assert.equal(dps?.primaryColor, '#065f46');
  assert.equal(dps?.schoolName, 'DELHI PUBLIC SCHOOL');

  const xaviers = BUILTIN_SCHOOLS.find((s) => s.id === 'st_xaviers');
  assert.ok(xaviers, "St. Xavier's preset should exist");
  assert.equal(xaviers?.primaryColor, '#1e3a8a');
  assert.equal(xaviers?.schoolName, 'ST. XAVIER SENIOR SECONDARY SCHOOL');

  const greenwood = BUILTIN_SCHOOLS.find((s) => s.id === 'greenwood');
  assert.ok(greenwood, 'Greenwood preset should exist');
  assert.equal(greenwood?.primaryColor, '#0f766e');

  const heritage = BUILTIN_SCHOOLS.find((s) => s.id === 'heritage');
  assert.ok(heritage, 'The Heritage preset should exist');
  assert.equal(heritage?.primaryColor, '#831843');
});

test('School templates contain valid dimensions and photo elements for front and back', () => {
  for (const school of BUILTIN_SCHOOLS) {
    assert.equal(school.w, 90, 'Width should be standard 90mm');
    assert.equal(school.h, 58, 'Height should be standard 58mm');
    assert.ok(school.elements.length > 5, 'Should contain core card elements');

    const studentPhoto = school.elements.find(
      (e) => e.type === 'photo' && e.side === 'front'
    );
    assert.ok(studentPhoto, 'Should have student photo on front');

    const pickupPhotos = school.elements.find(
      (e) => (e.type === 'photos' || e.type === 'photo') && e.side === 'back'
    );
    assert.ok(pickupPhotos, 'Should have pickup photos on back');
  }
});
