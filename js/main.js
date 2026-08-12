/**
 * ==========================================================
 * ESP Next Gen IDE
 * Main Entry Point
 * ==========================================================
 */

import { AppState } from "./core/state.js";
import { Logger } from "./core/logger.js";
import { LayoutManager } from "./ui/layout.js";
import { ThemeManager } from "./ui/theme.js";
import { EditorManager } from "./editor/editor.js";
import { Explorer } from "./explorer/explorer.js";
import { HardwareWorkspace } from "./hardware/workspace.js";
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
            this.seedDefaultWorkspace();

            this.logger.success("ESP Next Gen IDE Ready");

        } catch (error) {

            console.error(error);
            this.logger.error(`Startup failed: ${error.message}`);

            const consoleOutput = document.getElementById("consoleOutput");

            if (consoleOutput) {
                consoleOutput.innerHTML = `<div class="console-line error">Startup failed: ${error.message}</div>`;
            }

        }

    }

    registerEvents() {

        window.addEventListener("resize", () => {
            this.layout.resize();
        });

        window.addEventListener("keydown", event => {
            this.keyboardShortcuts(event);
        });

    }

    seedDefaultWorkspace() {

        const connectionStatus = document.getElementById("connectionStatus");
        const compileStatus = document.getElementById("compileStatus");

        if (connectionStatus) {
            connectionStatus.textContent = "Disconnected";
        }

        if (compileStatus) {
            compileStatus.textContent = "Ready";
        }

        if (this.terminal?.write) {
            this.terminal.write("ESP32 workspace initialized", "success");
            this.terminal.write("Press F5 to simulate running the project", "info");
        }

    }

    keyboardShortcuts(event) {

        if (event.ctrlKey && event.key.toLowerCase() === "s") {

            event.preventDefault();
            this.logger.info("Project saved (demo)");
            this.terminal?.write?.("Project saved (demo)", "success");

        }

        if (event.ctrlKey && event.key.toLowerCase() === "o") {

            event.preventDefault();
            this.logger.info("Open project requested");
            this.terminal?.write?.("Open project requested", "info");

        }

        if (event.ctrlKey && event.key.toLowerCase() === "p") {

            event.preventDefault();
            this.logger.info("Command palette requested");
            this.terminal?.write?.("Command palette requested", "info");

        }

        if (event.key === "F5") {

            event.preventDefault();

            const compileStatus = document.getElementById("compileStatus");

            if (compileStatus) {
                compileStatus.textContent = "Running";
                compileStatus.classList.add("status-running");
            }

            this.logger.info("Running ESP32 simulation");
            this.terminal?.write?.("Running ESP32 simulation", "warning");

            setTimeout(() => {

                if (compileStatus) {
                    compileStatus.textContent = "Ready";
                    compileStatus.classList.remove("status-running");
                }

                this.terminal?.write?.("Simulation finished successfully", "success");

            }, 1500);

        }

    }

}

window.addEventListener("DOMContentLoaded", async () => {

    const app = new ESPNextGenIDE();
    await app.initialize();

});
