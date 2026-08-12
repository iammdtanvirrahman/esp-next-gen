import { Debugger } from "./debugger.js";
import { BrainRuntime } from "./brain.js";

const originalCreateAPI = BrainRuntime.prototype.createAPI;
const originalRun = BrainRuntime.prototype.run;
const originalStop = BrainRuntime.prototype.stop;

BrainRuntime.prototype._ensureDebugger = function () {
    if (!this.debugger) this.debugger = new Debugger(this, this.terminal);
    return this.debugger;
};

BrainRuntime.prototype.createDebugAPI = function (compiledProgram) {
    const api = originalCreateAPI.call(this);
    const dbg = this._ensureDebugger();
    let operationIndex = 0;
    const instructions = Array.isArray(compiledProgram?.instructions) ? compiledProgram.instructions : [];
    const aliases = { serialBegin: "Serial", serialPrint: "Serial", serialPrintln: "Serial", serialPrintf: "Serial" };

    const lineFor = name => {
        const target = aliases[name] || name;
        for (let i = operationIndex; i < instructions.length; i += 1) {
            if (instructions[i]?.op === target) {
                operationIndex = i + 1;
                return Number(instructions[i]?.line) || 0;
            }
        }
        return 0;
    };

    const wrapped = { ...api };
    for (const [name, fn] of Object.entries(api)) {
        if (typeof fn !== "function") continue;
        wrapped[name] = async (...args) => {
            const line = lineFor(name);
            await dbg.beforeOperation(line, name);
            const result = await fn(...args);
            dbg.emit("operation", { line, operation: name, args });
            return result;
        };
    }
    return wrapped;
};

BrainRuntime.prototype.run = async function (compiledProgram) {
    const dbg = this._ensureDebugger();
    dbg.reset();
    dbg.start();
    this.debugProgram = compiledProgram;
    try {
        return await originalRun.call(this, compiledProgram);
    } finally {
        if (!this.running) dbg.stop();
    }
};

BrainRuntime.prototype.createAPI = function () {
    return this.debugProgram ? this.createDebugAPI(this.debugProgram) : originalCreateAPI.call(this);
};

BrainRuntime.prototype.stop = function (log = true) {
    const result = originalStop.call(this, log);
    this.debugger?.stop();
    return result;
};

function bindDebuggerUI() {
    const cm = document.querySelector(".CodeMirror")?.CodeMirror;
    const panel = document.getElementById("debuggerPanel");
    const runtime = window.__UNIVERSAL_BRAIN__;
    if (!cm || !panel || !runtime?.debugger || panel.dataset.bound === "true") return Boolean(panel?.dataset.bound);

    const dbg = runtime.debugger;
    panel.dataset.bound = "true";
    const setText = (selector, value) => {
        const el = panel.querySelector(selector);
        if (el) el.textContent = value;
    };
    const refresh = state => {
        setText("[data-debug=status]", state.paused ? `Paused — ${state.currentOperation || "breakpoint"}` : state.running ? "Running" : "Ready");
        setText("[data-debug=current-line]", state.currentLine ? `Line ${state.currentLine}` : "—");
        setText("[data-debug=breakpoints]", state.breakpoints.length ? state.breakpoints.join(", ") : "None");
        setText("[data-debug=stack]", state.callStack.length ? state.callStack.map(x => x.function).join(" → ") : "setup / loop");
        setText("[data-debug=watch]", Object.keys(state.watches).length ? JSON.stringify(state.watches) : "None");
        if (state.currentLine > 0 && state.currentLine <= cm.lineCount()) {
            cm.setCursor({ line: state.currentLine - 1, ch: 0 });
            cm.scrollIntoView({ line: state.currentLine - 1, ch: 0 }, 120);
        }
    };

    dbg.on(event => refresh(event.debugger.state()));
    cm.on("gutterClick", (_instance, line, gutter) => {
        if (gutter !== "CodeMirror-linenumbers") return;
        const enabled = dbg.toggleBreakpoint(line + 1);
        cm.setGutterMarker(line, "debugger-breakpoint", enabled ? marker() : null);
        refresh(dbg.state());
    });

    panel.querySelector("[data-action=continue]")?.addEventListener("click", () => dbg.resume());
    panel.querySelector("[data-action=pause]")?.addEventListener("click", () => dbg.pause("manual"));
    panel.querySelector("[data-action=step]")?.addEventListener("click", () => dbg.requestStep());
    panel.querySelector("[data-action=stop]")?.addEventListener("click", () => runtime.stop());
    panel.querySelector("[data-action=clear]")?.addEventListener("click", () => {
        dbg.clearBreakpoints();
        for (let line = 0; line < cm.lineCount(); line += 1) cm.setGutterMarker(line, "debugger-breakpoint", null);
        refresh(dbg.state());
    });
    panel.querySelector("[data-action=watch]")?.addEventListener("click", () => {
        const input = panel.querySelector("input[data-watch-input]");
        const name = input?.value.trim();
        if (!name) return;
        const value = name === "telemetry" ? runtime.telemetry : runtime[name] ?? runtime.getVirtualState?.()[name] ?? "<runtime scope>";
        dbg.watch(name, value);
        if (input) input.value = "";
        refresh(dbg.state());
    });

    refresh(dbg.state());
    return true;
}

function marker() {
    const dot = document.createElement("span");
    dot.className = "debugger-breakpoint-dot";
    dot.textContent = "●";
    return dot;
}

const wait = setInterval(() => {
    if (bindDebuggerUI()) clearInterval(wait);
}, 200);
