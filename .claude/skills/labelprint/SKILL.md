---
name: labelprint
description: >
  Print text on the physical label maker. Invoke whenever the user wants to print
  something on the label maker, whether they say "/labelprint", "print X on the label maker",
  "label this", "print me a label saying X", or just "print X" in the context of the label
  maker project. Always use this skill rather than constructing the node command manually.
---

# Label Printer

Prints text on the physical label maker via the TypeScript driver at
`/media/karim/Code-Drive/karimn-code/label maker/.claude/worktrees/hershey-fonts/labelmaker-ts/`.

## Parsing the request

Extract from the user's message:
- **Lines**: each quoted string or comma-separated phrase = one line (multiple lines stack vertically on the tape)
- **Font**: named font if mentioned; default is `futural`
- **Port**: default `/dev/ttyUSB0` unless the user says otherwise

## Running the print

Always use `node` (not `bun`) — the serialport library requires it.

```bash
cd "/media/karim/Code-Drive/karimn-code/label maker/.claude/worktrees/hershey-fonts/labelmaker-ts"
node dist/print.js [--font <name>] "Line 1" ["Line 2" ...]
```

Run with a 120-second timeout — long text or multi-line prints take time.

If the command errors with "READY timeout" or port issues, tell the user to check that the Arduino is connected via USB and try again.

## Available fonts

| Font | Style |
|---|---|
| `gothiceng` | Gothic/blackletter — decorative, good for names |
| `futural` | Clean sans-serif |
| `scripts` | Cursive/script |
| `timesi` | Serif italic |
| `timesr` | Serif roman |
| `cursive` | Casual cursive |

Full list: astrology, cursive, cyrillic, futural, futuram, gothiceng, gothicger, gothicita, greek, japanese, markers, mathlow, mathupp, meteorology, music, scriptc, scripts, symbolic, timesg, timesi, timesib, timesr, timesrb

## Examples

```
/labelprint Marcella
→ node dist/print.js --font futural "Marcella"

/labelprint "Good morning" "Sofyan" --font gothiceng
→ node dist/print.js --font gothiceng "Good morning" "Sofyan"

/labelprint HELLO WORLD (builtin font, uppercase)
→ node dist/print.js --font futural "HELLO WORLD"
```

## After printing

Report what printed and which font was used. If the user wants to run again or adjust, just re-run the command — no need to reconnect.
