import { createRequire } from 'module'
import type { Font, GlyphData, Point } from './types.js'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontDb = require('hersheytext/hersheytext.json') as Record<string, HersheyFontEntry>

type HersheyGlyphRaw = { d: string; o: string }
type HersheyFontEntry = { name: string; chars: HersheyGlyphRaw[] }

// Parse an SVG mini-path "M x,y L x1,y1 x2,y2 ..." into stroke arrays.
// xScale and yScale may differ: yScale uses the full y range (no descender clipping),
// xScale uses the cap height (correct proportional character width).
function parsePath(
  d: string,
  o: number,
  bottom: number,
  xScale: number,
  yScale: number,
): { strokes: Point[][]; advance: number } {
  const strokes: Point[][] = []
  let current: Point[] = []

  for (const token of d.trim().split(/(?=[ML])/)) {
    const type = token[0]
    const nums = token.slice(1).trim().split(/[\s,]+/).map(Number)

    if (type === 'M') {
      if (current.length > 0) { strokes.push(current); current = [] }
      if (nums.length >= 2) {
        current.push({ x: nums[0] * xScale, y: (bottom - nums[1]) * yScale })
      }
    } else if (type === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        current.push({ x: nums[i] * xScale, y: (bottom - nums[i + 1]) * yScale })
      }
    }
  }
  if (current.length > 0) strokes.push(current)

  // Advance based on x scale (cap height) for correct proportional spacing.
  const advance = 2 * o * xScale
  return { strokes, advance }
}

// Scan letter/digit glyphs for vertical extent.
// capHeight uses min(maxY per uppercase letter) as the baseline — robust against
// gothic letters like P/Q/Y whose strokes extend below the true baseline.
function detectYRange(chars: HersheyGlyphRaw[]): { top: number; bottom: number; capHeight: number } {
  // ASCII indices for: A-Z (32-57), a-z (64-89), 0-9 (15-24)
  const letterRanges = [[15, 24], [32, 57], [64, 89]]
  let top = Infinity, bottom = -Infinity
  let capTop = Infinity
  const upperMaxYs: number[] = []

  for (const [lo, hi] of letterRanges) {
    const isUpper = lo === 32
    for (let idx = lo; idx <= hi; idx++) {
      const ch = chars[idx]
      if (!ch?.d) continue
      let glyphMaxY = -Infinity
      for (const token of ch.d.trim().split(/(?=[ML])/)) {
        const nums = token.slice(1).trim().split(/[\s,]+/).map(Number)
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const y = nums[i + 1]
          if (!isFinite(y)) continue
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (isUpper) {
            if (y < capTop) capTop = y
            if (y > glyphMaxY) glyphMaxY = y
          }
        }
      }
      if (isUpper && glyphMaxY > -Infinity) upperMaxYs.push(glyphMaxY)
    }
  }
  // baseline = min(maxY per uppercase glyph): the lowest point ALL caps reach,
  // ignoring sub-baseline flourishes on P/Q/Y etc.
  const baseline = Math.min(...upperMaxYs)
  return { top, bottom, capHeight: baseline - capTop }
}

export function hersheyFont(name: string): Font {
  const entry = fontDb[name]
  if (!entry) throw new Error(`Unknown Hershey font "${name}". Available: ${hersheyFonts().join(', ')}`)

  const chars = entry.chars
  const { top, bottom, capHeight } = detectYRange(chars)
  // yScale: full range keeps descenders inside tape (no clipping)
  // xScale: cap height gives correct proportional character width
  const yScale = 4 / (bottom - top)
  const xScale = 4 / capHeight

  const spaceAdvance = 2 * 10 * xScale

  const glyphCache = new Map<string, GlyphData>()

  function glyph(c: string): GlyphData {
    const cached = glyphCache.get(c)
    if (cached) return cached

    const idx = c.charCodeAt(0) - 33
    const raw = chars[idx]
    let result: GlyphData

    if (!raw?.d) {
      // Fallback: empty glyph with minimal advance
      result = { strokes: [], advance: spaceAdvance }
    } else {
      const o = parseInt(raw.o, 10)
      result = parsePath(raw.d, o, bottom, xScale, yScale)
    }

    glyphCache.set(c, result)
    return result
  }

  return { glyph, spaceAdvance }
}

export function hersheyFonts(): string[] {
  return Object.keys(fontDb)
}
