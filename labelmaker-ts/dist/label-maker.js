import { LabelMakerDriver } from './driver.js';
import { planLines } from './geometry.js';
import { DEFAULT_CALIBRATION } from './types.js';
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export class LabelMaker {
    driver;
    calibration;
    constructor(port = '/dev/ttyUSB0', baud = 9600, calibration) {
        this.driver = new LabelMakerDriver(port, baud);
        this.calibration = { ...DEFAULT_CALIBRATION, ...calibration };
    }
    connect() { return this.driver.connect(); }
    disconnect() { return this.driver.disconnect(); }
    home() { return this.driver.home(); }
    release() { return this.driver.release(); }
    setSpeedX(rpm) { return this.driver.cmd(`SX ${rpm}`).then(() => { }); }
    setSpeedY(rpm) { return this.driver.cmd(`SY ${rpm}`).then(() => { }); }
    printText(text, options) {
        return this.printLines([text], options);
    }
    async printLines(lines, options) {
        const cal = { ...this.calibration, ...options?.calibration };
        const gap = options?.lineGap ?? 200;
        const plan = planLines(lines, cal, 0, gap);
        const lineCount = plan.lines.length;
        const maxX = Math.max(...plan.lines.map(l => l.finalX));
        for (let li = 0; li < plan.lines.length; li++) {
            const linePlan = plan.lines[li];
            options?.onProgress?.({ type: 'line', lineIndex: li, lineCount, text: linePlan.text });
            for (let ci = 0; ci < linePlan.chars.length; ci++) {
                const charPlan = linePlan.chars[ci];
                options?.onProgress?.({ type: 'char', lineIndex: li, charIndex: ci, char: charPlan.char });
                for (const move of charPlan.moves) {
                    if (move.kind === 'dot') {
                        await this.driver.goto(move.x, move.y, false);
                        await this.driver.penDown();
                        await sleep(200);
                        await this.driver.penUp();
                    }
                    else {
                        await this.driver.goto(move.x, move.y, move.draw);
                    }
                }
            }
            // Rewind X between lines so the next line starts at x=0
            if (li < plan.lines.length - 1) {
                await this.driver.goto(0, 0, false);
            }
        }
        // Park past the end of the longest line, pen up
        await this.driver.goto(maxX, 0, false);
        await this.driver.release();
        options?.onProgress?.({ type: 'done' });
    }
}
