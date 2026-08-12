/* Universal Hardware IDE - Generic Web Serial transport */
export class SerialTransport {
    constructor(terminal) {
        this.terminal = terminal;
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.decoder = new TextDecoder();
        this.encoder = new TextEncoder();
        this.running = false;
        this.listeners = [];
        this.baudRate = 115200;
    }

    supported() {
        return typeof navigator !== "undefined" && "serial" in navigator;
    }

    onMessage(callback) {
        if (typeof callback === "function") this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(item => item !== callback); };
    }

    emit(data) {
        this.listeners.forEach(callback => {
            try { callback(data); } catch (error) { this.terminal?.warning?.(`Serial listener error: ${error.message}`); }
        });
    }

    async connect({ baudRate = 115200 } = {}) {
        if (!this.supported()) throw new Error("Web Serial is not supported by this browser.");
        this.baudRate = Number(baudRate) || 115200;
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: this.baudRate });
        this.running = true;
        this.terminal?.success?.(`SERIAL connected @ ${this.baudRate}`);
        this.readLoop();
        return this.port;
    }

    async readLoop() {
        if (!this.port?.readable) return;
        while (this.running && this.port?.readable) {
            this.reader = this.port.readable.getReader();
            try {
                while (this.running) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    if (value) this.emit(this.decoder.decode(value, { stream: true }));
                }
            } catch (error) {
                if (this.running) this.terminal?.error?.(`SERIAL read error: ${error.message}`);
            } finally {
                try { this.reader.releaseLock(); } catch {}
                this.reader = null;
            }
        }
    }

    async send(data) {
        if (!this.writer && this.port?.writable) this.writer = this.port.writable.getWriter();
        if (!this.writer) throw new Error("Serial device is not connected.");
        await this.writer.write(this.encoder.encode(String(data)));
    }

    async disconnect() {
        this.running = false;
        try { await this.reader?.cancel(); } catch {}
        try { this.reader?.releaseLock(); } catch {}
        try { this.writer?.releaseLock(); } catch {}
        this.reader = null;
        this.writer = null;
        try { await this.port?.close(); } catch {}
        this.port = null;
        this.terminal?.info?.("SERIAL disconnected");
    }
}
