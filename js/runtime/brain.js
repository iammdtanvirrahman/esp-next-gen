import { HardwareHAL } from "../hardware/hal.js";

export class BrainRuntime {
    constructor(network, terminal) {
        this.network = network;
        this.terminal = terminal;
        this.running = false;
        this.program = null;
        this.loopPromise = null;
        this.startedAt = 0;
        this.loopIterations = 0;
        this.maxLoopIterations = 100000;
        this.hal = new HardwareHAL(network, terminal);
        this.telemetry = {};
    }

    setTelemetry(data = {}) { this.telemetry = { ...this.telemetry, ...data }; }

    createAPI() {
        const hal = this.hal;
        return {
            pinMode: (pin, mode) => { hal.pinMode(pin, mode); this.emitVirtualState("pinMode"); },
            digitalWrite: (pin, value) => { hal.digitalWrite(pin, value); this.emitVirtualState("digitalWrite"); },
            digitalRead: pin => hal.digitalRead(pin),
            analogWrite: (pin, value) => { hal.analogWrite(pin, value); this.emitVirtualState("analogWrite"); },
            analogRead: pin => hal.analogRead(pin),
            delay: ms => hal.delay(ms),
            delayMicroseconds: us => hal.delayMicroseconds(us),
            millis: () => hal.millis(),
            micros: () => hal.micros(),
            yield: () => hal.yield(),
            constrain: (value, low, high) => Math.min(Math.max(Number(value), Number(low)), Number(high)),
            map: (value, fromLow, fromHigh, toLow, toHigh) => {
                const a = Number(fromLow), b = Number(fromHigh), c = Number(toLow), d = Number(toHigh), x = Number(value);
                return a === b ? c : ((x - a) * (d - c)) / (b - a) + c;
            },
            abs: value => Math.abs(Number(value)),
            min: (...values) => Math.min(...values.map(Number)),
            max: (...values) => Math.max(...values.map(Number)),
            randomSeed: seed => { this.randomSeed = Number(seed) || 1; },
            random: (minOrMax, maybeMax) => {
                this.randomSeed = (1664525 * (this.randomSeed || 1) + 1013904223) >>> 0;
                const unit = this.randomSeed / 4294967296;
                const min = maybeMax === undefined ? 0 : Number(minOrMax);
                const max = maybeMax === undefined ? Number(minOrMax) : Number(maybeMax);
                return max <= min ? min : Math.floor(min + unit * (max - min));
            },
            String: value => String(value), Number: value => Number(value), Boolean: value => Boolean(value),
            serialBegin: async baud => this.terminal.info(`SERIAL begin(${Number(baud)})`),
            serialPrint: async value => this.terminal.write(`SERIAL ${String(value)}`, "info"),
            serialPrintln: async value => this.terminal.write(`SERIAL ${String(value)}`, "info"),
            serialPrintf: async (...args) => this.terminal.write(`SERIAL ${args.map(String).join(" ")}`, "info"),
            telemetry: () => ({ ...this.telemetry }),
            hardwareState: () => ({ ...hal.state() })
        };
    }

    getVirtualState() {
        return {
            pins: halSafe(this.hal.state().pins),
            analog: halSafe(this.hal.state().analog),
            telemetry: { ...this.telemetry },
            uptime: Math.max(0, halSafe(this.hal.millis())),
            loopIterations: this.loopIterations,
            running: this.running
        };
    }

    emitVirtualState(kind) {
        document.dispatchEvent(new CustomEvent("virtual-hardware", { detail: { kind, state: this.getVirtualState() } }));
    }

    async run(compiledProgram) {
        this.stop(false);
        if (!compiledProgram?.ok || typeof compiledProgram.factory !== "function") {
            this.terminal.error("BRAIN cannot run: no valid compiled program.");
            return false;
        }
        this.program = compiledProgram; this.running = true; this.startedAt = performance.now(); this.loopIterations = 0;
        this.hal = new HardwareHAL(this.network, this.terminal);
        this.terminal.success("BRAIN virtual program started");
        this.terminal.info("BRAIN executes generic code on the PC and forwards compatible hardware operations to the selected endpoint");
        this.emitVirtualState("start");
        try {
            const program = await compiledProgram.factory(this.createAPI());
            if (!program?.setup || !program?.loop) throw new Error("Compiled program did not expose setup() and loop().");
            this.terminal.info("BRAIN setup() begin"); await program.setup(); this.terminal.success("BRAIN setup() complete");
            this.loopPromise = this.runLoop(program.loop); await this.loopPromise; return true;
        } catch (error) {
            this.terminal.error(`BRAIN runtime error: ${error.message}`); this.running = false; this.network.stopMotors(); this.emitVirtualState("error"); return false;
        }
    }

    async runLoop(loopFunction) {
        while (this.running) {
            this.loopIterations += 1;
            if (this.loopIterations <= 5 || this.loopIterations % 25 === 0) this.terminal.info(`BRAIN loop() iteration ${this.loopIterations}`);
            if (this.loopIterations > this.maxLoopIterations) throw new Error("Virtual loop safety limit reached.");
            await loopFunction(); await this.hal.yield(); this.emitVirtualState("loop");
        }
    }

    stop(log = true) {
        const wasRunning = this.running; this.running = false; this.program = null; this.loopPromise = null; this.network.stopMotors(); this.emitVirtualState("stop");
        if (log && wasRunning) this.terminal.warning("BRAIN program stopped");
    }
}

function halSafe(value) { return value ?? {}; }
