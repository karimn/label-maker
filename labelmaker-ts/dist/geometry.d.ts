import type { Calibration, CharPlan, Font, Move, StrokePlan } from './types.js';
export declare function planEllipse(cx: number, cy: number, rx: number, ry: number, segments?: number, calOverrides?: Partial<Calibration>): Move[];
export declare function planCircle(cx: number, cy: number, r: number, segments?: number, calOverrides?: Partial<Calibration>): Move[];
export declare function planText(text: string, cal: Calibration, xStart?: number, yOrigin?: number, font?: Font): {
    chars: CharPlan[];
    finalX: number;
};
export declare function planLines(lines: string[], calOverrides?: Partial<Calibration>, xStart?: number, gap?: number, font?: Font): StrokePlan;
