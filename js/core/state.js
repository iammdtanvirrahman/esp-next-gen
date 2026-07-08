/**
 * ==========================================================
 * Atomic IDE
 * Global State Manager
 * ==========================================================
 */

export class AppState {

    constructor() {

        this.state = {

            /* ==========================================
               Project
            ========================================== */

            project: {

                name: "Untitled Project",

                version: "1.0.0",

                path: "",

                modified: false,

                created: new Date(),

                lastSaved: null

            },

            /* ==========================================
               Editor
            ========================================== */

            editor: {

                tabs: [],

                activeTab: null,

                cursor: {

                    line: 1,

                    column: 1

                },

                language: "cpp",

                zoom: 100

            },

            /* ==========================================
               Hardware
            ========================================== */

            hardware: {

                board: "ESP32 DevKit V1",

                components: [],

                wires: [],

                selected: null,

                zoom: 1,

                grid: true

            },

            /* ==========================================
               Network
            ========================================== */

            network: {

                connected: false,

                ip: "",

                port: 81,

                latency: 0,

                packetsSent: 0,

                packetsReceived: 0

            },

            /* ==========================================
               Compiler
            ========================================== */

            compiler: {

                compiling: false,

                success: false,

                warnings: [],

                errors: []

            },

            /* ==========================================
               Terminal
            ========================================== */

            terminal: {

                history: [],

                autoScroll: true

            },

            /* ==========================================
               UI
            ========================================== */

            ui: {

                theme: "dracula",

                sidebar: true,

                inspector: true,

                terminal: true,

                activityBar: true,

                fullscreen: false

            }

        };

        this.listeners = new Map();

    }

    /* =======================================================
       Get
    ======================================================= */

    get(path) {

        return path.split(".").reduce((obj, key) => obj[key], this.state);

    }

    /* =======================================================
       Set
    ======================================================= */

    set(path, value) {

        const keys = path.split(".");

        const last = keys.pop();

        const target = keys.reduce((obj, key) => obj[key], this.state);

        target[last] = value;

        this.notify(path, value);

    }

    /* =======================================================
       Subscribe
    ======================================================= */

    subscribe(path, callback) {

        if (!this.listeners.has(path)) {

            this.listeners.set(path, []);

        }

        this.listeners.get(path).push(callback);

    }

    /* =======================================================
       Notify
    ======================================================= */

    notify(path, value) {

        if (!this.listeners.has(path)) return;

        this.listeners.get(path).forEach(callback => {

            callback(value);

        });

    }

    /* =======================================================
       Push
    ======================================================= */

    push(path, value) {

        const array = this.get(path);

        if (Array.isArray(array)) {

            array.push(value);

            this.notify(path, array);

        }

    }

    /* =======================================================
       Remove
    ======================================================= */

    remove(path, index) {

        const array = this.get(path);

        if (Array.isArray(array)) {

            array.splice(index, 1);

            this.notify(path, array);

        }

    }

    /* =======================================================
       Toggle Boolean
    ======================================================= */

    toggle(path) {

        const value = this.get(path);

        if (typeof value === "boolean") {

            this.set(path, !value);

        }

    }

    /* =======================================================
       Reset
    ======================================================= */

    reset() {

        location.reload();

    }

}
