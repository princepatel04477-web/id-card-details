/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePaddedCropBox, pixelRectToBox2d } from './crop';

test('calculatePaddedCropBox calculates coordinates with 3% padding and clamps bounds', () => {
  // Image 1000x2000
  // Box: ymin=100, xmin=200, ymax=400, xmax=600 (out of 1000)
  // pixel box: ymin=200, xmin=200, ymax=800, xmax=600
  // rawW = 400, rawH = 600
  // padX = 12 (3%), padY = 18 (3%)
  // x1 = 188, y1 = 182, x2 = 612, y2 = 818
  const crop = calculatePaddedCropBox([100, 200, 400, 600], 1000, 2000);
  assert.equal(crop.x, 188);
  assert.equal(crop.y, 182);
  assert.equal(crop.width, 612 - 188);
  assert.equal(crop.height, 818 - 182);

  // Near boundaries clamping check
  const boundaryCrop = calculatePaddedCropBox([0, 0, 100, 100], 1000, 1000);
  assert.equal(boundaryCrop.x, 0); // clamped to 0
  assert.equal(boundaryCrop.y, 0); // clamped to 0
  assert.ok(boundaryCrop.width > 0);
  assert.ok(boundaryCrop.height > 0);
});

test('pixelRectToBox2d converts pixel rect back to 0-1000 normalized range', () => {
  const rect = { x: 200, y: 300, width: 400, height: 500 };
  const box = pixelRectToBox2d(rect, 1000, 1000);
  assert.deepEqual(box, [300, 200, 800, 600]);
});
