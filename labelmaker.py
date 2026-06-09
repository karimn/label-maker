"""Computer-side driver for the minimal CrunchLabs Label Maker firmware.

The firmware (CrunchLabsLabelMaker.ino) is a thin layer: it only knows how to
move to absolute step positions. ALL geometry / scaling / font rendering lives
here on the computer side. This is the foundation for a future UI layer.

Serial protocol (one command per line, each replies "OK" / "ERR"):
    G <x> <y> <draw>   absolute move in motor steps; draw=1 lowers the pen
    PU / PD            pen up / pen down
    H                  home Y axis, reset position to 0,0
    R                  release motor coils
    SX <rpm> / SY <rpm>  set stepper speed
"""

import time
import serial

PORT = "/dev/ttyUSB0"
BAUD = 9600

# --- Calibration ----------------------------------------------------------
# Steps the firmware moves per character-grid unit (grid coords run 0..4).
# Y_GEAR compensates for the Y lead screw covering less distance per step than
# the X drive wheel. The stock firmware assumed 3.5; we are verifying that.
X_SCALE = 131  # calibrated: 230 gave 0.875w vs 0.5h; 230*(0.5/0.875)=131 -> square
Y_SCALE = 230
Y_GEAR = 3.501  # ~1.125in tall (4*230*3.501=3221 steps @ 0.00035in/step); 0.5in wide


class LabelMaker:
    def __init__(self, port=PORT, baud=BAUD):
        # timeout generous enough to cover the ~7s Y-homing in setup()
        self.ser = serial.Serial(port, baud, timeout=20)
        self._wait_ready()

    def _wait_ready(self):
        print("Waiting for READY...")
        while True:
            line = self.ser.readline().decode(errors="replace").strip()
            if line:
                print(f"  << {line!r}")
            if line == "READY":
                return

    def cmd(self, text, echo=True):
        if echo:
            print(f"  >> {text}")
        self.ser.write((text + "\n").encode())
        resp = self.ser.readline().decode(errors="replace").strip()
        if echo:
            print(f"  << {resp}")
        return resp

    def goto(self, x, y, draw):
        return self.cmd(f"G {int(round(x))} {int(round(y))} {int(draw)}")

    def release(self):
        return self.cmd("R")

    def close(self):
        self.ser.close()


def calibration_box(lm, grid_w=4, grid_h=4):
    """Draw a rectangle that SHOULD be physically square if calibration is
    correct. Measure the printed width and height to find the real ratio."""
    w = grid_w * X_SCALE
    h = grid_h * Y_SCALE * Y_GEAR
    print(f"\nCalibration box: {w} x {h} steps (intended square)")
    lm.goto(0, 0, 0)      # pen up to origin
    lm.goto(w, 0, 1)      # bottom edge
    lm.goto(w, h, 1)      # right edge
    lm.goto(0, h, 1)      # top edge
    lm.goto(0, 0, 1)      # left edge back to origin
    lm.release()


