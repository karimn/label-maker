import { builtinFont } from './font.js';
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
function planChar(c, xOrigin, yOrigin, cal, font) {
    const { strokes, advance: advanceUnits } = font.glyph(c);
    const moves = [];
    for (const stroke of strokes) {
        if (stroke.length === 1) {
            // Single-point stroke = dot
            const px = xOrigin + Math.round(stroke[0].x * cal.xScale);
            const py = yOrigin + Math.round(stroke[0].y * cal.yScale * cal.yGear);
            moves.push({ kind: 'dot', x: px, y: py });
            continue;
        }
        for (let i = 0; i < stroke.length; i++) {
            const px = xOrigin + Math.round(stroke[i].x * cal.xScale);
            const py = yOrigin + Math.round(stroke[i].y * cal.yScale * cal.yGear);
            moves.push({ kind: 'goto', x: px, y: py, draw: i > 0 });
        }
    }
    return { moves, advance: Math.round(advanceUnits * cal.xScale) };
}
export function planText(text, cal, xStart = 0, yOrigin = 0, font = builtinFont()) {
    const space = Math.round(font.spaceAdvance * cal.xScale);
    const chars = [];
    let x = xStart;
    for (const c of text) {
        if (c === ' ') {
            x += space;
            continue;
        }
        const { moves, advance } = planChar(c, x, yOrigin, cal, font);
        chars.push({ char: c, moves });
        x += advance;
    }
    return { chars, finalX: x };
}
export function planLines(lines, calOverrides, xStart = 0, gap = 200, font = builtinFont()) {
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
        const { chars, finalX } = planText(text, lineCal, xStart, yOrigin, font);
        return { text, yOrigin, chars, finalX };
    });
    return { lines: linePlans };
}
