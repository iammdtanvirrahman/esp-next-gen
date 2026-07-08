/**
 * ==========================================================
 * Atomic IDE
 * Runtime Performance Profiler
 * Version 2.0.0
 * ==========================================================
 */

export class Profiler {

    constructor(runtime = null) {

        this.runtime = runtime;

        this.enabled = true;

        this.frameCount = 0;

        this.lastFrame = performance.now();

        this.fps = 0;

        this.cpuUsage = 0;

        this.memoryUsage = 0;

        this.flashUsage = 0;

        this.functions = new Map();

        this.history = [];

        this.maxHistory = 300;

        this.startTime = performance.now();

    }

    /**
     * Start Function Timer
     */

    begin(name) {

        if (!this.enabled) return;

        this.functions.set(name, {

            start: performance.now()

        });

    }

    /**
     * Stop Function Timer
     */

    end(name) {

        if (!this.enabled) return;

        const func = this.functions.get(name);

        if (!func) return;

        func.time = performance.now() - func.start;

        func.calls = (func.calls || 0) + 1;

        this.functions.set(name, func);

    }

    /**
     * Update FPS
     */

    tick() {

        const now = performance.now();

        this.frameCount++;

        if (now - this.lastFrame >= 1000) {

            this.fps = this.frameCount;

            this.frameCount = 0;

            this.lastFrame = now;

            this.capture();

        }

    }

    /**
     * Capture Snapshot
     */

    capture() {

        if (this.runtime?.memory) {

            const stats =

                this.runtime.memory.statistics();

            this.memoryUsage =

                Number(stats.heapUsage);

            this.flashUsage =

                Number(stats.flashUsage);

        }

        this.history.push({

            time: Date.now(),

            fps: this.fps,

            cpu: this.cpuUsage,

            memory: this.memoryUsage,

            flash: this.flashUsage

        });

        if (

            this.history.length >

            this.maxHistory

        ) {

            this.history.shift();

        }

    }

    /**
     * CPU
     */

    setCPU(percent) {

        this.cpuUsage =

            Math.min(

                100,

                Math.max(0, percent)

            );

    }

    /**
     * Runtime
     */

    uptime() {

        return Math.floor(

            performance.now() -

            this.startTime

        );

    }

    /**
     * Slow Functions
     */

    hotspots(limit = 5) {

        return

        [...this.functions.entries()]

        .sort(

            (a,b)=>

                (b[1].time||0)

                -

                (a[1].time||0)

        )

        .slice(0,limit);

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            fps: this.fps,

            cpu: this.cpuUsage,

            memory: this.memoryUsage,

            flash: this.flashUsage,

            uptime: this.uptime(),

            monitoredFunctions:

                this.functions.size,

            history:

                this.history.length

        };

    }

    /**
     * Export Report
     */

    export() {

        return JSON.stringify({

            statistics:

                this.statistics(),

            functions:

                [...this.functions],

            history:

                this.history

        },null,2);

    }

    /**
     * Reset
     */

    reset() {

        this.functions.clear();

        this.history=[];

        this.frameCount=0;

        this.startTime=

            performance.now();

    }

}