# --- Font -----------------------------------------------------------------
# Ported from CrunchLabsSketch-level-3-stock.ino vector[63][14].
# Each entry encodes one move on a 0..4 grid:
#   value >= 100 -> pen down (draw); subtract 100 for the coord
#   tens digit   -> x coord (0..4)
#   ones digit   -> y coord (0..4)
#   222          -> plot a single dot at the current position
# (trailing 200 sentinels from the C array are simply omitted here)
VECTORS = [
    [0, 124, 140, 32, 112],                                   # 0  A
    [0, 104, 134, 132, 2, 142, 140, 100],                     # 1  B
    [41, 130, 110, 101, 103, 114, 134, 143],                  # 2  C
    [0, 104, 134, 143, 141, 130, 100],                        # 3  D
    [40, 100, 104, 144, 22, 102],                             # 4  E
    [0, 104, 144, 22, 102],                                   # 5  F
    [44, 104, 100, 140, 142, 122],                            # 6  G
    [0, 104, 2, 142, 44, 140],                                # 7  H
    [0, 104],                                                 # 8  I
    [1, 110, 130, 141, 144],                                  # 9  J
    [0, 104, 2, 142, 140, 22, 144],                           # 10 K
    [40, 100, 104],                                           # 11 L
    [0, 104, 122, 144, 140],                                  # 12 M
    [0, 104, 140, 144],                                       # 13 N
    [10, 101, 103, 114, 134, 143, 141, 130, 110],             # 14 O
    [0, 104, 144, 142, 102],                                  # 15 P
    [0, 104, 144, 142, 120, 100, 22, 140],                    # 16 Q
    [0, 104, 144, 142, 102, 22, 140],                         # 17 R
    [0, 140, 142, 102, 104, 144],                             # 18 S
    [20, 124, 4, 144],                                        # 19 T
    [4, 101, 110, 130, 141, 144],                             # 20 U
    [4, 120, 144],                                            # 21 V
    [4, 100, 122, 140, 144],                                  # 22 W
    [0, 144, 4, 140],                                         # 23 X
    [4, 122, 144, 22, 120],                                   # 24 Y
    [4, 144, 100, 140],                                       # 25 Z
    [0, 104, 144, 140, 100, 144],                             # 26 0
    [0, 140, 20, 124, 104],                                   # 27 1
    [4, 144, 142, 102, 100, 140],                             # 28 2
    [0, 140, 144, 104, 12, 142],                              # 29 3
    [20, 123, 42, 102, 104],                                  # 30 4
    [0, 140, 142, 102, 104, 144],                             # 31 5
    [2, 142, 140, 100, 104, 144],                             # 32 6
    [0, 144, 104, 12, 132],                                   # 33 7
    [0, 140, 144, 104, 100, 2, 142],                          # 34 8
    [0, 140, 144, 104, 102, 142],                             # 35 9
    [],                                                       # 36 (space)
    [],                                                       # 37 (space)
    [0, 144],                                                 # 38 /
    [0, 102, 124, 142, 140, 42, 102, 4, 103, 44, 143],        # 39 Ä
    [0, 102, 142, 140, 100, 2, 14, 113, 34, 133],             # 40 Ö
    [4, 100, 140, 144, 14, 113, 34, 133],                     # 41 Ü
    [0, 111],                                                 # 42 ,
    [2, 142],                                                 # 43 -
    [0, 222],                                                 # 44 .
    [0, 222, 1, 104],                                         # 45 !
    [20, 222, 21, 122, 142, 144, 104],                        # 46 ?
    [0, 104, 134, 133, 122, 142, 140, 110],                   # 47 ß
    [23, 124],                                                # 48 '
    [42, 120, 100, 101, 123, 124, 104, 103, 130, 140],        # 49 &
    [2, 142, 20, 124],                                        # 50 +
    [21, 222, 23, 222],                                       # 51 :
    [10, 121, 22, 222],                                       # 52 ;
    [14, 113, 33, 134],                                       # 53 "
    [10, 114, 34, 130, 41, 101, 3, 143],                      # 54 #
    [34, 124, 120, 130],                                      # 55 (
    [10, 120, 124, 114],                                      # 56 )
    [1, 141, 43, 103],                                        # 57 =
    [31, 133, 113, 111, 141, 144, 104, 100, 140],             # 58 @
    [2, 142, 20, 124, 4, 140, 0, 144],                        # 59 *
    [0, 140, 144, 104, 100, 12, 113, 33, 132, 31, 111],       # 60 } smiley
    [0, 140, 144, 104, 100, 13, 222, 33, 222, 32, 131, 111, 112, 132],  # 61 ~ open smiley
    [20, 142, 143, 134, 123, 114, 103, 102, 120],             # 62 $ heart
]

SPACE = X_SCALE * 5  # advance between character origins (matches stock firmware)


