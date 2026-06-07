import { LabelMakerDriver } from './driver.js'
import { planLines, planCircle, planEllipse } from './geometry.js'
import { DEFAULT_CALIBRATION } from './types.js'
import type { Calibration, PrintOptions } from './types.js'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class LabelMaker {
  private driver: LabelMakerDriver
  private calibration: Calibration

  constructor(port = '/dev/ttyUSB0', baud = 9600, calibration?: Partial<Calibration>) {
    this.driver = new LabelMakerDriver(port, baud)
    this.calibration = { ...DEFAULT_CALIBRATION, ...calibration }
  }

  connect(): Promise<void> { return this.driver.connect() }
  disconnect(): Promise<void> { return this.driver.disconnect() }
  home(): Promise<void> { return this.driver.home() }
  release(): Promise<void> { return this.driver.release() }
  setSpeedX(rpm: number): Promise<void> { return this.driver.cmd(`SX ${rpm}`).then(() => {}) }
  setSpeedY(rpm: number): Promise<void> { return this.driver.cmd(`SY ${rpm}`).then(() => {}) }

  async printCircle(cx: number, cy: number, r: number, segments = 36): Promise<void> {
    return this.printEllipse(cx, cy, r, r, segments)
  }

  async printEllipse(cx: number, cy: number, rx: number, ry: number, segments = 36): Promise<void> {
    const moves = planEllipse(cx, cy, rx, ry, segments, this.calibration)
    for (const move of moves) {
      if (move.kind === 'goto') {
        await this.driver.goto(move.x, move.y, move.draw)
      }
    }
    await this.driver.release()
  }

  printText(text: string, options?: PrintOptions): Promise<void> {
    return this.printLines([text], options)
  }

  async printLines(lines: string[], options?: PrintOptions): Promise<void> {
    const cal = { ...this.calibration, ...options?.calibration }
    const gap = options?.lineGap ?? 200
    const plan = planLines(lines, cal, 0, gap)
    const lineCount = plan.lines.length
    const maxX = Math.max(...plan.lines.map(l => l.finalX))

    for (let li = 0; li < plan.lines.length; li++) {
      const linePlan = plan.lines[li]
      options?.onProgress?.({ type: 'line', lineIndex: li, lineCount, text: linePlan.text })

      for (let ci = 0; ci < linePlan.chars.length; ci++) {
        const charPlan = linePlan.chars[ci]
        options?.onProgress?.({ type: 'char', lineIndex: li, charIndex: ci, char: charPlan.char })

        for (const move of charPlan.moves) {
          if (move.kind === 'dot') {
            await this.driver.goto(move.x, move.y, false)
            await this.driver.penDown()
            await sleep(200)
            await this.driver.penUp()
          } else {
            await this.driver.goto(move.x, move.y, move.draw)
          }
        }
      }

      // Rewind X between lines so the next line starts at x=0
      if (li < plan.lines.length - 1) {
        await this.driver.goto(0, 0, false)
      }
    }

    // Park past the end of the longest line, pen up
    await this.driver.goto(maxX, 0, false)
    await this.driver.release()
    options?.onProgress?.({ type: 'done' })
  }
}
