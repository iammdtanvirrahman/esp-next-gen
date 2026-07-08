/**
 * ==========================================================
 * Atomic IDE
 * Runtime Event Loop
 * Version 2.0.0
 * ==========================================================
 */

export class EventLoop {

    constructor() {

        this.running = false;

        this.queue = [];

        this.listeners = new Map();

        this.intervals = new Map();

        this.timeouts = new Map();

        this.nextId = 1;

        this.processedEvents = 0;

        this.errors = [];

    }

    /**
     * Start
     */

    start() {

        this.running = true;

    }

    /**
     * Stop
     */

    stop() {

        this.running = false;

    }

    /**
     * Tick
     */

    tick() {

        if (!this.running) return;

        this.processQueue();

        this.processTimeouts();

        this.processIntervals();

    }

    /**
     * Emit Event
     */

    emit(name, data = {}) {

        this.queue.push({

            type: name,

            data,

            time: performance.now()

        });

    }

    /**
     * Listen
     */

    on(name, callback) {

        if (!this.listeners.has(name)) {

            this.listeners.set(name, []);

        }

        this.listeners.get(name).push(callback);

    }

    /**
     * Remove Listener
     */

    off(name, callback) {

        if (!this.listeners.has(name))

            return;

        const list =

            this.listeners.get(name)

            .filter(fn => fn !== callback);

        this.listeners.set(name, list);

    }

    /**
     * Queue Processor
     */

    processQueue() {

        while (this.queue.length > 0) {

            const event = this.queue.shift();

            const callbacks =

                this.listeners.get(event.type) || [];

            callbacks.forEach(callback => {

                try {

                    callback(event.data);

                }

                catch (error) {

                    this.errors.push({

                        event: event.type,

                        error

                    });

                }

            });

            this.processedEvents++;

        }

    }

    /**
     * setTimeout()
     */

    setTimeout(callback, delay) {

        const id = this.nextId++;

        this.timeouts.set(id, {

            callback,

            delay,

            start: performance.now()

        });

        return id;

    }

    /**
     * clearTimeout()
     */

    clearTimeout(id) {

        this.timeouts.delete(id);

    }

    /**
     * Process Timeouts
     */

    processTimeouts() {

        const now = performance.now();

        this.timeouts.forEach((timer, id) => {

            if (

                now - timer.start >= timer.delay

            ) {

                try {

                    timer.callback();

                }

                catch (e) {

                    this.errors.push(e);

                }

                this.timeouts.delete(id);

            }

        });

    }

    /**
     * setInterval()
     */

    setInterval(callback, interval) {

        const id = this.nextId++;

        this.intervals.set(id, {

            callback,

            interval,

            last: performance.now()

        });

        return id;

    }

    /**
     * clearInterval()
     */

    clearInterval(id) {

        this.intervals.delete(id);

    }

    /**
     * Process Intervals
     */

    processIntervals() {

        const now = performance.now();

        this.intervals.forEach(interval => {

            if (

                now - interval.last >=

                interval.interval

            ) {

                interval.last = now;

                try {

                    interval.callback();

                }

                catch (e) {

                    this.errors.push(e);

                }

            }

        });

    }

    /**
     * Simulate Interrupt
     */

    interrupt(name, data = {}) {

        this.emit(

            `interrupt:${name}`,

            data

        );

    }

    /**
     * Queue Size
     */

    size() {

        return this.queue.length;

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            running: this.running,

            queue: this.queue.length,

            listeners: this.listeners.size,

            processed: this.processedEvents,

            timeouts: this.timeouts.size,

            intervals: this.intervals.size,

            errors: this.errors.length

        };

    }

    /**
     * Reset
     */

    reset() {

        this.queue = [];

        this.listeners.clear();

        this.timeouts.clear();

        this.intervals.clear();

        this.errors = [];

        this.processedEvents = 0;

        this.nextId = 1;

    }

}
