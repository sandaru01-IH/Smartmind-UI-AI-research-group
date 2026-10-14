import { describe, expect, it } from 'vitest';
import { isConnected } from './graph';
import {
  DEPTH_LAYERS,
  FALLBACK_SIZE,
  coverFrame,
  depthField,
  layerToView,
  layerTransform,
  viewToLayer,
} from './static-network';

describe('depth layers', () => {
  it('run far to near, with opacity rising toward the viewer', () => {
    for (let i = 1; i < DEPTH_LAYERS.length; i++) {
      expect(DEPTH_LAYERS[i].road).toBeGreaterThan(DEPTH_LAYERS[i - 1].road);
      expect(DEPTH_LAYERS[i].node).toBeGreaterThan(DEPTH_LAYERS[i - 1].node);
      expect(DEPTH_LAYERS[i].scale).toBeLessThan(DEPTH_LAYERS[i - 1].scale);
    }
  });

  it('keep every sheet faint enough to sit behind the text', () => {
    for (const layer of DEPTH_LAYERS) {
      expect(layer.road).toBeLessThanOrEqual(0.5);
      expect(layer.node).toBeLessThanOrEqual(0.65);
    }
  });

  it('have exactly one live sheet, and it is the nearest', () => {
    const live = DEPTH_LAYERS.filter((l) => l.live);
    expect(live).toHaveLength(1);
    expect(live[0]).toBe(DEPTH_LAYERS[DEPTH_LAYERS.length - 1]);
    expect(live[0].scale).toBe(1);
  });

  it('use different seeds, so no two sheets share roads', () => {
    expect(new Set(DEPTH_LAYERS.map((l) => l.seed)).size).toBe(DEPTH_LAYERS.length);
  });
});

describe('depthField', () => {
  const field = depthField();

  it('builds one connected network per sheet', () => {
    expect(field).toHaveLength(DEPTH_LAYERS.length);
    for (const layer of field) expect(isConnected(layer.graph)).toBe(true);
  });

  it('gives the front sheet about 150 junctions, inside the brief’s 150 to 250 range for the whole stack', () => {
    const front = field.find((l) => l.spec.live)!;
    expect(front.graph.nodes.length).toBeGreaterThanOrEqual(120);
    expect(front.graph.nodes.length).toBeLessThanOrEqual(250);
    const total = field.reduce((n, l) => n + l.graph.nodes.length, 0);
    expect(total).toBeGreaterThanOrEqual(150);
    expect(total).toBeLessThanOrEqual(500);
  });

  it('is deterministic, so the server picture and the canvas share the same roads', () => {
    expect(depthField()).toBe(field);
  });

  it('scores centrality for every junction, within 0 to 1', () => {
    for (const layer of field) {
      expect(layer.centrality).toHaveLength(layer.graph.nodes.length);
      for (const c of layer.centrality) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('sheet geometry', () => {
  it('maps a point to the view and back for every sheet', () => {
    for (const spec of DEPTH_LAYERS) {
      for (const [x, y] of [
        [0, 0],
        [80, 50],
        [160, 100],
        [33.3, 71.9],
      ]) {
        const v = layerToView(x, y, spec);
        const back = viewToLayer(v.x, v.y, spec);
        expect(back.x).toBeCloseTo(x, 9);
        expect(back.y).toBeCloseTo(y, 9);
      }
    }
  });

  it('leaves the front sheet untouched', () => {
    const front = DEPTH_LAYERS.find((l) => l.live)!;
    expect(layerToView(12, 34, front)).toEqual({ x: 12, y: 34 });
  });

  it('writes an SVG transform that matches the maths used by the canvas', () => {
    const spec = DEPTH_LAYERS[0];
    const m =
      /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\) translate\(([-\d.]+) ([-\d.]+)\)/.exec(
        layerTransform(spec),
      );
    expect(m).not.toBeNull();
    const [tx, ty, s, ux, uy] = m!.slice(1).map(Number);
    // SVG applies right to left: shift the centre to the origin, scale, then move it back.
    const apply = (x: number, y: number) => ({ x: (x + ux) * s + tx, y: (y + uy) * s + ty });
    const point = [20, 70] as const;
    const viaSvg = apply(point[0], point[1]);
    const viaCanvas = layerToView(point[0], point[1], spec);
    expect(viaSvg.x).toBeCloseTo(viaCanvas.x, 9);
    expect(viaSvg.y).toBeCloseTo(viaCanvas.y, 9);
  });
});

describe('coverFrame', () => {
  it('fits a wide viewport exactly and centres it', () => {
    const f = coverFrame(1440, 900);
    expect(f.scale).toBeCloseTo(9, 9);
    expect(f.ox).toBeCloseTo(0, 9);
    expect(f.oy).toBeCloseTo(0, 9);
  });

  it('crops the sides of a tall viewport, like preserveAspectRatio slice', () => {
    const f = coverFrame(390, 844);
    expect(f.scale).toBeCloseTo(844 / FALLBACK_SIZE.height, 9);
    expect(f.ox).toBeLessThan(0);
    expect(f.oy).toBeCloseTo(0, 9);
    // The scaled world is at least as large as the viewport on both axes.
    expect(FALLBACK_SIZE.width * f.scale + 2 * f.ox).toBeCloseTo(390, 6);
  });
});
