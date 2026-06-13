import { createRequire } from 'module'
import type { Font, GlyphData, Point } from './types.js'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fontDb = require('hersheytext/hersheytext.json') as Record<string, HersheyFontEntry>

type HersheyGlyphRaw = { d: string; o: string }
type HersheyFontEntry = { name: string; chars: HersheyGlyphRaw[] }

// Parse an SVG mini-path "M x,y L x1,y1 x2,y2 ..." into stroke arrays.
// Coordinates are translated so that baseline=0 and capHeight=4 (Y is flipped).
function parsePath(
  d: string,
  o: number,
  baseline: number,
  scale: number,
): { strokes: Point[][]; advance: number } {
  const strokes: Point[][] = []
  let current: Point[] = []

  for (const token of d.trim().split(/(?=[ML])/)) {
    const type = token[0]
    const nums = token.slice(1).trim().split(/[\s,]+/).map(Number)

    if (type === 'M') {
      if (current.length > 0) { strokes.push(current); current = [] }
      if (nums.length >= 2) {
        current.push({ x: nums[0] * scale, y: (baseline - nums[1]) * scale })
      }
    } else if (type === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        current.push({ x: nums[i] * scale, y: (baseline - nums[i + 1]) * scale })
      }
    }
  }
  if (current.length > 0) strokes.push(current)

  // Advance = 2*o (right bearing doubled from center), scaled to grid units.
  const advance = 2 * o * scale
  return { strokes, advance }
}

// Scan uppercase A–Z glyphs (indices 32–57) to find the font's cap-height parameters.
function detectCapParams(chars: HersheyGlyphRaw[]): { baseline: number; capHeight: number } {
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 32; i <= 57; i++) {
    const ch = chars[i]
    if (!ch?.d) continue
    const nums = ch.d.replace(/[ML]/g, ' ').split(/[\s,]+/).map(Number)
    for (let j = 0; j + 1 < nums.length; j += 2) {
      const y = nums[j + 1]
      if (isFinite(y)) { if (y < minY) minY = y; if (y > maxY) maxY = y }
    }
  }
  return { baseline: maxY, capHeight: maxY - minY }
}

export function hersheyFont(name: string): Font {
  const entry = fontDb[name]
  if (!entry) throw new Error(`Unknown Hershey font "${name}". Available: ${hersheyFonts().join(', ')}`)

  const chars = entry.chars
  const { baseline, capHeight } = detectCapParams(chars)
  const scale = 4 / capHeight  // maps capHeight glyph units → 4 grid units

  // Space advance: use the font's default horiz-adv-x (10 units), normalized
  const spaceAdvance = 2 * 10 * scale

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
      result = parsePath(raw.d, o, baseline, scale)
    }

    glyphCache.set(c, result)
    return result
  }

  return { glyph, spaceAdvance }
}

export function hersheyFonts(): string[] {
  return Object.keys(fontDb)
}
