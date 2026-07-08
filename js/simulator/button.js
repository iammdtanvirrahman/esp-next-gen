/**
 * ==========================================================
 * Atomic IDE
 * Virtual Push Button
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualButton {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.pin = options.pin ?? 0;

        this.name = options.name || "Button";

        this.mode = options.mode || "momentary";

        this.state = false;

        this.pressed = false;

        this.element = null;

        this.gpio = null;

        this.debounceTime = 25;

        this.lastPress = 0;

    }

    /**
     * Attach GPIO
     */

    attach(gpio) {

        this.gpio = gpio;

        gpio.pinMode(

            this.pin,

            "INPUT"

        );

    }

    /**
     * Mount UI
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-button";

        this.element.innerHTML = `

            <button class="button-face">

                ${this.name}

            </button>

        `;

        container.appendChild(

            this.element

        );

        const button =

            this.element.querySelector(

                ".button-face"

            );

        button.addEventListener(

            "mousedown",

            ()=>this.press()

        );

        button.addEventListener(

            "mouseup",

            ()=>this.release()

        );

        button.addEventListener(

            "mouseleave",

            ()=>this.release()

        );

        button.addEventListener(

            "touchstart",

            e=>{

                e.preventDefault();

                this.press();

            }

        );

        button.addEventListener(

            "touchend",

            ()=>this.release()

        );

    }

    /**
     * Press
     */

    press() {

        const now = performance.now();

        if (

            now - this.lastPress <

            this.debounceTime

        ) return;

        this.lastPress = now;

        this.pressed = true;

        if (

            this.mode === "toggle"

        ) {

            this.state = !this.state;

        }

        else {

            this.state = true;

        }

        this.updateGPIO();

        this.render();

    }

    /**
     * Release
     */

    release() {

        this.pressed = false;

        if (

            this.mode === "momentary"

        ) {

            this.state = false;

        }

        this.updateGPIO();

        this.render();

    }

    /**
     * GPIO Update
     */

    updateGPIO() {

        if (!this.gpio) return;

        this.gpio.digitalWrite(

            this.pin,

            this.state ? 1 : 0

        );

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        const button =

            this.element.querySelector(

                ".button-face"

            );

        button.classList.toggle(

            "pressed",

            this.state

        );

    }

    /**
     * Keyboard Support
     */

    bindKey(key = " ") {

        document.addEventListener(

            "keydown",

            e=>{

                if(e.key===key){

                    this.press();

                }

            }

        );

        document.addEventListener(

            "keyup",

            e=>{

                if(e.key===key){

                    this.release();

                }

            }

        );

    }

    /**
     * Export
     */

    serialize() {

        return {

            id:this.id,

            name:this.name,

            pin:this.pin,

            state:this.state,

            mode:this.mode

        };

    }

}
