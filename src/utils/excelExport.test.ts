/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCellImageBounds } from './excelExport';

test('calculateCellImageBounds centers image within cell and applies insets', () => {
  // col 2 (Col C), row 1 (Row 2)
  // cell 105px x 120px, 4px inset -> avail 97 x 112
  // passport 35x45: AR = 0.778 <= 97/112 (0.866)
  // targetH = 112, targetW = 112 * (35/45) = 87.11px -> 87px
  // marginX = (105 - 87) / 2 = 9px
  // marginY = (120 - 112) / 2 = 4px
  const bounds = calculateCellImageBounds(2, 1, 35, 45, 105, 120, 4);

  assert.equal(bounds.editAs, 'oneCell');
  assert.ok(bounds.tl.col >= 2.0 && bounds.tl.col < 2.2);
  assert.ok(bounds.tl.row >= 1.0 && bounds.tl.row < 1.1);
  assert.equal(bounds.ext.height, 112);
  assert.equal(bounds.ext.width, 87);
});

test('calculateCellImageBounds handles wide photos correctly', () => {
  // Wide image 200x100
  const bounds = calculateCellImageBounds(0, 0, 200, 100, 105, 120, 4);
  assert.equal(bounds.editAs, 'oneCell');
  assert.ok(bounds.tl.col >= 0);
  assert.ok(bounds.tl.row >= 0);
  assert.equal(bounds.ext.width, 97);
  assert.ok(bounds.ext.height <= 112);
});
