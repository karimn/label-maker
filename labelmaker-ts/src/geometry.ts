import { VECTORS, charIndex } from './font.js'
import type { Calibration, CharPlan, LinePlan, Move, StrokePlan } from './types.js'
import { DEFAULT_CALIBRATION } from './types.js'

function mergeCalibration(overrides?: Partial<Calibration>): Calibration {
  return { ...DEFAULT_CALIBRATION, ...overrides }
}

function planChar(c: string, xOrigin: number, yOrigin: number, cal: Calibration): { moves: Move[]; advance: number } {
  const strokes = VECTORS[charIndex(c)]
  const moves: Move[] = []
  let curX = xOrigin
  let curY = yOrigin

  for (const v of strokes) {
    if (v === 222) {
      moves.push({ kind: 'dot', x: curX, y: curY })
      continue
    }
    const draw = v >= 100
    const coord = draw ? v - 100 : v
    const cx = Math.floor(coord / 10)
    const cy = coord % 10
    curX = xOrigin + cx * cal.xScale
    curY = yOrigin + Math.round(cy * cal.yScale * cal.yGear)
    moves.push({ kind: 'goto', x: curX, y: curY, draw })
  }

  const space = cal.xScale * 5
  let advance = space
  if (c === 'I' || c === 'i') advance -= (cal.xScale * 4) / 1.1
  else if (c === ',') advance -= (cal.xScale * 4) / 1.2

  return { moves, advance }
}

export function planText(
  text: string,
  cal: Calibration,
  xStart = 0,
  yOrigin = 0,
): { chars: CharPlan[]; finalX: number } {
  const space = cal.xScale * 5
  const chars: CharPlan[] = []
  let x = xStart

  for (const c of text) {
    if (c === ' ') { x += space; continue }
    const { moves, advance } = planChar(c, x, yOrigin, cal)
    chars.push({ char: c, moves })
    x += advance
  }

  return { chars, finalX: x }
}

export function planLines(
  lines: string[],
  calOverrides?: Partial<Calibration>,
  xStart = 0,
  gap = 200,
): StrokePlan {
  const cal = mergeCalibration(calOverrides)
  const n = lines.length
  const totalH = Math.round(4 * cal.yScale * cal.yGear)
  const totalGap = gap * (n - 1)
  const lineH = Math.floor((totalH - totalGap) / n)
  const lineYGear = lineH / (4 * cal.yScale)
  const lineCal: Calibration = { ...cal, yGear: lineYGear }

  const linePlans: LinePlan[] = lines.map((text, i) => {
    // Line 0 (first in array) is topmost; y increases downward toward tape edge.
    const yOrigin = (n - 1 - i) * (lineH + gap)
    const { chars, finalX } = planText(text, lineCal, xStart, yOrigin)
    return { text, yOrigin, chars, finalX }
  })

  return { lines: linePlans }
}
