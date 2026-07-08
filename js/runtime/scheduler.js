/**
 * ==========================================================
 * Atomic IDE
 * Runtime Scheduler
 * Version 2.0.0
 * ==========================================================
 */

export class Scheduler {

    constructor(runtime) {

        this.runtime = runtime;

        this.running = false;

        this.setupExecuted = false;

        this.loopDelay = 0;

        this.lastLoop = 0;

        this.loopCounter = 0;

        this.startTime = performance.now();

        this.tasks = [];

        this.intervals = [];

        this.timeouts = [];

        this.cpuLoad = 0;

    }

    /**
     * Start
     */

    start() {

        this.running = true;

        this.setupExecuted = false;

        this.loopCounter = 0;

        this.startTime = performance.now();

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

        const frameStart = performance.now();

        if (!this.setupExecuted) {

            this.runtime.interpreter?.runSetup();

            this.setupExecuted = true;

        }

        if (

            performance.now() - this.lastLoop >=

            this.loopDelay

        ) {

            this.lastLoop = performance.now();

            this.runtime.interpreter?.runLoop();

            this.loopCounter++;

        }

        this.processTasks();

        this.processIntervals();

        this.processTimeouts();

        const frameTime =

            performance.now() - frameStart;

        this.cpuLoad =

            Math.min(

                100,

                (frameTime / 16.67) * 100

            );

    }

    /**
     * delay()
     */

    delay(ms) {

        this.loopDelay = ms;

    }

    /**
     * millis()
     */

    millis() {

        return Math.floor(

            performance.now() -

            this.startTime

        );

    }

    /**
     * micros()
     */

    micros() {

        return Math.floor(

            (performance.now() -

            this.startTime) * 1000

        );

    }

    /**
     * Task
     */

    addTask(callback) {

        this.tasks.push({

            callback,

            enabled:true

        });

    }

    processTasks() {

        this.tasks.forEach(task=>{

            if(task.enabled){

                task.callback();

            }

        });

    }

    /**
     * Interval
     */

    every(ms,callback){

        this.intervals.push({

            ms,

            callback,

            last:performance.now()

        });

    }

    processIntervals(){

        const now = performance.now();

        this.intervals.forEach(interval=>{

            if(

                now - interval.last >=

                interval.ms

            ){

                interval.callback();

                interval.last = now;

            }

        });

    }

    /**
     * Timeout
     */

    after(ms,callback){

        this.timeouts.push({

            ms,

            callback,

            start:performance.now(),

            done:false

        });

    }

    processTimeouts(){

        const now = performance.now();

        this.timeouts.forEach(timer=>{

            if(

                !timer.done &&

                now - timer.start >= timer.ms

            ){

                timer.done=true;

                timer.callback();

            }

        });

    }

    /**
     * Runtime Stats
     */

    stats(){

        return{

            running:this.running,

            loops:this.loopCounter,

            millis:this.millis(),

            micros:this.micros(),

            cpu:this.cpuLoad.toFixed(1),

            tasks:this.tasks.length,

            intervals:this.intervals.length,

            timeouts:

            this.timeouts.filter(

                t=>!t.done

            ).length

        };

    }

    /**
     * Reset
     */

    reset(){

        this.tasks=[];

        this.intervals=[];

        this.timeouts=[];

        this.loopCounter=0;

        this.setupExecuted=false;

        this.startTime=performance.now();

    }

}
