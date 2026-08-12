/**
 * ==========================================================
 * ESP Next Gen IDE
 * Terminal Manager
 * ==========================================================
 */

export class Terminal {
    constructor() {
        this.container = null;
        this.input = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 1000;
        this.commands = new Map();
    }

    async initialize() {
        this.container = document.querySelector(".terminal-output") || document.getElementById("consoleOutput");
        this.input = document.querySelector(".terminal-input");
        this.registerCommands();
        this.registerEvents();
        this.info("ESP Next Gen Terminal Ready");
    }

    registerCommands() {
        this.commands.set("help", () => {
            this.info("Available: help, clear, date, time, status");
        });
        this.commands.set("clear", () => this.clear());
        this.commands.set("date", () => this.info(new Date().toDateString()));
        this.commands.set("time", () => this.info(new Date().toLocaleTimeString()));
        this.commands.set("status", () => this.success("IDE Online"));
    }

    registerEvents() {
        if (this.input) {
            this.input.addEventListener("keydown", e => {
                if (e.key === "Enter") {
                    this.execute(this.input.value);
                    this.input.value = "";
                }
            });
        }

        document.addEventListener("terminal-log", e => {
            const log = e.detail || {};
            this.write(`[${log.time || new Date().toLocaleTimeString()}] ${log.message || ""}`, log.level || "info");
        });
    }

    execute(command) {
        const normalized = String(command || "").trim();
        if (!normalized) return;

        this.history.push(normalized);
        this.historyIndex = this.history.length;
        this.write("> " + normalized, "info");

        const parts = normalized.split(/\s+/);
        const name = parts[0].toLowerCase();
        const handler = this.commands.get(name);

        if (handler) handler(parts);
        else this.error(`Unknown command: ${name}`);
    }

    write(message, type = "info") {
        if (!this.container) return;

        const line = document.createElement("div");
        line.className = `console-line ${type}`;
        line.textContent = String(message);
        this.container.appendChild(line);
        this.container.scrollTop = this.container.scrollHeight;

        while (this.container.children.length > this.maxHistory) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    info(message) { this.write(message, "info"); }
    success(message) { this.write(message, "success"); }
    warning(message) { this.write(message, "warning"); }
    error(message) { this.write(message, "error"); }

    clear() {
        if (this.container) this.container.innerHTML = "";
    }

    export() {
        if (!this.container) return;

        const lines = [...this.container.children].map(line => line.textContent);
        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "terminal.log";
        a.click();
        URL.revokeObjectURL(url);
    }
}
