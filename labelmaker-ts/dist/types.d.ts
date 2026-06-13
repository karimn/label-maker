export type Point = {
    x: number;
    y: number;
};
export type GlyphData = {
    strokes: Point[][];
    advance: number;
};
export type Font = {
    glyph: (char: string) => GlyphData;
    spaceAdvance: number;
};
export type Calibration = {
    xScale: number;
    yScale: number;
    yGear: number;
};
export declare const DEFAULT_CALIBRATION: Calibration;
export type Move = {
    kind: 'goto';
    x: number;
    y: number;
    draw: boolean;
} | {
    kind: 'dot';
    x: number;
    y: number;
};
export type CharPlan = {
    char: string;
    moves: Move[];
};
export type LinePlan = {
    text: string;
    yOrigin: number;
    chars: CharPlan[];
    finalX: number;
};
export type StrokePlan = {
    lines: LinePlan[];
};
export type ProgressEvent = {
    type: 'line';
    lineIndex: number;
    lineCount: number;
    text: string;
} | {
    type: 'char';
    lineIndex: number;
    charIndex: number;
    char: string;
} | {
    type: 'done';
};
export type PrintOptions = {
    onProgress?: (event: ProgressEvent) => void;
    calibration?: Partial<Calibration>;
    lineGap?: number;
};
