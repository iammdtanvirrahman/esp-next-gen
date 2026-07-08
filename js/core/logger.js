/**
 * ==========================================================
 * Atomic IDE
 * Logger System
 * ==========================================================
 */

export class Logger {

    constructor() {

        this.logs = [];

        this.debugMode = true;

        this.maxLogs = 5000;

    }

    /* ======================================================
       Timestamp
    ====================================================== */

    timestamp() {

        return new Date().toLocaleTimeString();

    }

    /* ======================================================
       Internal
    ====================================================== */

    write(level, message, source = "System") {

        const log = {

            id: crypto.randomUUID(),

            level,

            message,

            source,

            time: this.timestamp()

        };

        this.logs.push(log);

        if (this.logs.length > this.maxLogs) {

            this.logs.shift();

        }

        this.console(log);

        this.terminal(log);

    }

    /* ======================================================
       Browser Console
    ====================================================== */

    console(log) {

        const text =
            `[${log.time}] [${log.source}] ${log.message}`;

        switch (log.level) {

            case "info":

                console.info(
                    `%c${text}`,
                    "color:#8BE9FD;font-weight:bold;"
                );

                break;

            case "success":

                console.log(
                    `%c${text}`,
                    "color:#50FA7B;font-weight:bold;"
                );

                break;

            case "warning":

                console.warn(
                    `%c${text}`,
                    "color:#F1FA8C;font-weight:bold;"
                );

                break;

            case "error":

                console.error(
                    `%c${text}`,
                    "color:#FF5555;font-weight:bold;"
                );

                break;

            case "debug":

                if (this.debugMode) {

                    console.log(
                        `%c${text}`,
                        "color:#BD93F9;"
                    );

                }

                break;

        }

    }

    /* ======================================================
       IDE Terminal
    ====================================================== */

    terminal(log) {

        document.dispatchEvent(

            new CustomEvent("terminal-log", {

                detail: log

            })

        );

    }

    /* ======================================================
       Public API
    ====================================================== */

    info(message, source) {

        this.write("info", message, source);

    }

    success(message, source) {

        this.write("success", message, source);

    }

    warning(message, source) {

        this.write("warning", message, source);

    }

    error(message, source) {

        this.write("error", message, source);

    }

    debug(message, source) {

        this.write("debug", message, source);

    }

    /* ======================================================
       Timer
    ====================================================== */

    startTimer(label) {

        console.time(label);

    }

    stopTimer(label) {

        console.timeEnd(label);

    }

    /* ======================================================
       Clear
    ====================================================== */

    clear() {

        this.logs = [];

        console.clear();

    }

    /* ======================================================
       Export
    ====================================================== */

    export() {

        const blob = new Blob(

            [

                JSON.stringify(

                    this.logs,

                    null,

                    4

                )

            ],

            {

                type: "application/json"

            }

        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;

        a.download = "atomic-ide-logs.json";

        a.click();

        URL.revokeObjectURL(url);

    }

    /* ======================================================
       Search
    ====================================================== */

    search(keyword) {

        return this.logs.filter(log =>

            log.message
                .toLowerCase()
                .includes(keyword.toLowerCase())

        );

    }

    /* ======================================================
       Filter
    ====================================================== */

    filter(level) {

        return this.logs.filter(

            log => log.level === level

        );

    }

    /* ======================================================
       Statistics
    ====================================================== */

    stats() {

        return {

            total: this.logs.length,

            info: this.filter("info").length,

            success: this.filter("success").length,

            warning: this.filter("warning").length,

            error: this.filter("error").length,

            debug: this.filter("debug").length

        };

    }

}
