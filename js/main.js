import { AppState } from "./core/state.js";
import { Logger } from "./core/logger.js";
import { LayoutManager } from "./ui/layout.js";
import { ThemeManager } from "./ui/theme.js";
import { EditorManager } from "./editor/editor.js";
import { Explorer } from "./explorer/explorer.js";
import { HardwareWorkspace } from "./hardware/workspace.js";
import { NetworkManager } from "./network/network.js";
import { Terminal } from "./terminal/terminal.js";
import { VirtualCompiler } from "./compiler/virtualCompiler.js";
import { BrainRuntime } from "./runtime/brain.js";

class ESPNextGenIDE {
    constructor() {
        this.state = new AppState();
        this.logger = new Logger();
        this.layout = new LayoutManager();
        this.theme = new ThemeManager();
        this.editor = new EditorManager();
        this.explorer = new Explorer();
        this.hardware = new HardwareWorkspace();
        this.network = new NetworkManager();
        this.terminal = new Terminal();
        this.compiler = new VirtualCompiler();
        this.brain = new BrainRuntime(this.network, this.terminal);
        this.joystick = { active: false, pointerId: null, maxDistance: 54, lastSentAt: 0 };
    }

    async initialize() {
        try {
            await this.theme.initialize();
            await this.layout.initialize();
            await this.editor.initialize();
            await this.explorer.initialize();
            await this.hardware.initialize();
            await this.network.initialize();
            await this.terminal.initialize();
            this.registerEvents();
            this.initializeConnectionUI();
            this.initializeJoystick();
            this.loadComponents();
            this.seedDefaultWorkspace();
            this.logger.success("ESP Next Gen IDE Ready — PC Brain online");
        } catch (error) {
            console.error(error);
            this.logger.error(`Startup failed: ${error.message}`);
        }
    }

    registerEvents() {
        window.addEventListener("resize", () => this.layout.resize());
        window.addEventListener("keydown", event => this.keyboardShortcuts(event));
        document.addEventListener("network", event => this.handleNetworkEvent(event.detail));
        document.getElementById("compileBtn")?.addEventListener("click", () => this.compile());
        document.getElementById("runBtn")?.addEventListener("click", () => this.run());
        document.getElementById("connectBtn")?.addEventListener("click", () => this.connect());
        document.getElementById("disconnectBtn")?.addEventListener("click", () => this.disconnect());
        document.getElementById("saveConnectionBtn")?.addEventListener("click", () => this.saveConnection());
    }

    initializeConnectionUI() {
        const ip = document.getElementById("espIp");
        const port = document.getElementById("espPort");
        if (ip) ip.value = this.network.ip || "";
        if (port) port.value = String(this.network.port || 81);
        this.updateNetworkTelemetry();
    }

    saveConnection() {
        this.network.ip = document.getElementById("espIp")?.value.trim() || "";
        this.network.port = Number(document.getElementById("espPort")?.value || 81);
        this.network.saveSettings();
        this.terminal.success(`Connection settings saved: ${this.network.ip || "no IP"}:${this.network.port}`);
    }

    connect() {
        const ip = document.getElementById("espIp")?.value.trim() || this.network.ip;
        const port = Number(document.getElementById("espPort")?.value || this.network.port || 81);
        if (!ip) {
            this.terminal.error("Enter the ESP32 IP address first.");
            document.getElementById("espIp")?.focus();
            return;
        }
        this.network.enableAutoReconnect();
        this.network.connect(ip, port);
    }

    disconnect() { this.network.disconnect(); }

    handleNetworkEvent(event) {
        switch (event?.type) {
            case "connecting":
                this.setConnectionStatus("Connecting...", "status-running");
                this.terminal.info(`Connecting to ${event.data.ip}:${event.data.port}`);
                break;
            case "connected":
                this.setConnectionStatus("Connected", "status-connected");
                this.terminal.success(`ESP32 servant connected at ${event.data.ip}:${event.data.port}`);
                break;
            case "disconnected":
                this.setConnectionStatus("Disconnected", "");
                this.terminal.warning("ESP32 servant disconnected");
                break;
            case "error":
                this.setConnectionStatus("Connection error", "status-error");
                this.terminal.error("ESP32 network error");
                break;
            case "message":
                this.handleESP32Message(event.data);
                break;
        }
        this.updateNetworkTelemetry();
    }

    handleESP32Message(raw) {
        if (typeof raw !== "string") return;
        if (raw === "PONG") return;
        try {
            const message = JSON.parse(raw);
            if (message.type === "telemetry") this.updateTelemetryDisplay(message);
            else if (message.type === "hello") this.terminal.success(`ESP32 servant ready: ${message.device || "device"}`);
            else if (message.type === "ack") this.terminal.success(`Servant ACK: ${message.command || "command"}`);
            else if (message.type === "error") this.terminal.error(`Servant: ${message.message || "Unknown error"}`);
            else if (message.type === "status") this.terminal.info(`Servant status: speed ${message.speed ?? "--"}`);
        } catch {
            this.terminal.info(`ESP32 ← ${raw}`);
        }
    }

    updateTelemetryDisplay(message) {
        const panel = document.querySelector(".connection-panel");
        if (!panel) return;
        let grid = panel.querySelector(".live-sensor-grid");
        if (!grid) {
            grid = document.createElement("div");
            grid.className = "telemetry-grid live-sensor-grid";
            grid.innerHTML = `<div><span>Distance</span><strong id="sensorDistance">-- cm</strong></div><div><span>Obstacle</span><strong id="sensorObstacle">--</strong></div>`;
            panel.appendChild(grid);
        }
        document.getElementById("sensorDistance").textContent = message.distance >= 0 ? `${Number(message.distance).toFixed(1)} cm` : "No reading";
        const obstacle = document.getElementById("sensorObstacle");
        obstacle.textContent = message.obstacle ? "Detected" : "Clear";
        obstacle.className = message.obstacle ? "status-running" : "status-connected";
    }

