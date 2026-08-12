/*
 * ESP Next Gen - PC Brain Runtime
 * Executes the virtual Arduino program on the laptop and mirrors compatible
 * hardware actions to ESP32.
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
        this.loopIterations = 0;
    }

    setTelemetry(data = {}) {
        this.telemetry = { ...this.telemetry, ...data };
    }

    createAPI() {
        return {
            pinMode: async (pin, mode) => {
                const p = Number(pin);
                this.virtualPins.set(p, {
                    mode: String(mode),
                    value: this.virtualPins.get(p)?.value ?? false
                });
                this.terminal.info(`BRAIN  pinMode(${p}, ${mode})`);
                this.network.sendJSON({ type: "pinMode", pin: p, mode: String(mode) });
            },

            digitalWrite: async (pin, state) => {
                const p = Number(pin);
                const value = Boolean(state);
                this.virtualPins.set(p, {
                    ...this.virtualPins.get(p),
                    value,
                    mode: this.virtualPins.get(p)?.mode || "OUTPUT"
                });
                this.terminal.info(`BRAIN  digitalWrite(${p}, ${value ? "HIGH" : "LOW"}) → servant`);
                this.network.digitalWrite(p, value);
            },

            digitalRead: async pin => {
                const p = Number(pin);
                const value = this.virtualPins.get(p)?.value ?? false;
                this.terminal.info(`BRAIN  digitalRead(${p}) -> ${value ? "HIGH" : "LOW"}`);
                return value ? 1 : 0;
            },

            analogWrite: async (pin, value) => {
                const p = Number(pin);
                const numeric = Math.max(0, Math.min(255, Number(value) || 0));
                this.virtualAnalog.set(p, numeric);
                this.terminal.info(`BRAIN  analogWrite(${p}, ${numeric}) → servant`);
                this.network.analogWrite(p, numeric);
            },

            analogRead: async pin => {
                const p = Number(pin);
                const value = this.virtualAnalog.get(p) ?? 0;
                this.terminal.info(`BRAIN  analogRead(${p}) -> ${value}`);
                return value;
            },

            servo: async (pin, angle) => {
                const numeric = Math.max(0, Math.min(180, Number(angle) || 0));
                this.terminal.info(`BRAIN  servo(${pin}, ${numeric}) → servant`);
                this.network.servo(Number(pin), numeric);
            },

            move: async (direction, speed = 0) => {
                const numeric = Math.max(0, Math.min(255, Number(speed) || 0));
                this.terminal.info(`BRAIN  move(${direction}, ${numeric}) → servant`);
                this.network.sendMove(String(direction), numeric);
            },

            stop: async () => {
                this.terminal.info("BRAIN  stop() → servant");
                this.network.stopMotors();
            },

            delay: async ms => {
                const duration = Math.max(0, Math.min(60000, Number(ms) || 0));
                this.terminal.info(`BRAIN  delay(${duration}ms)`);
                await new Promise(resolve => setTimeout(resolve, duration));
            },

            delayMicroseconds: us => {
                const duration = Math.max(0, Math.min(50000, Number(us) || 0));
                if (duration <= 0) return;
                const started = performance.now();
                const maxMs = Math.min(duration / 1000, 5);
                while (performance.now() - started < maxMs) {
                    // Intentional tiny virtual busy wait.
                }
            },

            yield: async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            },

            millis: () => Math.max(0, Math.floor(performance.now() - this.startedAt)),
            micros: () => Math.max(0, Math.floor((performance.now() - this.startedAt) * 1000)),

            constrain: (value, low, high) => {
                const n = Number(value);
                return Math.min(Math.max(n, Number(low)), Number(high));
            },

            map: (value, fromLow, fromHigh, toLow, toHigh) => {
                const x = Number(value);
                const a = Number(fromLow);
                const b = Number(fromHigh);
                const c = Number(toLow);
                const d = Number(toHigh);
                if (b === a) return c;
                return ((x - a) * (d - c)) / (b - a) + c;
            },

            abs: value => Math.abs(Number(value)),
            min: (...values) => Math.min(...values.map(Number)),
            max: (...values) => Math.max(...values.map(Number)),

            randomSeed: seed => {
                this.randomSeedValue = Number(seed) || 1;
                this.terminal.info(`BRAIN  randomSeed(${this.randomSeedValue})`);
            },

            random: (minOrMax, maybeMax) => {
                let min = 0;
                let max = Number(minOrMax);
                if (maybeMax !== undefined) {
                    min = Number(minOrMax);
                    max = Number(maybeMax);
                }
                if (!Number.isFinite(min)) min = 0;
                if (!Number.isFinite(max)) max = 1;
                if (max <= min) return min;
                this.randomSeedValue = (1664525 * this.randomSeedValue + 1013904223) >>> 0;
                const unit = this.randomSeedValue / 4294967296;
                return Math.floor(min + unit * (max - min));
            },

            String: value => String(value),
            Number: value => Number(value),
            Boolean: value => Boolean(value),

            serialBegin: async baud => {
                this.terminal.info(`SERIAL  begin(${Number(baud)})`);
            },

            serialPrint: async value => {
                this.terminal.write(`SERIAL  ${String(value)}`, "info");
            },

            serialPrintln: async value => {
                this.terminal.write(`SERIAL  ${String(value)}`, "info");
            },

            serialPrintf: async (...args) => {
                this.terminal.write(`SERIAL  ${args.map(String).join(" ")}`, "info");
            },

            distanceCm: () => {
                const value = Number(this.telemetry.distance);
                this.terminal.info(`SENSOR  distanceCm() -> ${Number.isFinite(value) ? value : -1}`);
                return Number.isFinite(value) ? value : -1;
            },

            obstacleDetected: () => {
                const value = Boolean(this.telemetry.obstacle);
                this.terminal.info(`SENSOR  obstacleDetected() -> ${value ? "true" : "false"}`);
                return value;
            },

            fineAmount: () => {
                const value = Number(this.telemetry.fine) || 0;
                this.terminal.info(`SENSOR  fineAmount() -> $${value}`);
                return value;
            },

            telemetry: () => ({ ...this.telemetry })
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
        this.loopIterations = 0;
        this.virtualPins.clear();
        this.virtualAnalog.clear();

        this.terminal.success("BRAIN  virtual program started");
        this.terminal.info("BRAIN  compatible code executes on the PC; hardware actions mirror to ESP32");

        try {
            const api = this.createAPI();
            const program = await compiledProgram.factory(api);

            if (!program?.setup || !program?.loop) {
                throw new Error("Compiled program did not expose setup() and loop().");
            }

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
        while (this.running) {
            this.loopIterations += 1;

            if (this.loopIterations <= 5 || this.loopIterations % 25 === 0) {
                this.terminal.info(`BRAIN  loop() iteration ${this.loopIterations}`);
            }

            await loopFunction();

            // Prevent a zero-delay infinite loop from freezing the UI.
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    stop(log = true) {
        const wasRunning = this.running;
        this.running = false;
        this.program = null;
        this.loopPromise = null;
        this.network.stopMotors();
        if (log && wasRunning) {
            this.terminal.warning("BRAIN  program stopped; motors stopped");
        }
    }
}
