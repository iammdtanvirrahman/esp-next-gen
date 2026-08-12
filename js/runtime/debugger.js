/**
 * Universal Hardware IDE - Runtime Debugger
 * Breakpoints, pause/resume, stepping, watches, call stack and history.
 */
export class Debugger {
    constructor(runtime, terminal = null) {
        this.runtime = runtime;
        this.terminal = terminal;
        this.breakpoints = new Set();
        this.watchList = new Map();
        this.callStack = [];
        this.history = [];
        this.currentLine = 0;
        this.currentOperation = "";
        this.running = false;
        this.paused = false;
        this.stepRequested = false;
        this.maxHistory = 1000;
        this.listeners = new Set();
        this.resumeResolver = null;
    }

    start() {
        this.running = true;
        this.paused = false;
        this.stepRequested = false;
        this.emit("start");
    }

    stop() {
        this.running = false;
        this.paused = false;
        this.stepRequested = false;
        this.currentLine = 0;
        this.currentOperation = "";
        this.releasePause();
        this.emit("stop");
    }

    pause(reason = "manual") {
        if (!this.running) return;
        this.paused = true;
        this.emit("pause", { reason, line: this.currentLine, operation: this.currentOperation });
        this.terminal?.warning?.(`DEBUG paused at line ${this.currentLine || "?"}${this.currentOperation ? ` — ${this.currentOperation}` : ""}`);
    }

    resume() {
        const wasPaused = this.paused;
        this.paused = false;
        this.stepRequested = false;
        this.releasePause();
        if (wasPaused) this.emit("resume");
    }

    requestStep() {
        if (!this.running) return;
        this.stepRequested = true;
        this.paused = false;
        this.releasePause();
        this.emit("step");
    }

    async waitIfPaused() {
        if (!this.paused || !this.running) return;
        await new Promise(resolve => {
            this.resumeResolver = resolve;
        });
    }

    releasePause() {
        const resolver = this.resumeResolver;
        this.resumeResolver = null;
        resolver?.();
    }

    async beforeOperation(line, operation) {
        if (!this.running) return;
        const numericLine = Number(line) || 0;
        this.currentLine = numericLine;
        this.currentOperation = String(operation || "operation");
        this.recordHistory(numericLine, this.currentOperation);
        this.emit("line", this.state());

        if (this.breakpoints.has(numericLine)) {
            this.pause("breakpoint");
            await this.waitIfPaused();
            return;
        }

        if (this.stepRequested) {
            this.stepRequested = false;
            this.pause("step");
            await this.waitIfPaused();
        }
    }

    execute(line, operation = "") {
        this.currentLine = Number(line) || 0;
        this.currentOperation = String(operation || "operation");
        this.recordHistory(this.currentLine, this.currentOperation);
        if (this.breakpoints.has(this.currentLine)) this.pause("breakpoint");
    }

    addBreakpoint(line) {
        const n = Number(line);
        if (Number.isInteger(n) && n > 0) this.breakpoints.add(n);
        this.emit("breakpoint", this.state());
    }

    removeBreakpoint(line) {
        this.breakpoints.delete(Number(line));
        this.emit("breakpoint", this.state());
    }

    toggleBreakpoint(line) {
        const n = Number(line);
        if (this.breakpoints.has(n)) this.removeBreakpoint(n);
        else this.addBreakpoint(n);
        return this.breakpoints.has(n);
    }

    clearBreakpoints() {
        this.breakpoints.clear();
        this.emit("breakpoint", this.state());
    }

    hasBreakpoint(line) {
        return this.breakpoints.has(Number(line));
    }

    watch(name, value = null) {
        const key = String(name).trim();
        if (key) this.watchList.set(key, value);
        this.emit("watch", this.state());
    }

    updateWatch(name, value) {
        const key = String(name).trim();
        if (this.watchList.has(key)) this.watchList.set(key, value);
        this.emit("watch", this.state());
    }

    removeWatch(name) {
        this.watchList.delete(String(name));
        this.emit("watch", this.state());
    }

    clearWatchList() {
        this.watchList.clear();
        this.emit("watch", this.state());
    }

    pushFunction(name) {
        this.callStack.push({ function: String(name), time: performance.now() });
        this.emit("stack", this.state());
    }

    popFunction() {
        this.callStack.pop();
        this.emit("stack", this.state());
    }

    getCallStack() {
        return [...this.callStack];
    }

    recordHistory(line, operation = "") {
        this.history.push({ line, operation, time: performance.now() });
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    exception(error) {
        this.pause("exception");
        this.emit("exception", { error });
    }

    state() {
        return {
            running: this.running,
            paused: this.paused,
            currentLine: this.currentLine,
            currentOperation: this.currentOperation,
            breakpoints: [...this.breakpoints].sort((a, b) => a - b),
            watches: Object.fromEntries(this.watchList),
            callStack: this.getCallStack(),
            history: this.history.slice(-100)
        };
    }

    on(callback) {
        if (typeof callback !== "function") return () => {};
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    emit(type, data = null) {
        const event = { type, data, debugger: this };
        this.listeners.forEach(listener => listener(event));
        document.dispatchEvent(new CustomEvent("debugger-event", { detail: event }));
    }

    reset() {
        this.breakpoints.clear();
        this.watchList.clear();
        this.callStack = [];
        this.history = [];
        this.currentLine = 0;
        this.currentOperation = "";
        this.running = false;
        this.paused = false;
        this.stepRequested = false;
        this.releasePause();
        this.emit("reset", this.state());
    }
}
