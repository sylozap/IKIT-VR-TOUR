import { MathUtils } from 'three';

export const degToRad = MathUtils.degToRad;
export const radToDeg = MathUtils.radToDeg;
export const clamp = MathUtils.clamp;

/**
 * Frame-rate independent exponential smoothing.
 *
 * `lambda` is the decay rate (larger = snappier). Because it is derived from
 * `dt`, the motion feels identical at 30, 60 or 144 fps — which a naive
 * `current += (target - current) * factor` does not guarantee.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return MathUtils.damp(current, target, lambda, dt);
}
