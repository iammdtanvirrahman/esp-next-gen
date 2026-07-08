/**
 * ==========================================================
 * Atomic IDE
 * Simulation Engine
 * Version 1.0.0
 * ==========================================================
 */

export class Simulator {

    constructor() {

        this.running = false;

        this.paused = false;

        this.speed = 60;

        this.frame = 0;

        this.interval = null;

        this.components = [];

        this.gpio = new Map();

        this.events = new Map();

        this.telemetry = {

            fps:0,

            uptime:0,

            loopCount:0,

            memory:0

        };

        this.startTime = 0;

    }

    /**
     * Initialize
     */

    async initialize() {

        this.resetGPIO();

    }

    /**
     * Start Simulation
     */

    start() {

        if(this.running) return;

        this.running = true;

        this.paused = false;

        this.startTime = performance.now();

        this.interval = setInterval(

            ()=>{

                this.tick();

            },

            1000/this.speed

        );

        this.dispatch("start");

    }

    /**
     * Stop
     */

    stop() {

        clearInterval(this.interval);

        this.running = false;

        this.dispatch("stop");

    }

    /**
     * Pause
     */

    pause() {

        this.paused = true;

        this.dispatch("pause");

    }

    /**
     * Resume
     */

    resume() {

        this.paused = false;

        this.dispatch("resume");

    }

    /**
     * Reset
     */

    reset() {

        this.stop();

        this.frame = 0;

        this.telemetry.loopCount = 0;

        this.telemetry.uptime = 0;

        this.resetGPIO();

        this.dispatch("reset");

    }

    /**
     * Main Loop
     */

    tick() {

        if(!this.running) return;

        if(this.paused) return;

        this.frame++;

        this.telemetry.loopCount++;

        this.telemetry.uptime =

            Math.floor(

                performance.now()

                -

                this.startTime

            );

        this.updateComponents();

        this.dispatchTelemetry();

    }

    /**
     * Register Component
     */

    register(component){

        this.components.push(component);

    }

    /**
     * Remove Component
     */

    unregister(id){

        this.components =

        this.components.filter(

            c=>c.id!==id

        );

    }

    /**
     * Update Components
     */

    updateComponents(){

        this.components.forEach(component=>{

            if(

                typeof component.update ===

                "function"

            ){

                component.update(this);

            }

        });

    }

    /**
     * GPIO
     */

    resetGPIO(){

        this.gpio.clear();

        for(let i=0;i<40;i++){

            this.gpio.set(i,{

                mode:"INPUT",

                value:0

            });

        }

    }

    digitalWrite(pin,value){

        if(!this.gpio.has(pin)) return;

        this.gpio.get(pin).value=value;

    }

    digitalRead(pin){

        if(!this.gpio.has(pin))

            return 0;

        return this.gpio.get(pin).value;

    }

    pinMode(pin,mode){

        if(!this.gpio.has(pin))

            return;

        this.gpio.get(pin).mode=mode;

    }

    /**
     * Timer
     */

    millis(){

        return this.telemetry.uptime;

    }

    /**
     * Events
     */

    on(name,callback){

        this.events.set(

            name,

            callback

        );

    }

    dispatch(name,data={}){

        if(

            this.events.has(name)

        ){

            this.events.get(name)(data);

        }

    }

    dispatchTelemetry(){

        document.dispatchEvent(

            new CustomEvent(

                "simulation",

                {

                    detail:{

                        telemetry:

                        this.telemetry,

                        gpio:

                        Object.fromEntries(

                            this.gpio

                        )

                    }

                }

            )

        );

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            running:

            this.running,

            paused:

            this.paused,

            components:

            this.components.length,

            frame:

            this.frame,

            telemetry:

            this.telemetry

        };

    }

}
