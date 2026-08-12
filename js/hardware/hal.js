export class HardwareHAL {
    constructor(network, terminal) {
        this.network = network;
        this.terminal = terminal;
        this.pins = new Map();
        this.analog = new Map();
        this.startedAt = performance.now();
    }

    pinMode(pin, mode) {
        const p = Number(pin);
        this.pins.set(p, { mode: String(mode), value: this.pins.get(p)?.value ?? 0 });
        this.terminal.info(`HAL pinMode(${p}, ${mode})`);
        this.network.sendJSON({ type: "pinMode", pin: p, mode: String(mode) });
    }

    digitalWrite(pin, value) {
        const p = Number(pin); const v = Boolean(value);
        this.pins.set(p, { ...(this.pins.get(p) || {}), value: v, mode: this.pins.get(p)?.mode || "OUTPUT" });
        this.terminal.info(`HAL digitalWrite(${p}, ${v ? "HIGH" : "LOW"})`);
        this.network.digitalWrite(p, v);
    }

    digitalRead(pin) {
        const p = Number(pin); const value = this.pins.get(p)?.value ?? false;
        this.terminal.info(`HAL digitalRead(${p}) -> ${value ? 1 : 0}`);
        return value ? 1 : 0;
    }

    analogWrite(pin, value) {
        const p = Number(pin); const v = Math.max(0, Math.min(255, Number(value) || 0));
        this.analog.set(p, v);
        this.terminal.info(`HAL analogWrite(${p}, ${v})`);
        this.network.analogWrite(p, v);
    }

    analogRead(pin) {
        const value = this.analog.get(Number(pin)) ?? 0;
        this.terminal.info(`HAL analogRead(${Number(pin)}) -> ${value}`);
        return value;
    }

    delay(ms) { return new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(60000, Number(ms) || 0)))); }
    delayMicroseconds(us) { const start = performance.now(); const limit = Math.min(Math.max(0, Number(us) || 0) / 1000, 5); while (performance.now() - start < limit) {} }
    millis() { return Math.floor(performance.now() - this.startedAt); }
    micros() { return Math.floor((performance.now() - this.startedAt) * 1000); }
    yield() { return new Promise(resolve => setTimeout(resolve, 0)); }

    state() {
        return {
            pins: Object.fromEntries(this.pins.entries()),
            analog: Object.fromEntries(this.analog.entries())
        };
    }
}
