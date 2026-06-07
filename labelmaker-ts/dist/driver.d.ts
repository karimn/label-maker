export declare class LabelMakerDriver {
    private port;
    private parser;
    private queue;
    constructor(portPath?: string, baud?: number);
    connect(): Promise<void>;
    private waitReady;
    cmd(text: string): Promise<string>;
    private _sendCmd;
    goto(x: number, y: number, draw: boolean): Promise<void>;
    penDown(): Promise<void>;
    penUp(): Promise<void>;
    home(): Promise<void>;
    release(): Promise<void>;
    disconnect(): Promise<void>;
}
