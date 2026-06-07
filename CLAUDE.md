# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Flash

A bundled `arduino-cli` binary lives at `bin/arduino-cli`. No build config is committed; use it directly:

```bash
# Compile (replace FQBN and port as needed)
./bin/arduino-cli compile --fqbn arduino:avr:uno CrunchLabsLabelMaker.ino

# Upload
./bin/arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:uno CrunchLabsLabelMaker.ino

# Install required libraries (one-time)
./bin/arduino-cli lib install "LiquidCrystal I2C" "ezButton"
# Wire, Stepper, and Servo ship with the Arduino AVR core
```

There are no automated tests — validation requires flashing to an Arduino Uno and observing hardware behavior.

## TypeScript Backend (`labelmaker-ts/`)

The active computer-side driver. Replaces `labelmaker.py`. A typed Node.js ESM module — pure geometry layer + serial driver.

### Install
```bash
cd labelmaker-ts && bun install
```

### Build
```bash
cd labelmaker-ts && bun run build   # runs tsc → emits dist/
```

### Run (hardware)

**Use `node`, not `bun`** — `serialport` uses libuv NAPI functions that Bun doesn't support yet.

```bash
cd labelmaker-ts && node --input-type=module <<'EOF'
import { LabelMaker } from './dist/index.js'
const lm = new LabelMaker()          // defaults: /dev/ttyUSB0, 9600 baud
await lm.connect()
await lm.printLines(['LINE ONE', 'LINE TWO'])
await lm.disconnect()
EOF
```

With progress callbacks:
```bash
cd labelmaker-ts && node --input-type=module <<'EOF'
import { LabelMaker } from './dist/index.js'
const lm = new LabelMaker()
await lm.connect()
await lm.printLines(['HELLO', 'WORLD'], {
  onProgress: e => {
    if (e.type === 'char') process.stdout.write(e.char)
    if (e.type === 'done') console.log('\nDone.')
  }
})
await lm.disconnect()
EOF
```

### Preview geometry (no hardware)
```bash
cd labelmaker-ts && bun -e "
import { planLines } from './src/geometry.ts'
console.log(JSON.stringify(planLines(['HELLO']), null, 2))
"
```

### Key gotchas

- **`node` for hardware, `bun` for everything else.** Bun crashes on `serialport` (libuv `uv_default_loop` not yet supported).
- **Always rebuild before running:** `bun run build` then run from `dist/`.
- **Long Y moves (line rewinds) take >5s** — `CMD_TIMEOUT_MS` is set to 30s to accommodate full tape-height travel.
- **Arduino resets on serial connect** (DTR toggle), re-homing Y (~7s). `connect()` waits for `READY` with a 20s timeout.
- **`printLines` parks the carriage** at the end of the longest line after printing. Next `printLines` call should start from there (X is not reset between calls).

### Module structure

| File | Role |
|---|---|
| `src/types.ts` | Shared types + `DEFAULT_CALIBRATION` (xScale=131, yScale=230, yGear=3.501) |
| `src/font.ts` | `VECTORS[63]` stroke data + `charIndex()` |
| `src/geometry.ts` | Pure functions: `planText`, `planLines` → `StrokePlan` |
| `src/driver.ts` | `LabelMakerDriver` — serial, promise-queued commands |
| `src/label-maker.ts` | `LabelMaker` — public API |
| `src/index.ts` | Re-exports |

---

## Project Overview

Two sketches coexist:

- **`CrunchLabsSketch-level-3-stock.ino`** — Original CrunchLabs firmware. Full interactive device: LCD, joystick, state machine UI. Do not modify this unless restoring stock behavior.
- **`CrunchLabsLabelMaker.ino`** — Custom rebuild. Serial command–driven (no LCD/joystick dependency). This is the active development target.

## Architecture

### State Machine (`CrunchLabsSketch-level-3-stock.ino`)

Four states driven by joystick + button input:
`MainMenu → Editing → PrintConfirmation → Printing`

Each state transition is guarded by `prevState != currentState` to run one-time setup (LCD update, cursor reset) exactly once per entry.

### Serial Protocol (`CrunchLabsLabelMaker.ino`)

Commands arrive over `Serial` at 9600 baud, one per line:

| Command | Effect |
|---|---|
| `G <x> <y> <draw>` | Move to absolute position; draw=1 lowers pen |
| `PU` / `PD` | Pen up / pen down |
| `H` | Home Y axis, reset position to 0,0 |
| `R` | Release motor coils |
| `SX <rpm>` / `SY <rpm>` | Set stepper speed |

Every command replies `OK` or `ERR`.

### Character Encoding

`vector[63][14]` holds stroke data. Each byte encodes a 2-axis move:

- **hundreds digit**: 1 = draw, 0 = move only
- **tens digit**: X coordinate (0–4)
- **ones digit**: Y coordinate (0–4)
- **`200`**: end-of-character sentinel
- **`222`**: plot a point (pen down, step 0)

Leading zeros are deliberately omitted (they cause parsing bugs in the original encoding scheme).

### Motion

- Bresenham line algorithm in `line()` — steps one axis per iteration, accumulates error for the other.
- Y axis has a 3.5× step multiplier (`y_scale * 3.5`) to compensate for lead screw gearing difference vs. X.
- `releaseMotors()` de-energizes all stepper coils after every print cycle to prevent overheating.
- Servo: pen up = 25°, pen down = 80° (pin 13).

## Hardware Pin Map

| Component | Pins |
|---|---|
| X stepper | 6, 8, 7, 9 |
| Y stepper | 2, 4, 3, 5 |
| Servo | 13 |
| LCD (I2C) | SDA/SCL; address `0x27` |
| Joystick X/Y | A2, A1 |
| Joystick button | Pin 14 (ezButton, 50 ms debounce) |

## Key Gotchas

- `x_scale` / `y_scale` default to 230. Changing these scales both step count and letter spacing (`space = x_scale * 5`).
- Extended characters use UTF-8 two-byte sequences; `plotCharacter()` checks for the `0xC3` prefix byte (`195`) and skips it, using the second byte to identify ä/ö/ü/ß.
- The alphabet string `"_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?,.#@"` maps index 0 (underscore) to a display space; actual space characters are handled separately in `plotText()`.
