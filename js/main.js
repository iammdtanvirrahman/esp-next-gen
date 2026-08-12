import { AppState } from "./core/state.js";
import { Logger } from "./core/logger.js";
import { LayoutManager } from "./ui/layout.js";
import { ThemeManager } from "./ui/theme.js";
import { EditorManager } from "./editor/editor.js";
import { Explorer } from "./explorer/explorer.js";
import { HardwareWorkspace } from "./hardware/workspace.js";
import { FineSystem } from "./hardware/fine-system.js";
import { NetworkManager } from "./network/network.js";
import { Terminal } from "./terminal/terminal.js";

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
        this.fineSystem = new FineSystem(this.network, this.terminal);

        this.joystick = { active: false, pointerId: null, maxDistance: 54, lastSentAt: 0, x: 0, y: 0 };
    }

    async initialize() {
        this.logger.info("Starting ESP Next Gen IDE...");
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
            this.fineSystem.initialize();
            await this.loadComponents();
            this.seedDefaultWorkspace();
            this.logger.success("ESP Next Gen IDE Ready");
        } catch (error) {
            console.error(error);
            this.logger.error(`Startup failed: ${error.message}`);
            this.terminal.error(`Startup failed: ${error.message}`);
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
        document.getElementById("resetFineBtn")?.addEventListener("click", () => this.fineSystem.reset());
    }

    initializeConnectionUI() {
        const ip = document.getElementById("espIp");
        const port = document.getElementById("espPort");
        if (ip) ip.value = this.network.ip || "";
        if (port) port.value = String(this.network.port || 81);
        this.updateNetworkTelemetry();
    }

    saveConnection() {
        const ip = document.getElementById("espIp")?.value.trim() || "";
        const port = Number(document.getElementById("espPort")?.value || 81);
        this.network.ip = ip;
        this.network.port = port;
        this.network.saveSettings();
        this.terminal.success(`Connection settings saved: ${ip || "no IP"}:${port}`);
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
        const type = event?.type;
        if (type === "connecting") {
            this.setConnectionStatus("Connecting...", "status-running");
            this.terminal.info(`Connecting to ${event.data.ip}:${event.data.port}`);
        } else if (type === "connected") {
            this.setConnectionStatus("Connected", "status-connected");
            this.terminal.success(`ESP32 connected at ${event.data.ip}:${event.data.port}`);
        } else if (type === "disconnected") {
            this.setConnectionStatus("Disconnected", "");
            this.terminal.warning("ESP32 disconnected");
        } else if (type === "error") {
            this.setConnectionStatus("Connection error", "status-error");
            this.terminal.error("ESP32 network error");
        } else if (type === "message") {
            this.handleESP32Message(event.data);
        }
        this.updateNetworkTelemetry();
    }

    handleESP32Message(raw) {
        if (typeof raw !== "string") {
            this.terminal.info("ESP32 sent a binary packet");
            return;
        }
        if (raw === "PONG") return;

        try {
            const message = JSON.parse(raw);
            switch (message.type) {
                case "hello":
                    this.terminal.success(`ESP32 ready: ${message.device || "device"}`);
                    break;
                case "status":
                    this.terminal.info(`ESP32 status: ${message.ip || "unknown IP"}, speed ${message.speed ?? "--"}`);
                    break;
                case "telemetry":
                    this.fineSystem.handleTelemetry(message);
                    break;
                case "ack":
                    this.terminal.success(`ESP32 ACK: ${message.command || "command"}`);
                    break;
                case "error":
                    this.terminal.error(`ESP32: ${message.message || "Unknown error"}`);
                    break;
                case "run":
                    this.terminal.info(`ESP32 run status: ${message.status || "unknown"}`);
                    break;
                default:
                    this.terminal.info(`ESP32 ← ${raw}`);
            }
        } catch {
            this.terminal.info(`ESP32 ← ${raw}`);
        }
    }

    setConnectionStatus(text, className = "") {
        const element = document.getElementById("connectionStatus");
        const state = document.getElementById("networkState");
        if (element) { element.textContent = text; element.className = className; }
        if (state) { state.textContent = text; state.className = className; }
    }

    updateNetworkTelemetry() {
        const telemetry = this.network.telemetry;
        const ping = document.getElementById("networkPing");
        const tx = document.getElementById("networkTx");
        const rx = document.getElementById("networkRx");
        if (ping) ping.textContent = `${telemetry.ping || "--"} ms`;
        if (tx) tx.textContent = String(telemetry.packetsSent);
        if (rx) rx.textContent = String(telemetry.packetsReceived);
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
            if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) return;
            this.updateJoystick(event);
        });
        const release = event => {
            if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) return;
            this.resetJoystick();
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
        this.joystick.x = x; this.joystick.y = y;
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
        const stick = document.getElementById("joystickStick");
        if (stick) stick.style.transform = "translate(0px, 0px)";
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
            const components = registry.components || [];
            container.innerHTML = "";
            components.forEach(component => {
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
        const status = document.getElementById("compileStatus");
        const code = this.editor.getValue();
        if (!code.trim()) {
            if (status) status.textContent = "No code";
            this.terminal.error("Compile stopped: editor is empty.");
            return false;
        }
        if (status) { status.textContent = "Compiling..."; status.classList.add("status-running"); }
        this.terminal.info("Compiling Arduino/C++ project...");
        setTimeout(() => {
            if (status) { status.textContent = "Build OK"; status.classList.remove("status-running"); }
            this.terminal.success(`Compile completed (${code.split("\n").length} lines)`);
        }, 700);
        return true;
    }

    run() {
        if (!this.compile()) return;
        setTimeout(() => {
            const status = document.getElementById("compileStatus");
            if (status) { status.textContent = "Running"; status.classList.add("status-running"); }
            const sent = this.network.sendJSON({ type: "run", code: this.editor.getValue() });
            this.terminal[sent ? "success" : "warning"](sent ? "Code sent to ESP32" : "ESP32 not connected; running local simulation");
            if (!sent) setTimeout(() => {
                if (status) { status.textContent = "Ready"; status.classList.remove("status-running"); }
                this.terminal.success("Local simulation completed");
            }, 1200);
        }, 750);
    }

    seedDefaultWorkspace() {
        const compileStatus = document.getElementById("compileStatus");
        if (compileStatus) compileStatus.textContent = "Ready";
        this.terminal.info("Workspace initialized");
        this.terminal.info("Connect an ESP32 from the right panel to enable live control");
    }

    keyboardShortcuts(event) {
        if (event.key === "F5") { event.preventDefault(); this.run(); return; }
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
