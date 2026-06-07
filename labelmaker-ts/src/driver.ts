import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { DEFAULT_CALIBRATION } from './types.js'

const READY_TIMEOUT_MS = 20_000
const CMD_TIMEOUT_MS = 30_000

const X_MIN = 0
const Y_MIN = 0
const Y_MAX = Math.round(4 * DEFAULT_CALIBRATION.yScale * DEFAULT_CALIBRATION.yGear)

export class LabelMakerDriver {
  private port: SerialPort
  private parser: ReadlineParser
  private queue: Promise<unknown> = Promise.resolve()

  constructor(portPath = '/dev/ttyUSB0', baud = 9600) {
    this.port = new SerialPort({ path: portPath, baudRate: baud, autoOpen: false })
    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }))
  }

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.port.open(err => (err ? reject(err) : resolve()))
    })
    await this.waitReady()
  }

  private waitReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.parser.off('data', handler)
        reject(new Error(`Timed out waiting for READY after ${READY_TIMEOUT_MS}ms`))
      }, READY_TIMEOUT_MS)

      const handler = (line: string) => {
        if (line.trim() === 'READY') {
          clearTimeout(timer)
          this.parser.off('data', handler)
          resolve()
        }
      }
      this.parser.on('data', handler)
    })
  }

  async cmd(text: string): Promise<string> {
    const result = this.queue.then(() => this._sendCmd(text))
    this.queue = result.catch(() => {})
    return result
  }

  private _sendCmd(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.parser.off('data', handler)
        reject(new Error(`Timeout waiting for response to: ${text}`))
      }, CMD_TIMEOUT_MS)

      const handler = (line: string) => {
        clearTimeout(timer)
        this.parser.off('data', handler)
        const resp = line.trim()
        if (resp === 'ERR') reject(new Error(`Command failed: ${text}`))
        else resolve(resp)
      }

      this.parser.on('data', handler)
      this.port.write(text + '\n', err => {
        if (err) {
          clearTimeout(timer)
          this.parser.off('data', handler)
          reject(err)
        }
      })
    })
  }

  async goto(x: number, y: number, draw: boolean): Promise<void> {
    const rx = Math.round(x), ry = Math.round(y)
    if (rx < X_MIN) throw new RangeError(`x=${rx} is below minimum ${X_MIN}`)
    if (ry < Y_MIN) throw new RangeError(`y=${ry} is below minimum ${Y_MIN}`)
    if (ry > Y_MAX) throw new RangeError(`y=${ry} exceeds tape height ${Y_MAX}`)
    await this.cmd(`G ${rx} ${ry} ${draw ? 1 : 0}`)
  }

  async penDown(): Promise<void> { await this.cmd('PD') }
  async penUp(): Promise<void> { await this.cmd('PU') }
  async home(): Promise<void> { await this.cmd('H') }
  async release(): Promise<void> { await this.cmd('R') }

  async disconnect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.port.close(err => (err ? reject(err) : resolve()))
    })
  }
}
