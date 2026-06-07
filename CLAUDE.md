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
