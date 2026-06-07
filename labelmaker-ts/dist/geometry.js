import { VECTORS, charIndex } from './font.js';
import { DEFAULT_CALIBRATION } from './types.js';
// rx and ry are in physical X-step-equivalent units; rx===ry gives a round circle.
// yGear is applied internally so the caller thinks in physical dimensions.
export function planEllipse(cx, cy, rx, ry, segments = 36, calOverrides) {
    const cal = mergeCalibration(calOverrides);
    const yMax = 4 * cal.yScale * cal.yGear;
    const yExtent = ry * cal.yGear;
    if (cx - rx < 0)
        throw new RangeError(`Ellipse reaches x=${cx - rx} but x must be >= 0`);
    if (Math.round(cy - yExtent) < 0)
        throw new RangeError(`Ellipse reaches y=${Math.round(cy - yExtent)} but y must be >= 0`);
    if (Math.round(cy + yExtent) > Math.round(yMax))
        throw new RangeError(`Ellipse reaches y=${Math.round(cy + yExtent)} but tape height is ${Math.round(yMax)}`);
    const moves = [];
    for (let i = 0; i <= segments; i++) {
        const θ = (2 * Math.PI * i) / segments;
        const x = Math.round(cx + rx * Math.cos(θ));
        const y = Math.round(cy + ry * cal.yGear * Math.sin(θ));
        moves.push({ kind: 'goto', x, y, draw: i > 0 });
    }
    return moves;
}
export function planCircle(cx, cy, r, segments = 36, calOverrides) {
    return planEllipse(cx, cy, r, r, segments, calOverrides);
}
function mergeCalibration(overrides) {
    return { ...DEFAULT_CALIBRATION, ...overrides };
}
function planChar(c, xOrigin, yOrigin, cal) {
    const strokes = VECTORS[charIndex(c)];
    const moves = [];
    let curX = xOrigin;
    let curY = yOrigin;
    for (const v of strokes) {
        if (v === 222) {
            moves.push({ kind: 'dot', x: curX, y: curY });
            continue;
        }
        const draw = v >= 100;
        const coord = draw ? v - 100 : v;
        const cx = Math.floor(coord / 10);
        const cy = coord % 10;
        curX = xOrigin + cx * cal.xScale;
        curY = yOrigin + Math.round(cy * cal.yScale * cal.yGear);
        moves.push({ kind: 'goto', x: curX, y: curY, draw });
    }
    const space = cal.xScale * 5;
    let advance = space;
    if (c === 'I' || c === 'i')
        advance -= (cal.xScale * 4) / 1.1;
    else if (c === ',')
        advance -= (cal.xScale * 4) / 1.2;
    return { moves, advance };
}
export function planText(text, cal, xStart = 0, yOrigin = 0) {
    const space = cal.xScale * 5;
    const chars = [];
    let x = xStart;
    for (const c of text) {
        if (c === ' ') {
            x += space;
            continue;
        }
        const { moves, advance } = planChar(c, x, yOrigin, cal);
        chars.push({ char: c, moves });
        x += advance;
    }
    return { chars, finalX: x };
}
export function planLines(lines, calOverrides, xStart = 0, gap = 200) {
    const cal = mergeCalibration(calOverrides);
    const n = lines.length;
    const totalH = Math.round(4 * cal.yScale * cal.yGear);
    const totalGap = gap * (n - 1);
    const lineH = Math.floor((totalH - totalGap) / n);
    const lineYGear = lineH / (4 * cal.yScale);
    const lineCal = { ...cal, yGear: lineYGear };
    const linePlans = lines.map((text, i) => {
        // Line 0 (first in array) is topmost; y increases downward toward tape edge.
        const yOrigin = (n - 1 - i) * (lineH + gap);
        const { chars, finalX } = planText(text, lineCal, xStart, yOrigin);
        return { text, yOrigin, chars, finalX };
    });
    return { lines: linePlans };
}