    setConnectionStatus(text, className = "") {
        const element = document.getElementById("connectionStatus");
        const state = document.getElementById("networkState");
        if (element) { element.textContent = text; element.className = className; }
        if (state) { state.textContent = text; state.className = className; }
    }

    updateNetworkTelemetry() {
        const telemetry = this.network.telemetry;
        document.getElementById("networkPing")?.replaceChildren(document.createTextNode(`${telemetry.ping || "--"} ms`));
        document.getElementById("networkTx")?.replaceChildren(document.createTextNode(String(telemetry.packetsSent)));
        document.getElementById("networkRx")?.replaceChildren(document.createTextNode(String(telemetry.packetsReceived)));
    }

    initializeJoystick() {
        const base = document.getElementById("joystickBase");
        const stick = document.getElementById("joystickStick");
        if (!base || !stick) return;
        base.addEventListener("pointerdown", event => {
            event.preventDefault();
            this.joystick.active = true;
            this.joystick.pointerId = event.pointerId;
            base.setPointerCapture?.(event.pointerId);
            this.updateJoystick(event);
        });
        base.addEventListener("pointermove", event => {
            if (this.joystick.active && event.pointerId === this.joystick.pointerId) this.updateJoystick(event);
        });
        const release = event => {
            if (this.joystick.active && event.pointerId === this.joystick.pointerId) this.resetJoystick();
        };
        base.addEventListener("pointerup", release);
        base.addEventListener("pointercancel", release);
        base.addEventListener("lostpointercapture", () => this.resetJoystick());
    }

    updateJoystick(event) {
        const base = document.getElementById("joystickBase");
        const stick = document.getElementById("joystickStick");
        if (!base || !stick) return;
        const rect = base.getBoundingClientRect();
        let dx = event.clientX - (rect.left + rect.width / 2);
        let dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        if (distance > this.joystick.maxDistance) {
            const ratio = this.joystick.maxDistance / distance;
            dx *= ratio; dy *= ratio;
        }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        const x = Math.round((dx / this.joystick.maxDistance) * 100);
        const y = Math.round((-dy / this.joystick.maxDistance) * 100);
        const now = performance.now();
        if (now - this.joystick.lastSentAt > 50) {
            this.network.sendJoystick(x, y);
            this.joystick.lastSentAt = now;
            this.updateNetworkTelemetry();
        }
    }

    resetJoystick() {
        if (!this.joystick.active) return;
        this.joystick.active = false;
        this.joystick.pointerId = null;
        document.getElementById("joystickStick")?.style.setProperty("transform", "translate(0px, 0px)");
        this.network.stopMotors();
        this.updateNetworkTelemetry();
    }

    async loadComponents() {
        const container = document.getElementById("componentsList");
        if (!container) return;
        try {
            const response = await fetch("./data/components.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const registry = await response.json();
            container.innerHTML = "";
            (registry.components || []).forEach(component => {
                const item = document.createElement("div");
                item.className = "component-item";
                item.draggable = true;
                item.innerHTML = `<div class="icon">${component.icon || "🔧"}</div><div class="meta"><div class="title">${this.escapeHTML(component.name)}</div><div class="subtitle">${this.escapeHTML(component.category)}</div></div>`;
                item.addEventListener("dragstart", event => event.dataTransfer.setData("component", component.id));
                container.appendChild(item);
            });
        } catch (error) {
            container.textContent = "Unable to load component registry";
            this.terminal.warning(`Component registry unavailable: ${error.message}`);
        }
    }

    compile() {
        const code = this.editor.getValue();
        const status = document.getElementById("compileStatus");
        const result = this.compiler.compile(code);
        if (!result.ok) {
            if (status) { status.textContent = "Compile Error"; status.classList.add("status-error"); }
            result.errors.forEach(error => this.terminal.error(`Line ${error.line}: ${error.message}`));
            return result;
        }
        if (status) { status.textContent = `Compiled (${result.instructionCount} ops)`; status.classList.remove("status-error"); }
        result.warnings.forEach(warning => this.terminal.warning(`Line ${warning.line}: ${warning.message}`));
        this.terminal.success(`Virtual compile successful — ${result.instructionCount} instructions generated`);
        return result;
    }

    async run() {
        const result = this.compile();
        if (!result?.ok) return;
        await this.brain.run(result);
        const status = document.getElementById("compileStatus");
        if (status) { status.textContent = "Brain Running"; status.classList.add("status-running"); }
    }

    stop() {
        this.brain.stop();
        const status = document.getElementById("compileStatus");
        if (status) { status.textContent = "Ready"; status.classList.remove("status-running"); }
    }

    seedDefaultWorkspace() {
        const status = document.getElementById("compileStatus");
        if (status) status.textContent = "Brain Ready";
        this.terminal.info("PC Brain online");
        this.terminal.info("ESP32 is the servant hardware endpoint");
        this.terminal.info("Compile creates virtual instructions; Run executes them on the PC and forwards hardware actions");
    }

    keyboardShortcuts(event) {
        if (event.key === "F5") { event.preventDefault(); this.run(); return; }
        if (event.key === "Escape") { event.preventDefault(); this.stop(); return; }
        if (event.ctrlKey && event.key.toLowerCase() === "s") { event.preventDefault(); this.editor.save(); }
    }

    escapeHTML(value) {
        return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const app = new ESPNextGenIDE();
    await app.initialize();
});
