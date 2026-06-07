# AGENTS.md

## Project

Single Arduino sketch (`CrunchLabsSketch-level-3-stock.ino`) — CrunchLabs Label Maker firmware. All code is in that one file at repo root.

## Toolchain

- **Language**: Arduino C++ (.ino sketch, treated as C++ in VS Code per `.vscode/settings.json`)
- **Build/flash**: Use Arduino IDE or PlatformIO (no build config committed; no CI, no tests)
- **Libraries** (must be installed in Arduino IDE): `Wire`, `LiquidCrystal_I2C`, `Stepper`, `ezButton`, `Servo`

## Hardware

| Component | Detail |
|---|---|
| LCD | I2C 16x2, address `0x27` |
| Joystick | X=A2, Y=A1, button=pin 14 (ezButton, debounce 50ms) |
| X stepper | Pins 6,8,7,9; speed 10 rpm |
| Y stepper | Pins 2,4,3,5; speed 12 rpm |
| Servo | Pin 13; pen up=25°, down=80° |

## Code conventions

- State machine via `enum State` (`MainMenu`, `Editing`, `PrintConfirmation`, `Printing`)
- Character vectors use encoded format: hundreds=draw flag (1=draw), tens=X coord, ones=Y coord, `200`=end, `222`=plot point
- Y axis has a 3.5x multiplier vs X (`y_scale * 3.5`) to compensate for lead screw gearing
- Label alphabet: `"_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?,.#@"` (underscore maps to space)
- 62 characters defined in `vector[63][14]` (including `ß`, `Ä`/`Ö`/`Ü`, smileys, heart)
- PenUp/penDown logic in `plot()`, Bresenham line algo in `line()`

## Gotchas

- No README, no build/test/CI — flash directly to Arduino Uno
- `text` (uppercase char vector index) is ASCII-mapped for extended chars (ä=39, ö=40, ü=41, ß=47, smiley=60, heart=62)
- Leading zeros in vector values are intentionally omitted (comment: "leading zeros cause problems")
- Motors released via `releaseMotors()` after every print cycle (de-energizes coils)
