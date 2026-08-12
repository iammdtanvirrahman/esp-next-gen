/**
 * ESP Next Gen - PC Brain Runtime
 * Executes compiled virtual instructions locally and forwards hardware commands to ESP32.
 */
export class BrainRuntime {
    constructor(network, terminal) {
        this.network = network;
        this.terminal = terminal;
        this.running = false;
        this.program = null;
        this.loopTimer = null;
    }

    async run(program) {
        this.stop();
        this.program = program;
        this.running = true;

        this.terminal.success("PC Brain: program started");
        await this.executePhase("setup");

        if (!this.running) return;
        this.loopTimer = setInterval(() => {
            this.executePhase("loop").catch(error => this.terminal.error(error.message));
        }, 1000);
    }

    async executePhase(phase) {
        if (!this.running || !this.program) return;
        const instructions = this.program.instructions.filter(item => item.phase === phase);

        for (const instruction of instructions) {
            if (!this.running) return;
            await this.executeInstruction(instruction);
        }
    }

    async executeInstruction(i) {
        switch (i.op) {
            case "pinMode":
                this.terminal.info(`Brain → pinMode(${i.pin}, ${i.mode})`);
                this.network.sendJSON({ type: "pinMode", pin: i.pin, mode: i.mode });
                break;
            case "digitalWrite":
                this.terminal.info(`Brain → digitalWrite(${i.pin}, ${i.state ? "HIGH" : "LOW"})`);
                this.network.digitalWrite(i.pin, i.state);
                break;
            case "analogWrite":
                this.terminal.info(`Brain → analogWrite(${i.pin}, ${i.value})`);
                this.network.analogWrite(i.pin, i.value);
                break;
            case "servo":
                this.terminal.info(`Brain → servo(${i.pin}, ${i.angle})`);
                this.network.servo(i.pin, i.angle);
                break;
            case "move":
                this.terminal.info(`Brain → move(${i.direction}, ${i.speed})`);
                this.network.sendMove(i.direction, i.speed);
                break;
            case "serial":
                this.terminal[i.newline ? "info" : "write"](i.value, "info");
                break;
            case "delay":
                await new Promise(resolve => setTimeout(resolve, Math.min(i.ms, 10000)));
                break;
            default:
                this.terminal.warning(`Brain skipped unsupported op: ${i.op}`);
        }
    }

    stop() {
        this.running = false;
        if (this.loopTimer) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
        this.network.stopMotors();
        this.terminal.info("PC Brain: program stopped");
    }
}
