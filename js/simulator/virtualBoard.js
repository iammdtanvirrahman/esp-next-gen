export class VirtualBoard {
    constructor(root) { this.root = root; this.state = this.emptyState(); }
    emptyState() { return { running: false, pins: {}, analog: {}, telemetry: {}, uptime: 0, loopIterations: 0 }; }
    initialize() { if (!this.root) return; this.renderShell(); this.render(); }
    renderShell() {
        this.root.innerHTML = `<div class="virtual-board-head"><span>Virtual Hardware State</span><span id="virtualRunState" class="sim-chip">IDLE</span></div>
        <div class="virtual-board-grid">
            <div class="sim-card"><span>Runtime</span><strong id="virtualRuntime">0 ms</strong><small id="virtualLoopCount">Loop 0</small></div>
            <div class="sim-card"><span>GPIO</span><strong id="virtualPinCount">0</strong><small>active pins</small></div>
            <div class="sim-card"><span>Analog / PWM</span><strong id="virtualAnalogCount">0</strong><small>active channels</small></div>
            <div class="sim-card"><span>Telemetry</span><strong id="virtualTelemetryCount">0</strong><small>reported fields</small></div>
        </div><div class="virtual-pins" id="virtualPinGrid"></div>`;
    }
    update(next = {}) { this.state = this.mergeState(this.state, next); this.render(); }
    mergeState(current, next) { return { ...current, ...next, pins: next.pins || current.pins, analog: next.analog || current.analog, telemetry: { ...current.telemetry, ...(next.telemetry || {}) } }; }
    render() {
        if (!this.root) return; const s = this.state;
        const run = this.root.querySelector("#virtualRunState");
        if (run) { run.textContent = s.running ? "RUNNING" : "IDLE"; run.className = `sim-chip ${s.running ? "sim-running" : ""}`; }
        this.root.querySelector("#virtualRuntime")?.replaceChildren(document.createTextNode(`${Number(s.uptime || 0)} ms`));
        this.root.querySelector("#virtualLoopCount")?.replaceChildren(document.createTextNode(`Loop ${Number(s.loopIterations || 0)}`));
        this.root.querySelector("#virtualPinCount")?.replaceChildren(document.createTextNode(String(Object.keys(s.pins || {}).length)));
        this.root.querySelector("#virtualAnalogCount")?.replaceChildren(document.createTextNode(String(Object.keys(s.analog || {}).length)));
        this.root.querySelector("#virtualTelemetryCount")?.replaceChildren(document.createTextNode(String(Object.keys(s.telemetry || {}).length)));
        this.renderPins(s.pins || {}, s.analog || {});
    }
    renderPins(pins, analog) {
        const grid = this.root.querySelector("#virtualPinGrid"); if (!grid) return;
        const ids = [...new Set([...Object.keys(pins), ...Object.keys(analog)].map(Number))].sort((a,b)=>a-b);
        if (!ids.length) { grid.innerHTML = `<small class="sim-empty">No hardware activity yet.</small>`; return; }
        grid.innerHTML = ids.map(pin => { const p = pins[pin] || {}; const a = analog[pin]; const value = a !== undefined ? a : (p.value ? 1 : 0); return `<div class="virtual-pin"><span>GPIO ${pin}</span><b>${p.mode || (a !== undefined ? "PWM" : "INPUT")}</b><strong>${value}</strong></div>`; }).join("");
    }
}
