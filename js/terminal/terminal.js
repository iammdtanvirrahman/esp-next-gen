/**
 * ==========================================================
 * Atomic IDE
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

    /**
     * Initialize
     */

    async initialize() {

        this.container = document.querySelector(".terminal-output");

        this.input = document.querySelector(".terminal-input");

        this.registerCommands();

        this.registerEvents();

        this.info("Atomic IDE Terminal Ready");

    }

    /**
     * Register Commands
     */

    registerCommands() {

        this.commands.set("help", () => {

            this.info("Available Commands:");

            this.info("help");

            this.info("clear");

            this.info("date");

            this.info("time");

            this.info("status");

        });

        this.commands.set("clear", () => {

            this.clear();

        });

        this.commands.set("date", () => {

            this.info(new Date().toDateString());

        });

        this.commands.set("time", () => {

            this.info(new Date().toLocaleTimeString());

        });

        this.commands.set("status", () => {

            this.success("System Online");

        });

    }

    /**
     * Register Events
     */

    registerEvents() {

        if (!this.input) return;

        this.input.addEventListener("keydown", e => {

            if (e.key === "Enter") {

                this.execute(this.input.value);

                this.input.value = "";

            }

        });

        document.addEventListener("terminal-log", e => {

            const log = e.detail;

            this.write(

                `[${log.time}] ${log.message}`,

                log.level

            );

        });

    }

    /**
     * Execute Command
     */

    execute(command) {

        command = command.trim();

        if (!command) return;

        this.history.push(command);

        this.historyIndex = this.history.length;

        this.write("> " + command, "info");

        const parts = command.split(" ");

        const name = parts[0].toLowerCase();

        if (this.commands.has(name)) {

            this.commands.get(name)(parts);

        }

        else {

            this.error("Unknown command");

        }

    }

    /**
     * Write
     */

    write(message, type = "info") {

        if (!this.container) return;

        const line = document.createElement("div");

        line.className =

            "terminal-line terminal-" + type;

        line.textContent = message;

        this.container.appendChild(line);

        this.container.scrollTop =

            this.container.scrollHeight;

        while (

            this.container.children.length >

            this.maxHistory

        ) {

            this.container.removeChild(

                this.container.firstChild

            );

        }

    }

    /**
     * Log Types
     */

    info(message) {

        this.write(message, "info");

    }

    success(message) {

        this.write(message, "success");

    }

    warning(message) {

        this.write(message, "warning");

    }

    error(message) {

        this.write(message, "error");

    }

    /**
     * Clear
     */

    clear() {

        if (this.container) {

            this.container.innerHTML = "";

        }

    }

    /**
     * Export Log
     */

    export() {

        if (!this.container) return;

        const lines = [];

        this.container

            .querySelectorAll(".terminal-line")

            .forEach(line => {

                lines.push(line.textContent);

            });

        const blob = new Blob(

            [lines.join("\n")],

            {

                type: "text/plain"

            }

        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;

        a.download = "terminal.log";

        a.click();

        URL.revokeObjectURL(url);

    }

}
