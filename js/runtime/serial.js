/**
 * ==========================================================
 * Atomic IDE
 * Professional Serial Monitor
 * Version 2.0.0
 * ==========================================================
 */

export class SerialMonitor {

    constructor() {

        this.baudRate = 115200;

        this.connected = false;

        this.autoScroll = true;

        this.maxLines = 5000;

        this.logs = [];

        this.filters = [];

        this.consoleElement = null;

        this.listeners = [];

    }

    /**
     * Serial.begin()
     */

    begin(baud = 115200) {

        this.baudRate = baud;

        this.connected = true;

        this.println(

            `Serial initialized @ ${baud} baud`

        );

    }

    /**
     * Close
     */

    end() {

        this.connected = false;

        this.println("Serial connection closed");

    }

    /**
     * Print
     */

    print(message) {

        this.addLog(String(message), false);

    }

    /**
     * Println
     */

    println(message = "") {

        this.addLog(String(message), true);

    }

    /**
     * Error
     */

    error(message) {

        this.addLog(

            `[ERROR] ${message}`,

            true,

            "error"

        );

    }

    /**
     * Warning
     */

    warning(message) {

        this.addLog(

            `[WARNING] ${message}`,

            true,

            "warning"

        );

    }

    /**
     * Success
     */

    success(message) {

        this.addLog(

            `[OK] ${message}`,

            true,

            "success"

        );

    }

    /**
     * Timestamp
     */

    timestamp() {

        const now = new Date();

        return now.toLocaleTimeString();

    }

    /**
     * Add Log
     */

    addLog(text, newline = true, type = "normal") {

        const entry = {

            time: this.timestamp(),

            text,

            type

        };

        this.logs.push(entry);

        if (

            this.logs.length >

            this.maxLines

        ) {

            this.logs.shift();

        }

        this.render(entry);

        this.notify(entry);

    }

    /**
     * Attach Console Element
     */

    attach(element) {

        this.consoleElement = element;

    }

    /**
     * Render
     */

    render(entry) {

        if (!this.consoleElement) return;

        const line = document.createElement("div");

        line.className =

            `serial-line ${entry.type}`;

        line.innerHTML =

            `<span class="serial-time">[${entry.time}]</span> ${entry.text}`;

        this.consoleElement.appendChild(line);

        if (this.autoScroll) {

            this.consoleElement.scrollTop =

                this.consoleElement.scrollHeight;

        }

    }

    /**
     * Clear Console
     */

    clear() {

        this.logs = [];

        if (this.consoleElement) {

            this.consoleElement.innerHTML = "";

        }

    }

    /**
     * Search
     */

    search(keyword) {

        return this.logs.filter(log =>

            log.text.toLowerCase()

                .includes(

                    keyword.toLowerCase()

                )

        );

    }

    /**
     * Filter by Type
     */

    filter(type) {

        return this.logs.filter(

            log => log.type === type

        );

    }

    /**
     * Export
     */

    export() {

        return this.logs

            .map(log =>

                `[${log.time}] ${log.text}`

            )

            .join("\n");

    }

    /**
     * Event Listener
     */

    onMessage(callback) {

        this.listeners.push(callback);

    }

    notify(entry) {

        this.listeners.forEach(

            callback => callback(entry)

        );

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            baudRate: this.baudRate,

            connected: this.connected,

            totalMessages: this.logs.length,

            autoScroll: this.autoScroll

        };

    }

}
