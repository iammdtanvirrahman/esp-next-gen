/**
 * ==========================================================
 * Atomic IDE
 * Professional Runtime Debugger
 * Version 2.0.0
 * ==========================================================
 */

export class Debugger {

    constructor(runtime) {

        this.runtime = runtime;

        this.breakpoints = new Set();

        this.watchList = new Map();

        this.callStack = [];

        this.currentLine = 0;

        this.running = false;

        this.paused = false;

        this.listeners = [];

        this.history = [];

        this.maxHistory = 1000;

    }

    /**
     * Start
     */

    start() {

        this.running = true;

        this.paused = false;

    }

    /**
     * Stop
     */

    stop() {

        this.running = false;

        this.paused = false;

        this.currentLine = 0;

    }

    /**
     * Pause
     */

    pause() {

        this.paused = true;

        this.emit("pause");

    }

    /**
     * Resume
     */

    resume() {

        this.paused = false;

        this.emit("resume");

    }

    /**
     * Step Into
     */

    stepInto() {

        if (!this.running)

            return;

        this.currentLine++;

        this.emit("step");

    }

    /**
     * Step Over
     */

    stepOver() {

        this.stepInto();

    }

    /**
     * Breakpoints
     */

    addBreakpoint(line) {

        this.breakpoints.add(line);

    }

    removeBreakpoint(line) {

        this.breakpoints.delete(line);

    }

    clearBreakpoints() {

        this.breakpoints.clear();

    }

    hasBreakpoint(line) {

        return this.breakpoints.has(line);

    }

    /**
     * Execute Line
     */

    execute(line) {

        this.currentLine = line;

        this.recordHistory(line);

        if (

            this.breakpoints.has(line)

        ) {

            this.pause();

        }

    }

    /**
     * Watch Variables
     */

    watch(name, value = null) {

        this.watchList.set(name, value);

    }

    updateWatch(name, value) {

        if (

            this.watchList.has(name)

        ) {

            this.watchList.set(name, value);

        }

    }

    removeWatch(name) {

        this.watchList.delete(name);

    }

    clearWatchList() {

        this.watchList.clear();

    }

    /**
     * Call Stack
     */

    pushFunction(name) {

        this.callStack.push({

            function: name,

            time: performance.now()

        });

    }

    popFunction() {

        this.callStack.pop();

    }

    getCallStack() {

        return [...this.callStack];

    }

    /**
     * History
     */

    recordHistory(line) {

        this.history.push({

            line,

            time: performance.now()

        });

        if (

            this.history.length >

            this.maxHistory

        ) {

            this.history.shift();

        }

    }

    /**
     * Exception
     */

    exception(error) {

        console.error(error);

        this.pause();

        this.emit(

            "exception",

            error

        );

    }

    /**
     * Runtime State
     */

    state() {

        return {

            running: this.running,

            paused: this.paused,

            currentLine: this.currentLine,

            breakpoints: [...this.breakpoints],

            watches: [...this.watchList],

            stackDepth: this.callStack.length

        };

    }

    /**
     * Events
     */

    on(callback) {

        this.listeners.push(callback);

    }

    emit(type, data = null) {

        this.listeners.forEach(

            callback =>

                callback({

                    type,

                    data,

                    debugger: this

                })

        );

    }

    /**
     * Reset
     */

    reset() {

        this.breakpoints.clear();

        this.watchList.clear();

        this.callStack = [];

        this.history = [];

        this.currentLine = 0;

        this.running = false;

        this.paused = false;

    }

}
