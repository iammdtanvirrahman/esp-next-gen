/**
 * ==========================================================
 * Atomic IDE
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

/**
 * Main Application
 */

class AtomicIDE {

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

    /**
     * Initialize
     */

    async initialize() {

        this.logger.info("Starting Atomic IDE...");

        await this.theme.initialize();

        await this.layout.initialize();

        await this.editor.initialize();

        await this.explorer.initialize();

        await this.hardware.initialize();

        await this.network.initialize();

        await this.terminal.initialize();

        this.registerEvents();

        this.logger.success("Atomic IDE Ready");

    }

    /**
     * Global Events
     */

    registerEvents() {

        window.addEventListener("resize", () => {

            this.layout.resize();

        });

        window.addEventListener("keydown", e => {

            this.keyboardShortcuts(e);

        });

    }

    /**
     * Keyboard Shortcuts
     */

    keyboardShortcuts(event) {

        if (event.ctrlKey && event.key === "s") {

            event.preventDefault();

            this.logger.info("Save Project");

        }

        if (event.ctrlKey && event.key === "o") {

            event.preventDefault();

            this.logger.info("Open Project");

        }

        if (event.ctrlKey && event.key === "p") {

            event.preventDefault();

            this.logger.info("Command Palette");

        }

        if (event.key === "F5") {

            event.preventDefault();

            this.logger.info("Run Project");

        }

    }

}

/**
 * Bootstrap
 */

window.addEventListener("DOMContentLoaded", async () => {

    const app = new AtomicIDE();

    await app.initialize();

});
