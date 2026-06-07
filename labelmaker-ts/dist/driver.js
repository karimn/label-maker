import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
const READY_TIMEOUT_MS = 20_000;
const CMD_TIMEOUT_MS = 30_000;
export class LabelMakerDriver {
    port;
    parser;
    queue = Promise.resolve();
    constructor(portPath = '/dev/ttyUSB0', baud = 9600) {
        this.port = new SerialPort({ path: portPath, baudRate: baud, autoOpen: false });
        this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));
    }
    async connect() {
        await new Promise((resolve, reject) => {
            this.port.open(err => (err ? reject(err) : resolve()));
        });
        await this.waitReady();
    }
    waitReady() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.parser.off('data', handler);
                reject(new Error(`Timed out waiting for READY after ${READY_TIMEOUT_MS}ms`));
            }, READY_TIMEOUT_MS);
            const handler = (line) => {
                if (line.trim() === 'READY') {
                    clearTimeout(timer);
                    this.parser.off('data', handler);
                    resolve();
                }
            };
            this.parser.on('data', handler);
        });
    }
    async cmd(text) {
        const result = this.queue.then(() => this._sendCmd(text));
        this.queue = result.catch(() => { });
        return result;
    }
    _sendCmd(text) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.parser.off('data', handler);
                reject(new Error(`Timeout waiting for response to: ${text}`));
            }, CMD_TIMEOUT_MS);
            const handler = (line) => {
                clearTimeout(timer);
                this.parser.off('data', handler);
                const resp = line.trim();
                if (resp === 'ERR')
                    reject(new Error(`Command failed: ${text}`));
                else
                    resolve(resp);
            };
            this.parser.on('data', handler);
            this.port.write(text + '\n', err => {
                if (err) {
                    clearTimeout(timer);
                    this.parser.off('data', handler);
                    reject(err);
                }
            });
        });
    }
    async goto(x, y, draw) {
        await this.cmd(`G ${Math.round(x)} ${Math.round(y)} ${draw ? 1 : 0}`);
    }
    async penDown() { await this.cmd('PD'); }
    async penUp() { await this.cmd('PU'); }
    async home() { await this.cmd('H'); }
    async release() { await this.cmd('R'); }
    async disconnect() {
        await new Promise((resolve, reject) => {
            this.port.close(err => (err ? reject(err) : resolve()));
        });
    }
}
