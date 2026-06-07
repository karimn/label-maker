import type { Calibration, CharPlan, StrokePlan } from './types.js';
export declare function planText(text: string, cal: Calibration, xStart?: number, yOrigin?: number): {
    chars: CharPlan[];
    finalX: number;
};
export declare function planLines(lines: string[], calOverrides?: Partial<Calibration>, xStart?: number, gap?: number): StrokePlan;
