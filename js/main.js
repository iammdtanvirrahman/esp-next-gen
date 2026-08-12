import { AppState } from "./core/state.js";
import { Logger } from "./core/logger.js";
import { LayoutManager } from "./ui/layout.js";
import { ThemeManager } from "./ui/theme.js";
import { EditorManager } from "./editor/editor.js";
import { Explorer } from "./explorer/explorer.js";
import { HardwareWorkspace } from "./hardware/workspace.js";
import { NetworkManager } from "./network/network.js";
import { Terminal } from "./terminal/terminal.js";
import { CircuitBuilder } from "./hardware/circuitBuilder.js?v=20260812-build-1";
import { VirtualCompiler } from "./compiler/virtualCompiler.js?v=20260812-build-1";
import { TargetValidator } from "./compiler/targetValidator.js?v=20260812-build-1";
import { LibraryResolver } from "./compiler/libraryResolver.js?v=20260812-build-1";
import { BuildManager } from "./build/buildManager.js?v=20260812-build-1";
import { BrainRuntime } from "./runtime/brain.js?v=20260812-build-1";
import { VirtualBoard } from "./simulator/virtualBoard.js?v=20260812-build-1";
import { PluginRegistry } from "./plugins/registry.js";
import { ProjectManager } from "./core/projectManager.js";
import { TestRunner } from "./core/testRunner.js";

