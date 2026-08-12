/* ESP Next Gen - Interactive Virtual ESP32 board monitor */
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
            telemetry: { distance: 50, obstacle: false, fine: 0, speed: 0 },
            uptime: 0,
            loopIterations: 0
        };
    }

    initialize() {
        if (!this.root) return;
        this.renderShell();
        this.bindControls();
        this.render();
    }

    renderShell() {
        this.root.innerHTML = `
            <div class="virtual-board-head">
                <span>PC Virtual Hardware Lab</span>
                <span id="virtualRunState" class="sim-chip">IDLE</span>
            </div>
            <div class="virtual-board-controls">
                <label>Ultrasonic distance
                    <input id="virtualDistanceInput" type="range" min="0" max="400" value="50" step="0.5">
                </label>
                <div class="virtual-control-row">
                    <button data-sim-distance="5">5cm</button>
                    <button data-sim-distance="15">15cm</button>
                    <button data-sim-distance="50">50cm</button>
                    <button data-sim-distance="100">100cm</button>
                </div>
                <label>Fine amount
                    <input id="virtualFineInput" type="number" min="0" max="100" step="2" value="0">
                </label>
                <div class="virtual-control-row">
                    <button data-sim-fine="0">$0</button>
                    <button data-sim-fine="2">$2</button>
                    <button data-sim-fine="10">$10</button>
                    <button data-sim-fine="50">$50</button>
                </div>
                <div class="virtual-control-row">
                    <button data-sim-scenario="clear">Clear</button>
                    <button data-sim-scenario="obstacle">Obstacle</button>
                    <button data-sim-scenario="fine">Fine Active</button>
                    <button id="virtualResetBtn">Reset Lab</button>
                    <button id="virtualSnapshotBtn">Save State</button>
                </div>
            </div>
            <div class="virtual-board-grid">
                <div class="sim-card"><span>Motors</span><strong id="virtualMotorState">STOP</strong><small id="virtualMotorValues">L 0 · R 0</small></div>
                <div class="sim-card"><span>Servo</span><strong id="virtualServoState">--</strong><small>degrees</small></div>
                <div class="sim-card"><span>Distance</span><strong id="virtualDistance">50.0 cm</strong><small id="virtualObstacle">Clear</small></div>
                <div class="sim-card"><span>Fine / TM1637</span><strong id="virtualFine">$0</strong><small id="virtualLoopCount">Loop 0</small></div>
            </div>
            <div class="virtual-leds">
                <div><i id="virtualGreenLed"></i><span>Green LED</span><b id="virtualGreenValue">OFF</b></div>
                <div><i id="virtualRedLed"></i><span>Red LED</span><b id="virtualRedValue">OFF</b></div>
            </div>
            <div class="virtual-pins" id="virtualPinGrid"></div>
            <small class="sim-hint">Virtual inputs affect the PC Brain. When ESP32 is connected, compatible outputs are forwarded to the servant.</small>
        `;
    }

    bindControls() {
        const distanceInput = this.root.querySelector("#virtualDistanceInput");
        const fineInput = this.root.querySelector("#virtualFineInput");
        distanceInput?.addEventListener("input", () => this.emitInput("distance", Number(distanceInput.value)));
        fineInput?.addEventListener("change", () => this.emitInput("fine", Math.max(0, Number(fineInput.value) || 0)));
        this.root.querySelectorAll("[data-sim-distance]").forEach(button => {
            button.addEventListener("click", () => {
                const value = Number(button.dataset.simDistance);
                if (distanceInput) distanceInput.value = String(value);
                this.emitInput("distance", value);
            });
        });
        this.root.querySelectorAll("[data-sim-fine]").forEach(button => {
            button.addEventListener("click", () => {
                const value = Number(button.dataset.simFine);
                if (fineInput) fineInput.value = String(value);
                this.emitInput("fine", value);
            });
        });
        this.root.querySelectorAll("[data-sim-scenario]").forEach(button => {
            button.addEventListener("click", () => this.applyScenario(button.dataset.simScenario));
        });
        this.root.querySelector("#virtualResetBtn")?.addEventListener("click", () => this.resetLab());
        this.root.querySelector("#virtualSnapshotBtn")?.addEventListener("click", () => this.saveSnapshot());
    }

    emitInput(kind, value) {
        const telemetry = {
            ...this.state.telemetry,
            ...(kind === "distance"
                ? { distance: value, obstacle: value > 0 && value <= 15 }
                : { fine: value, obstacle: this.state.telemetry.obstacle || value > 0 })
        };
        this.update({ telemetry });
        document.dispatchEvent(new CustomEvent("virtual-input", { detail: { kind, value, telemetry } }));
    }

    applyScenario(name) {
        const distanceInput = this.root.querySelector("#virtualDistanceInput");
        const fineInput = this.root.querySelector("#virtualFineInput");
        const scenarios = {
            clear: { distance: 100, obstacle: false, fine: 0 },
            obstacle: { distance: 10, obstacle: true, fine: 0 },
            fine: { distance: 10, obstacle: true, fine: 10 }
        };
        const scenario = scenarios[name];
        if (!scenario) return;
        if (distanceInput) distanceInput.value = String(scenario.distance);
        if (fineInput) fineInput.value = String(scenario.fine);
        this.update({ telemetry: scenario });
        document.dispatchEvent(new CustomEvent("virtual-input", { detail: { kind: "scenario", value: name, telemetry: { ...this.state.telemetry } } }));
    }

    resetLab() {
        this.state = this.emptyState();
        const distanceInput = this.root.querySelector("#virtualDistanceInput");
        const fineInput = this.root.querySelector("#virtualFineInput");
        if (distanceInput) distanceInput.value = "50";
        if (fineInput) fineInput.value = "0";
        this.render();
        document.dispatchEvent(new CustomEvent("virtual-input", { detail: { kind: "reset", value: "lab", telemetry: { ...this.state.telemetry } } }));
    }

    saveSnapshot() {
        const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "esp-next-gen-virtual-state.json";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        document.dispatchEvent(new CustomEvent("virtual-input", { detail: { kind: "snapshot", value: "saved", telemetry: { ...this.state.telemetry } } }));
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
        const distanceInput = this.root.querySelector("#virtualDistanceInput");
        const fineInput = this.root.querySelector("#virtualFineInput");

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
        if (obstacle) {
            obstacle.textContent = s.telemetry.obstacle ? "OBSTACLE" : "Clear";
            obstacle.className = s.telemetry.obstacle ? "status-error" : "status-connected";
        }
        if (fine) fine.textContent = `$${Number(s.telemetry.fine || 0)}`;
        if (loop) loop.textContent = `Loop ${s.loopIterations || 0}`;
        if (distanceInput && document.activeElement !== distanceInput) distanceInput.value = String(Math.max(0, Number(s.telemetry.distance) || 0));
        if (fineInput && document.activeElement !== fineInput) fineInput.value = String(Number(s.telemetry.fine || 0));
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
