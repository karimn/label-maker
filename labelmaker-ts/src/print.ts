#!/usr/bin/env node
// CLI: node dist/print.js [--font <name>] [--port <dev>] "Line 1" ["Line 2" ...]
import { LabelMaker } from './label-maker.js'
import { builtinFont } from './font.js'
import { hersheyFont, hersheyFonts } from './hershey.js'
import type { Font } from './types.js'

function usage(): never {
  console.error(`Usage: print.js [--font <name>] [--port <device>] <line1> [line2 ...]

Options:
  --font, -f <name>    Hershey font name (default: builtin)
  --port, -p <device>  Serial port (default: /dev/ttyUSB0)

Available Hershey fonts: ${hersheyFonts().join(', ')}`)
  process.exit(1)
}

function parseArgs(argv: string[]): { font: Font; port: string; lines: string[] } {
  const args = argv.slice(2)
  let font: Font = builtinFont()
  let port = '/dev/ttyUSB0'
  const lines: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--font' || arg === '-f') {
      const name = args[++i]
      if (!name) usage()
      font = hersheyFont(name)
    } else if (arg === '--port' || arg === '-p') {
      port = args[++i]
      if (!port) usage()
    } else if (arg === '--help' || arg === '-h') {
      usage()
    } else {
      lines.push(arg)
    }
  }

  if (lines.length === 0) usage()
  return { font, port, lines }
}

const { font, port, lines } = parseArgs(process.argv)

const lm = new LabelMaker(port, 9600, {}, font)
await lm.connect()
await lm.printLines(lines, {
  onProgress: e => {
    if (e.type === 'line' && e.lineIndex > 0) process.stdout.write(' | ')
    if (e.type === 'char') process.stdout.write(e.char)
    if (e.type === 'done') console.log('\ndone.')
  },
})
await lm.disconnect()
