/**
 * ==========================================================
 * Atomic IDE
 * ESP32 Runtime Engine
 * Version 2.0.0
 * ==========================================================
 */

export class Runtime {

    constructor() {

        this.running = false;

        this.paused = false;

        this.started = false;

        this.frameRate = 60;

        this.tickInterval = 1000 / this.frameRate;

        this.lastFrame = 0;

        this.setupCallback = null;

        this.loopCallback = null;

        this.beforeLoop = [];

        this.afterLoop = [];

        this.modules = new Map();

        this.variables = new Map();

        this.timers = [];

        this.events = [];

        this.frame = 0;

        this.startTime = 0;

    }

    /**
     * Register Module
     */

    register(name, module) {

        this.modules.set(name, module);

    }

    get(name) {

        return this.modules.get(name);

    }

    /**
     * Arduino setup()
     */

    setup(callback) {

        this.setupCallback = callback;

    }

    /**
     * Arduino loop()
     */

    loop(callback) {

        this.loopCallback = callback;

    }

    /**
     * Start Runtime
     */

    start() {

        if (this.running) return;

        this.running = true;

        this.started = false;

        this.frame = 0;

        this.startTime = performance.now();

        requestAnimationFrame(

            this.update.bind(this)

        );

    }

    /**
     * Stop Runtime
     */

    stop() {

        this.running = false;

    }

    /**
     * Pause Runtime
     */

    pause() {

        this.paused = true;

    }

    resume() {

        this.paused = false;

    }

    /**
     * Update Loop
     */

    update(time) {

        if (!this.running)

            return;

        if (this.paused) {

            requestAnimationFrame(

                this.update.bind(this)

            );

            return;

        }

        if (

            time - this.lastFrame

            >= this.tickInterval

        ) {

            this.lastFrame = time;

            if (!this.started) {

                if (

                    typeof this.setupCallback ===

                    "function"

                ) {

                    this.setupCallback();

                }

                this.started = true;

            }

            this.beforeLoop.forEach(

                callback => callback()

            );

            if (

                typeof this.loopCallback ===

                "function"

            ) {

                this.loopCallback();

            }

            this.modules.forEach(

                module => {

                    if (

                        typeof module.tick ===

                        "function"

                    ) {

                        module.tick();

                    }

                }

            );

            this.processTimers();

            this.processEvents();

            this.afterLoop.forEach(

                callback => callback()

            );

            this.frame++;

        }

        requestAnimationFrame(

            this.update.bind(this)

        );

    }

    /**
     * Variables
     */

    setVariable(name, value) {

        this.variables.set(name, value);

    }

    getVariable(name) {

        return this.variables.get(name);

    }

    /**
     * Timers
     */

    every(interval, callback) {

        this.timers.push({

            interval,

            callback,

            last: performance.now()

        });

    }

    processTimers() {

        const now = performance.now();

        this.timers.forEach(timer => {

            if (

                now - timer.last >=

                timer.interval

            ) {

                timer.callback();

                timer.last = now;

            }

        });

    }

    /**
     * Events
     */

    emit(name, data) {

        this.events.push({

            name,

            data

        });

    }

    processEvents() {

        while (

            this.events.length > 0

        ) {

            this.events.shift();

        }

    }

    /**
     * Runtime Info
     */

    uptime() {

        return performance.now() -

            this.startTime;

    }

    fps() {

        return this.frameRate;

    }

    /**
     * Hooks
     */

    before(callback) {

        this.beforeLoop.push(callback);

    }

    after(callback) {

        this.afterLoop.push(callback);

    }

    /**
     * Reset
     */

    reset() {

        this.stop();

        this.variables.clear();

        this.events = [];

        this.timers = [];

        this.frame = 0;

    }

}
