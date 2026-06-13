import type { Calibration, Font, PrintOptions } from './types.js';
export declare class LabelMaker {
    private driver;
    private calibration;
    private font;
    constructor(port?: string, baud?: number, calibration?: Partial<Calibration>, font?: Font);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    home(): Promise<void>;
    release(): Promise<void>;
    setSpeedX(rpm: number): Promise<void>;
    setSpeedY(rpm: number): Promise<void>;
    printCircle(cx: number, cy: number, r: number, segments?: number): Promise<void>;
    printEllipse(cx: number, cy: number, rx: number, ry: number, segments?: number): Promise<void>;
    printText(text: string, options?: PrintOptions): Promise<void>;
    printLines(lines: string[], options?: PrintOptions): Promise<void>;
}
