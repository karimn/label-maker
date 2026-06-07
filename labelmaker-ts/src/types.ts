export type Calibration = {
  xScale: number  // steps per grid unit on X (grid coords 0..4)
  yScale: number  // steps per grid unit on Y
  yGear: number   // Y gearing multiplier
}

export const DEFAULT_CALIBRATION: Calibration = {
  xScale: 131,
  yScale: 230,
  yGear: 3.501,
}

// A single motor move. 'goto' drives to (x,y) with pen up or down.
// 'dot' synthesizes: pen-up move → PD → 200ms dwell → PU.
export type Move =
  | { kind: 'goto'; x: number; y: number; draw: boolean }
  | { kind: 'dot'; x: number; y: number }

export type CharPlan = { char: string; moves: Move[] }

// finalX is the x-origin of the next character after this line (used for parking).
export type LinePlan = {
  text: string
  yOrigin: number
  chars: CharPlan[]
  finalX: number
}

export type StrokePlan = { lines: LinePlan[] }

export type ProgressEvent =
  | { type: 'line'; lineIndex: number; lineCount: number; text: string }
  | { type: 'char'; lineIndex: number; charIndex: number; char: string }
  | { type: 'done' }

export type PrintOptions = {
  onProgress?: (event: ProgressEvent) => void
  calibration?: Partial<Calibration>
  lineGap?: number  // Y-step gap between lines, default 200
}
