/*
 * ESP Next Gen - PC Brain Runtime
 *
 * Executes the virtual Arduino program on the laptop and mirrors hardware
 * actions to the connected ESP32. The PC remains the program brain.
 */
export class BrainRuntime {
    constructor(network, terminal) {
        this.network = network;
        this.terminal = terminal;
        this.running = false;
        this.program = null;
        this.loopPromise = null;
        this.startedAt = 0;
        this.virtualPins = new Map();
        this.virtualAnalog = new Map();
        this.telemetry = { distance: -1, obstacle: false, fine: 0, speed: 0 };
        this.randomSeedValue = Date.now();
    }

    setTelemetry(data = {}) {
        this.telemetry = { ...this.telemetry, ...data };
    }

    createAPI() {
        return {
            pinMode: async (pin, mode) => {
                this.virtualPins.set(Number(pin), { mode, value: this.virtualPins.get(Number(pin))?.value ?? false });
                this.terminal.info(`BRAIN  pinMode(${pin}, ${mode})`);
                this.network.sendJSON({ type: "pinMode", pin: Number(pin), mode });
            },
            digitalWrite: async (pin, state) => {
                this.virtualPins.set(Number(pin), { ...this.virtualPins.get(Number(pin)), value: Boolean(state) });
                this.terminal.info(`BRAIN  digitalWrite(${pin}, ${state ? "HIGH" : "LOW"})`);
                this.network.digitalWrite(pin, state);
            },
            analogWrite: async (pin, value) => {
                const numeric = Math.max(0, Math.min(255, Number(value) || 0));
                this.virtualAnalog.set(Number(pin), numeric);
                this.terminal.info(`BRAIN  analogWrite(${pin}, ${numeric})`);
                this.network.analogWrite(pin, numeric);
            },
            digitalRead: async pin => {
                const value = this.virtualPins.get(Number(pin))?.value ?? false;
                this.terminal.info(`BRAIN  digitalRead(${pin}) -> ${value ? "HIGH" : "LOW"}`);
                return value ? 1 : 0;
            },
            analogRead: async pin => {
                const value = this.virtualAnalog.get(Number(pin)) ?? 0;
                this.terminal.info(`BRAIN  analogRead(${pin}) -> ${value}`);
                return value;
            },
            servo: async (pin, angle) => {
                const numeric = Math.max(0, Math.min(180, Number(angle) || 0));
                this.terminal.info(`BRAIN  servo(${pin}, ${numeric})`);
                this.network.servo(pin, numeric);
            },
            move: async (direction, speed = 0) => {
                const numeric = Math.max(0, Math.min(255, Number(speed) || 0));
                this.terminal.info(`BRAIN  move(${direction}, ${numeric})`);
                this.network.sendMove(direction, numeric);
            },
            stop: async () => {
                this.terminal.info("BRAIN  stop()");
                this.network.stopMotors();
            },
            delay: async ms => {
                const duration = Math.max(0, Math.min(60000, Number(ms) || 0));
                this.terminal.info(`BRAIN  delay(${duration}ms)`);
                await new Promise(resolve => setTimeout(resolve, duration));
            },
            delayMicroseconds: us => {
                const duration = Math.max(0, Math.min(50, Number(us) || 0));
                const started = performance.now();
                while (performance.now() - started < duration / 1000) {}
            },
            millis: () => Math.max(0, Math.floor(performance.now() - this.startedAt)),
            micros: () => Math.max(0, Math.floor((performance.now() - this.startedAt) * 1000)),
            constrain: (value, low, high) => Math.min(Number(high), Math.max(Number(low), Number(value))),
            map: (value, fromLow, fromHigh, toLow, toHigh) => {
                const input = Number(value);
                const denominator = Number(fromHigh) - Number(fromLow);
                if (denominator === 0) return Number(toLow);
                return (input - Number(fromLow)) * (Number(toHigh) - Number(toLow)) / denominator + Number(toLow);
            },
            abs: value => Math.abs(Number(value)),
            min: (...values) => Math.min(...values.map(Number)),
            max: (...values) => Math.max(...values.map(Number)),
            randomSeed: seed => {
                this.randomSeedValue = Number(seed) || 1;
            },
            random: (min, max) => {
                this.randomSeedValue = (this.randomSeedValue * 1664525 + 1013904223) >>> 0;
                const value = this.randomSeedValue / 4294967296;
                if (max === undefined) return Math.floor(value * Number(min));
                return Math.floor(value * (Number(max) - Number(min))) + Number(min);
            },
            yield: async () => new Promise(resolve => setTimeout(resolve, 0)),
            serialBegin: async baud => this.terminal.info(`SERIAL  begin(${baud})`),
            serialPrint: async value => this.terminal.write(`SERIAL  ${String(value)}`, "info"),
            serialPrintln: async value => this.terminal.write(`SERIAL  ${String(value)}`, "info"),
            serialPrintf: async (...args) => this.terminal.write(`SERIAL  ${args.map(String).join(" ")}`, "info"),
            telemetry: () => ({ ...this.telemetry }),
            distanceCm: () => Number(this.telemetry.distance ?? -1),
            obstacleDetected: () => Boolean(this.telemetry.obstacle),
            fineAmount: () => Number(this.telemetry.fine ?? 0)
        };
    }

    async run(compiledProgram) {
        this.stop(false);
        if (!compiledProgram?.ok || typeof compiledProgram.factory !== "function") {
            this.terminal.error("BRAIN  cannot run: no valid compiled program.");
            return false;
        }

        this.program = compiledProgram;
        this.running = true;
        this.startedAt = performance.now();
        this.terminal.success("BRAIN  virtual program started");
        this.terminal.info("BRAIN  all compatible code executes on the PC; hardware actions mirror to ESP32");

        try {
            const api = this.createAPI();
            const program = await compiledProgram.factory(api);
            if (!program?.setup || !program?.loop) throw new Error("Compiled program did not expose setup() and loop().");

            this.terminal.info("BRAIN  setup() begin");
            await program.setup();
            this.terminal.success("BRAIN  setup() complete");

            this.loopPromise = this.runLoop(program.loop);
            await this.loopPromise;
            return true;
        } catch (error) {
            this.terminal.error(`BRAIN  runtime error: ${error.message}`);
            this.running = false;
            this.network.stopMotors();
            return false;
        }
    }

    async runLoop(loopFunction) {
        let iterations = 0;
        while (this.running) {
            iterations += 1;
            if (iterations <= 5 || iterations % 25 === 0) this.terminal.info(`BRAIN  loop() iteration ${iterations}`);
            await loopFunction();
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    stop(log = true) {
        const wasRunning = this.running;
        this.running = false;
        this.program = null;
        this.loopPromise = null;
        this.network.stopMotors();
        if (log && wasRunning) this.terminal.warning("BRAIN  program stopped; motors stopped");
    }
}