class UniversalHardwareIDE {
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
        this.targetValidator = new TargetValidator(this.terminal);
        this.libraryResolver = new LibraryResolver();
        this.plugins = new PluginRegistry(this.terminal);
        this.buildManager = new BuildManager({
            terminal: this.terminal,
            compiler: this.compiler,
            libraryResolver: this.libraryResolver,
            targetValidator: this.targetValidator,
            plugins: this.plugins
        });
        this.brain = new BrainRuntime(this.network, this.terminal);
        this.circuitBuilder = new CircuitBuilder(document.getElementById("circuitBuilder"), this.terminal);
        this.virtualBoard = new VirtualBoard(document.getElementById("virtualBoard"));
        this.projectManager = new ProjectManager(this.editor, this.terminal);
        this.testRunner = new TestRunner(this);
        this.boardRegistry = [];
        this.selectedBoard = null;
        this.circuitValid = true;
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
            await this.plugins.load();
            await this.buildManager.initialize();
            await this.loadBoards();
            this.virtualBoard.initialize();
            await this.circuitBuilder.initialize();
            this.registerEvents();
            this.initializeConnectionUI();
            this.populateSelectors();
            this.loadCoreInterfaces();
            this.seedWorkspace();
            window.__UNIVERSAL_IDE__ = this;
            window.__UNIVERSAL_BRAIN__ = this.brain;
            this.restoreProject();
            this.logger.success("Universal Hardware IDE Ready — PC Brain online");
        } catch (error) {
            console.error(error);
            this.terminal.error(`Startup failed: ${error.message}`);
        }
    }

    restoreProject() {
        const restored = this.projectManager.loadLocal();
        if (!restored) this.terminal.info("PROJECT no saved local project — using starter workspace");
    }

    async loadBoards() {
        const response = await fetch("./data/boards.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Board registry HTTP ${response.status}`);
        const data = await response.json();
        this.boardRegistry = data.boards || [];
    }

    populateSelectors() {
        const boardSelect = document.getElementById("boardSelect");
        const packSelect = document.getElementById("packSelect");
        if (boardSelect) {
            boardSelect.innerHTML = this.boardRegistry.map(board => `<option value="${this.escape(board.id)}">${this.escape(board.name)}</option>`).join("");
            boardSelect.value = "generic-mcu";
            boardSelect.addEventListener("change", () => this.selectBoard(boardSelect.value));
        }
        if (packSelect) {
            const packs = this.plugins.list();
            packSelect.innerHTML = packs.map(pack => `<option value="${this.escape(pack.id)}">${this.escape(pack.name)}</option>`).join("");
            packSelect.value = "core-generic";
            packSelect.addEventListener("change", () => this.selectPack(packSelect.value));
        }
        this.selectBoard("generic-mcu");
    }

    selectBoard(id) {
        const board = this.boardRegistry.find(item => item.id === id);
        if (!board) return;
        this.selectedBoard = board;
        this.targetValidator.setBoard(board);
        this.circuitBuilder.setBoard?.(board);
        this.terminal.info(`TARGET ${board.name}`);
        const pins = board.gpio === "dynamic" ? "dynamic GPIO" : `${board.gpio.length} declared GPIOs`;
        this.terminal.info(`TARGET capabilities: ${(board.capabilities || []).join(", ")} · ${pins}`);
        if (board.plugin) this.terminal.info(`TARGET plugin: ${board.plugin}`);
    }

    async selectPack(id) {
        const pack = this.plugins.list().find(item => item.id === id);
        if (!pack) return;
        if (id !== "core-generic") await this.plugins.enable(id);
        else this.plugins.disable("esp32-servant");
        this.terminal.info(`PACK ${pack.name} selected`);
        if (pack.type === "board-plugin" && pack.board) {
            const boardSelect = document.getElementById("boardSelect");
            if (boardSelect) {
                boardSelect.value = pack.board;
                this.selectBoard(pack.board);
            }
        }
    }

    loadCoreInterfaces() {
        const container = document.getElementById("componentsList");
        if (!container) return;
        fetch("./data/components.json", { cache: "no-store" })
            .then(response => response.json())
            .then(data => {
                const items = data.components || data.interfaces || [];
                container.innerHTML = items.map(item => `<div class="component-item"><div class="icon">${item.icon || "•"}</div><div class="meta"><div class="title">${this.escape(item.name)}</div><div class="subtitle">${this.escape(item.category || "Interface")}</div></div></div>`).join("");
            })
            .catch(error => { container.textContent = "Unable to load core interfaces"; this.terminal.warning(error.message); });
    }

    registerEvents() {
        window.addEventListener("resize", () => this.layout.resize());
        window.addEventListener("keydown", event => this.keyboardShortcuts(event));
        document.addEventListener("network", event => this.handleNetworkEvent(event.detail));
        document.addEventListener("virtual-hardware", event => { if (event.detail?.state) this.virtualBoard.update(event.detail.state); });
        document.addEventListener("circuit-validation", event => { this.circuitValid = Boolean(event.detail?.ok); });
        document.getElementById("compileBtn")?.addEventListener("click", () => this.compile());
        document.getElementById("runBtn")?.addEventListener("click", () => this.run());
        document.getElementById("stopBtn")?.addEventListener("click", () => this.stop());
        document.getElementById("connectBtn")?.addEventListener("click", () => this.connect());
        document.getElementById("disconnectBtn")?.addEventListener("click", () => this.disconnect());
        document.getElementById("saveConnectionBtn")?.addEventListener("click", () => this.saveConnection());
        document.getElementById("projectSaveBtn")?.addEventListener("click", () => this.saveProject());
        document.getElementById("projectLoadBtn")?.addEventListener("click", () => this.projectManager.loadLocal());
        document.getElementById("projectExportBtn")?.addEventListener("click", () => this.projectManager.exportFile({ name: this.selectedBoard?.name || "universal-project" }));
        document.getElementById("projectImportBtn")?.addEventListener("click", () => this.projectManager.importFile());
        document.getElementById("selfTestBtn")?.addEventListener("click", () => this.testRunner.run());
        document.getElementById("buildReportToggle")?.addEventListener("click", () => document.getElementById("buildReportPanel")?.classList.toggle("hidden"));
    }

    saveProject() {
        this.projectManager.save({ name: this.selectedBoard?.name || "universal-project", board: this.selectedBoard?.id || "generic-mcu" });
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
        this.terminal.success(`Connection saved: ${this.network.ip || "no endpoint"}:${this.network.port}`);
    }

    connect() {
        const ip = document.getElementById("espIp")?.value.trim() || this.network.ip;
        const port = Number(document.getElementById("espPort")?.value || this.network.port || 81);
        if (!ip) return this.terminal.error("Enter a device endpoint first.");
        this.network.enableAutoReconnect();
        this.network.connect(ip, port);
    }

    disconnect() { this.network.disconnect(); }

    handleNetworkEvent(event) {
        switch (event?.type) {
            case "connecting": this.setConnectionStatus("Connecting...", "status-running"); this.terminal.info(`CONNECT ${event.data.ip}:${event.data.port}`); break;
            case "connected": this.setConnectionStatus("Connected", "status-connected"); this.terminal.success("Device endpoint connected"); break;
            case "disconnected": this.setConnectionStatus("Disconnected", ""); this.terminal.warning("Device endpoint disconnected"); break;
            case "error": this.setConnectionStatus("Connection error", "status-error"); this.terminal.error("Device network error"); break;
            case "message": this.handleDeviceMessage(event.data); break;
        }
        this.updateNetworkTelemetry();
    }

    handleDeviceMessage(raw) {
        if (typeof raw !== "string" || raw === "PONG") return;
        try {
            const message = JSON.parse(raw);
            if (message.type === "telemetry" || message.type === "status") {
                this.brain.setTelemetry(message);
                this.virtualBoard.update({ telemetry: message });
                this.renderTelemetry(message);
            } else if (message.type === "hello") this.terminal.success(`Device ready: ${message.device || "endpoint"}`);
            else if (message.type === "ack") this.terminal.success(`Device ACK: ${message.command || "command"}`);
            else if (message.type === "error") this.terminal.error(`Device: ${message.message || "unknown error"}`);
        } catch { this.terminal.info(`DEVICE ← ${raw}`); }
    }

    renderTelemetry(data = {}) {
        const root = document.getElementById("genericTelemetry");
        if (!root) return;
        const entries = Object.entries(data);
        root.innerHTML = entries.length ? entries.map(([key, value]) => `<div class="telemetry-row"><span>${this.escape(key)}</span><strong>${this.escape(String(value))}</strong></div>`).join("") : "<small>No telemetry reported.</small>";
    }

    compile() {
        const status = document.getElementById("compileStatus");
        const circuit = this.circuitBuilder.validate(false);
        if (!circuit.ok) {
            if (status) { status.textContent = "Circuit Error"; status.classList.add("status-error"); }
            circuit.errors.forEach(error => this.terminal.error(`CIRCUIT ${error}`));
            return { ok: false, errors: circuit.errors.map(message => ({ line: 0, message })) };
        }
        const source = this.editor.getValue();
        const report = this.buildManager.build({
            source,
            target: this.selectedBoard,
            project: { name: this.selectedBoard?.name || "Universal Project" }
        });
        if (!report.ok) {
            if (status) { status.textContent = "Build Failed"; status.classList.add("status-error"); }
            report.errors.forEach(message => this.terminal.error(`BUILD ERROR: ${message}`));
            report.warnings.forEach(message => this.terminal.warning(`BUILD WARN: ${message}`));
            return { ok: false, errors: report.errors.map(message => ({ line: 0, message })) };
        }
        if (status) { status.textContent = `Build OK (${report.instructionCount} ops)`; status.classList.remove("status-error"); }
        this.terminal.success(`BUILD OK — ${report.libraries.length} libraries, ${report.instructionCount} virtual operations`);
        report.missingIncludes.forEach(item => this.terminal.warning(`MISSING INCLUDE: ${item}`));
        return report.compiler;
    }

    async run() {
        const result = this.compile();
        if (!result?.ok) return;
        const status = document.getElementById("compileStatus");
        if (status) { status.textContent = "Brain Running"; status.classList.add("status-running"); }
        await this.brain.run(result);
        if (status) { status.textContent = this.brain.running ? "Brain Running" : "Brain Ready"; status.classList.remove("status-running"); }
    }

    stop() {
        this.brain.stop();
        const status = document.getElementById("compileStatus");
        if (status) { status.textContent = "Brain Ready"; status.classList.remove("status-running"); }
    }

    updateNetworkTelemetry() {
        const telemetry = this.network.telemetry;
        document.getElementById("networkPing")?.replaceChildren(document.createTextNode(`${telemetry.ping || "--"} ms`));
        document.getElementById("networkTx")?.replaceChildren(document.createTextNode(String(telemetry.packetsSent || 0)));
        document.getElementById("networkRx")?.replaceChildren(document.createTextNode(String(telemetry.packetsReceived || 0)));
    }

    setConnectionStatus(text, className = "") {
        const element = document.getElementById("connectionStatus");
        const state = document.getElementById("networkState");
        if (element) { element.textContent = text; element.className = className; }
        if (state) { state.textContent = text; state.className = className; }
    }

    seedWorkspace() {
        this.terminal.info("Universal hardware core loaded");
        this.terminal.info("PC Brain online");
        this.terminal.info("Generic interfaces only — device-specific hardware is opt-in via Hardware Packs");
        this.terminal.info("Build pipeline online — libraries and target diagnostics enabled");
    }

    keyboardShortcuts(event) {
        if (event.key === "F5") { event.preventDefault(); this.run(); return; }
        if (event.key === "Escape") { event.preventDefault(); this.stop(); return; }
        if (event.ctrlKey && event.key.toLowerCase() === "s") { event.preventDefault(); this.saveProject(); }
        if (event.ctrlKey && event.key.toLowerCase() === "b") { event.preventDefault(); this.compile(); }
    }

    escape(value) {
        return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const app = new UniversalHardwareIDE();
    await app.initialize();
});
