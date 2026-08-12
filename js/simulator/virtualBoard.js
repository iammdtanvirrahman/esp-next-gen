/* ESP Next Gen - Virtual ESP32 board monitor */
export class VirtualBoard {
    constructor(root) {
        this.root = root;
        this.state = this.emptyState();
    }

    emptyState() {
        return {
            running: false,
            pins: {},
            analog: {},
            servos: {},
            motors: { left: 0, right: 0, direction: "stop", speed: 0 },
            telemetry: { distance: -1, obstacle: false, fine: 0, speed: 0 },
            uptime: 0,
            loopIterations: 0
        };
    }

    initialize() {
        if (!this.root) return;
        this.renderShell();
        this.render();
    }

    renderShell() {
        this.root.innerHTML = `
            <div class="virtual-board-head">
                <span>PC Virtual Hardware</span>
                <span id="virtualRunState" class="sim-chip">IDLE</span>
            </div>
            <div class="virtual-board-grid">
                <div class="sim-card">
                    <span>Motors</span>
                    <strong id="virtualMotorState">STOP</strong>
                    <small id="virtualMotorValues">L 0 · R 0</small>
                </div>
                <div class="sim-card">
                    <span>Servo</span>
                    <strong id="virtualServoState">--</strong>
                    <small>degrees</small>
                </div>
                <div class="sim-card">
                    <span>Distance</span>
                    <strong id="virtualDistance">-- cm</strong>
                    <small id="virtualObstacle">Clear</small>
                </div>
                <div class="sim-card">
                    <span>Fine</span>
                    <strong id="virtualFine">$0</strong>
                    <small id="virtualLoopCount">Loop 0</small>
                </div>
            </div>
            <div class="virtual-leds">
                <div><i id="virtualGreenLed"></i><span>Green LED</span><b id="virtualGreenValue">OFF</b></div>
                <div><i id="virtualRedLed"></i><span>Red LED</span><b id="virtualRedValue">OFF</b></div>
            </div>
            <div class="virtual-pins" id="virtualPinGrid"></div>
        `;
    }

    update(next = {}) {
        this.state = this.mergeState(this.state, next);
        this.render();
    }

    mergeState(current, next) {
        return {
            ...current,
            ...next,
            motors: { ...current.motors, ...(next.motors || {}) },
            telemetry: { ...current.telemetry, ...(next.telemetry || {}) },
            pins: next.pins || current.pins,
            analog: next.analog || current.analog,
            servos: next.servos || current.servos
        };
    }

    render() {
        if (!this.root) return;
        const s = this.state;
        const run = this.root.querySelector("#virtualRunState");
        const motor = this.root.querySelector("#virtualMotorState");
        const motorValues = this.root.querySelector("#virtualMotorValues");
        const servo = this.root.querySelector("#virtualServoState");
        const distance = this.root.querySelector("#virtualDistance");
        const obstacle = this.root.querySelector("#virtualObstacle");
        const fine = this.root.querySelector("#virtualFine");
        const loop = this.root.querySelector("#virtualLoopCount");

        if (run) {
            run.textContent = s.running ? "RUNNING" : "IDLE";
            run.className = `sim-chip ${s.running ? "sim-running" : ""}`;
        }
        if (motor) motor.textContent = String(s.motors.direction || "stop").toUpperCase();
        if (motorValues) motorValues.textContent = `L ${s.motors.left || 0} · R ${s.motors.right || 0}`;
        if (servo) {
            const entries = Object.entries(s.servos || {});
            servo.textContent = entries.length ? `${entries[entries.length - 1][1]}°` : "--";
        }
        if (distance) {
            const d = Number(s.telemetry.distance);
            distance.textContent = d >= 0 ? `${d.toFixed(1)} cm` : "-- cm";
        }
        if (obstacle) obstacle.textContent = s.telemetry.obstacle ? "OBSTACLE" : "Clear";
        if (fine) fine.textContent = `$${Number(s.telemetry.fine || 0)}`;
        if (loop) loop.textContent = `Loop ${s.loopIterations || 0}`;

        this.renderLEDs(s.pins || {});
        this.renderPins(s.pins || {}, s.analog || {});
    }

    renderLEDs(pins) {
        const green = Boolean(pins[15]?.value);
        const red = Boolean(pins[2]?.value);
        const greenLed = this.root.querySelector("#virtualGreenLed");
        const redLed = this.root.querySelector("#virtualRedLed");
        const greenText = this.root.querySelector("#virtualGreenValue");
        const redText = this.root.querySelector("#virtualRedValue");
        if (greenLed) greenLed.classList.toggle("on", green);
        if (redLed) redLed.classList.toggle("on", red);
        if (greenText) greenText.textContent = green ? "ON" : "OFF";
        if (redText) redText.textContent = red ? "ON" : "OFF";
    }

    renderPins(pins, analog) {
        const grid = this.root.querySelector("#virtualPinGrid");
        if (!grid) return;
        const ids = [...new Set([...Object.keys(pins), ...Object.keys(analog)].map(Number))].sort((a, b) => a - b);
        if (!ids.length) {
            grid.innerHTML = "<small class=\"sim-empty\">No virtual GPIO activity yet.</small>";
            return;
        }
        grid.innerHTML = ids.map(pin => {
            const p = pins[pin] || {};
            const a = analog[pin];
            const value = a !== undefined ? a : (p.value ? 1 : 0);
            return `<div class="virtual-pin"><span>GPIO ${pin}</span><b>${p.mode || (a !== undefined ? "PWM" : "INPUT")}</b><strong>${value}</strong></div>`;
        }).join("");
    }
}
