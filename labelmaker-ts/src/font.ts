import type { Font, GlyphData, Point } from './types.js'

// Stroke data for 63 characters on a 0..4 grid.
// Each number encodes one move:
//   >= 100 → pen-down (draw); subtract 100 for coord
//   tens digit → x coord (0..4), ones digit → y coord (0..4)
//   222 → plot a dot at the current pen position
export const VECTORS: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 124, 140, 32, 112],                                          // 0  A
  [0, 104, 134, 132, 2, 142, 140, 100],                            // 1  B
  [41, 130, 110, 101, 103, 114, 134, 143],                         // 2  C
  [0, 104, 134, 143, 141, 130, 100],                               // 3  D
  [40, 100, 104, 144, 22, 102],                                    // 4  E
  [0, 104, 144, 22, 102],                                          // 5  F
  [44, 104, 100, 140, 142, 122],                                   // 6  G
  [0, 104, 2, 142, 44, 140],                                       // 7  H
  [0, 104],                                                        // 8  I
  [1, 110, 130, 141, 144],                                         // 9  J
  [0, 104, 2, 142, 140, 22, 144],                                  // 10 K
  [40, 100, 104],                                                  // 11 L
  [0, 104, 122, 144, 140],                                         // 12 M
  [0, 104, 140, 144],                                              // 13 N
  [10, 101, 103, 114, 134, 143, 141, 130, 110],                    // 14 O
  [0, 104, 144, 142, 102],                                         // 15 P
  [0, 104, 144, 142, 120, 100, 22, 140],                           // 16 Q
  [0, 104, 144, 142, 102, 22, 140],                                // 17 R
  [0, 140, 142, 102, 104, 144],                                    // 18 S
  [20, 124, 4, 144],                                               // 19 T
  [4, 101, 110, 130, 141, 144],                                    // 20 U
  [4, 120, 144],                                                   // 21 V
  [4, 100, 122, 140, 144],                                         // 22 W
  [0, 144, 4, 140],                                                // 23 X
  [4, 122, 144, 22, 120],                                          // 24 Y
  [4, 144, 100, 140],                                              // 25 Z
  [0, 104, 144, 140, 100, 144],                                    // 26 0
  [0, 140, 20, 124, 104],                                          // 27 1
  [4, 144, 142, 102, 100, 140],                                    // 28 2
  [0, 140, 144, 104, 12, 142],                                     // 29 3
  [20, 123, 42, 102, 104],                                         // 30 4
  [0, 140, 142, 102, 104, 144],                                    // 31 5
  [2, 142, 140, 100, 104, 144],                                    // 32 6
  [0, 144, 104, 12, 132],                                          // 33 7
  [0, 140, 144, 104, 100, 2, 142],                                 // 34 8
  [0, 140, 144, 104, 102, 142],                                    // 35 9
  [],                                                              // 36 (space, unused)
  [],                                                              // 37 (space, unused)
  [0, 144],                                                        // 38 / (also: unknown char fallback)
  [0, 102, 124, 142, 140, 42, 102, 4, 103, 44, 143],               // 39 Ä
  [0, 102, 142, 140, 100, 2, 14, 113, 34, 133],                    // 40 Ö
  [4, 100, 140, 144, 14, 113, 34, 133],                            // 41 Ü
  [0, 111],                                                        // 42 ,
  [2, 142],                                                        // 43 -
  [0, 222],                                                        // 44 .
  [0, 222, 1, 104],                                                // 45 \!
  [20, 222, 21, 122, 142, 144, 104],                               // 46 ?
  [0, 104, 134, 133, 122, 142, 140, 110],                          // 47 ß  (input: '{')
  [23, 124],                                                       // 48 '
  [42, 120, 100, 101, 123, 124, 104, 103, 130, 140],               // 49 &
  [2, 142, 20, 124],                                               // 50 +
  [21, 222, 23, 222],                                              // 51 :
  [10, 121, 22, 222],                                              // 52 ;
  [14, 113, 33, 134],                                              // 53 "
  [10, 114, 34, 130, 41, 101, 3, 143],                             // 54 #
  [34, 124, 120, 130],                                             // 55 (
  [10, 120, 124, 114],                                             // 56 )
  [1, 141, 43, 103],                                               // 57 =
  [31, 133, 113, 111, 141, 144, 104, 100, 140],                    // 58 @
  [2, 142, 20, 124, 4, 140, 0, 144],                               // 59 *
  [0, 140, 144, 104, 100, 12, 113, 33, 132, 31, 111],              // 60 }  smiley
  [0, 140, 144, 104, 100, 13, 222, 33, 222, 32, 131, 111, 112, 132], // 61 ~  open smiley
  [20, 142, 143, 134, 123, 114, 103, 102, 120],                    // 62 $  heart
]

const CHAR_MAP: Record<string, number> = {
  ',': 42, '-': 43, '.': 44, '!': 45, '?': 46,
  '{': 47, "'": 48, '&': 49, '+': 50, ':': 51,
  ';': 52, '"': 53, '#': 54, '(': 55, ')': 56,
  '=': 57, '@': 58, '*': 59, '}': 60, '~': 61,
  '$': 62,
}

export function charIndex(c: string): number {
  const o = c.charCodeAt(0)
  if (o >= 65 && o <= 90) return o - 65   // A-Z → 0-25
  if (o >= 97 && o <= 122) return o - 97  // a-z → 0-25
  if (o >= 48 && o <= 57) return o - 22   // 0-9 → 26-35
  return CHAR_MAP[c] ?? 38                // default: '/'
}

// Decodes the compact integer encoding to GlyphData in normalized 0–4 grid coords.
function decodeGlyph(c: string): GlyphData {
  const vecs = VECTORS[charIndex(c)]
  const strokes: Point[][] = []
  let current: Point[] = []
  let curPt: Point = { x: 0, y: 0 }

  for (const v of vecs) {
    if (v === 222) {
      // Dot at current pen position; discard positioning moves in current.
      const dotPos = current.length > 0 ? current[current.length - 1] : curPt
      current = []
      strokes.push([{ ...dotPos }])
      continue
    }
    const draw = v >= 100
    const coord = draw ? v - 100 : v
    const pt: Point = { x: Math.floor(coord / 10), y: coord % 10 }
    curPt = pt
    if (!draw && current.length > 0) { strokes.push(current); current = [] }
    current.push(pt)
  }
  if (current.length > 0) strokes.push(current)

  // narrow-char advance corrections mirror the old planChar special-cases
  let advance = 5
  if (c === 'I' || c === 'i') advance = 5 - 4 / 1.1
  else if (c === ',') advance = 5 - 4 / 1.2

  return { strokes, advance }
}

// Built-in 5×5 stroke font wrapped as a Font provider.
export function builtinFont(): Font {
  return {
    glyph: decodeGlyph,
    spaceAdvance: 5,
  }
}
