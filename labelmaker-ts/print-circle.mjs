import { LabelMaker } from './dist/index.js'

const lm = new LabelMaker()
await lm.connect()

const cy = 1611   // vertically centered on tape
const gap = 200   // X-step gap between shapes

// 1. Flat ellipse: wide (rx=700) and short (ry=150)
const flat = { cx: 700, cy, rx: 700, ry: 150 }
console.log('Printing flat ellipse rx=%d ry=%d ...', flat.rx, flat.ry)
await lm.printEllipse(flat.cx, flat.cy, flat.rx, flat.ry)

// 2. Thin ellipse: narrow (rx=150) and full-height (ry=460)
// Start it gap steps past the right edge of the flat ellipse
const thinCx = flat.cx + flat.rx + gap + 150
const thin = { cx: thinCx, cy, rx: 150, ry: 460 }
console.log('Printing thin ellipse rx=%d ry=%d ...', thin.rx, thin.ry)
await lm.printEllipse(thin.cx, thin.cy, thin.rx, thin.ry)

console.log('Done.')
await lm.disconnect()