def char_index(c):
    """Map an ASCII character to its VECTORS index (mirrors plotCharacter)."""
    o = ord(c)
    if 65 <= o <= 90:      # A..Z
        return o - 65
    if 97 <= o <= 122:     # a..z
        return o - 97
    if 48 <= o <= 57:      # 0..9
        return o - 22
    return {
        ord(','): 42, ord('-'): 43, ord('.'): 44, ord('!'): 45, ord('?'): 46,
        ord('{'): 47, ord("'"): 48, ord('&'): 49, ord('+'): 50, ord(':'): 51,
        ord(';'): 52, ord('"'): 53, ord('#'): 54, ord('('): 55, ord(')'): 56,
        ord('='): 57, ord('@'): 58, ord('*'): 59, ord('}'): 60, ord('~'): 61,
        ord('$'): 62,
    }.get(o, 38)           # default: '/' for anything unknown


def plot_dot(lm, x, y):
    """Synthesize the firmware's '222' plot-point: the minimal firmware has no
    dot command, so we move there pen-up, tap the pen down, dwell, lift."""
    lm.goto(x, y, 0)
    lm.cmd("PD", echo=False)
    time.sleep(0.2)        # let the servo travel + leave a mark
    lm.cmd("PU", echo=False)


def plot_char(lm, c, x_origin, y_origin=0, y_gear=None):
    """Render one character at the given step origin. Returns x advance."""
    if y_gear is None:
        y_gear = Y_GEAR
    idx = char_index(c)
    strokes = VECTORS[idx]
    cur_x, cur_y = x_origin, y_origin
    for v in strokes:
        if v == 222:
            plot_dot(lm, cur_x, cur_y)
            continue
        draw = 1 if v >= 100 else 0
        if draw:
            v -= 100
        cx, cy = divmod(v, 10)
        cur_x = x_origin + cx * X_SCALE
        cur_y = y_origin + round(cy * Y_SCALE * y_gear)
        lm.goto(cur_x, cur_y, draw)
    # advance, with the stock firmware's per-character kerning tweaks
    adv = SPACE
    if c in ("I", "i"):
        adv -= (X_SCALE * 4) / 1.1
    elif c == ",":
        adv -= (X_SCALE * 4) / 1.2
    return adv


def plot_text(lm, text, x_start=0, y_origin=0, y_gear=None):
    print(f"\nPlotting {text!r}")
    x = x_start
    for c in text:
        if c == " ":
            x += SPACE
            continue
        print(f"  char {c!r}")
        x += plot_char(lm, c, x, y_origin, y_gear=y_gear)
    return x  # return final x so callers can park or chain lines


def plot_lines(lm, lines, x_start=0, gap=200):
    """Print multiple lines stacked vertically on the same tape section.
    Each line gets an equal share of the full height minus inter-line gaps.
    Lines are ordered top-to-bottom. X rewinds between lines; park is at
    the end of the longest line.

    gap: Y-step gap between adjacent lines (default ~0.04 in).
    """
    n = len(lines)
    total_h = round(4 * Y_SCALE * Y_GEAR)
    total_gap = gap * (n - 1)
    line_h = (total_h - total_gap) // n
    line_y_gear = line_h / (4 * Y_SCALE)
    max_x = x_start

    for i, text in enumerate(lines):
        # Bottom line starts at 0; each line above is offset by line_h + gap
        y_origin = (n - 1 - i) * (line_h + gap)
        print(f"\nLine {i + 1}/{n}: {text!r}  (y_origin={y_origin}, line_h={line_h})")
        x = plot_text(lm, text, x_start=x_start, y_origin=y_origin, y_gear=line_y_gear)
        max_x = max(max_x, x)
        if i < n - 1:
            lm.goto(x_start, 0, 0)  # rewind X for next line

    lm.goto(max_x, 0, 0)  # park past the longest line
    lm.release()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        lm = LabelMaker()
        plot_text(lm, sys.argv[1])
        lm.goto(0, 0, 0)
        lm.release()
    else:
        lm = LabelMaker()
        plot_lines(lm, ["HAPPY BIRTHDAY,", "KALINDA!"])
    lm.close()
    print("Done.")
