/**
 * ==========================================================
 * Atomic IDE
 * Virtual LED
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualLED {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.pin = options.pin ?? 2;

        this.name = options.name || "LED";

        this.color = options.color || "#ff3b30";

        this.brightness = 255;

        this.state = false;

        this.element = null;

        this.gpio = null;

    }

    /**
     * Attach GPIO Controller
     */

    attach(gpio) {

        this.gpio = gpio;

        gpio.on(this.pin, () => {

            this.update();

        });

    }

    /**
     * Create HTML
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-led";

        this.element.innerHTML = `

            <div class="virtual-led-light"></div>

            <div class="virtual-led-label">

                ${this.name}

            </div>

        `;

        container.appendChild(this.element);

        this.render();

    }

    /**
     * Update
     */

    update() {

        if (!this.gpio) return;

        const pin = this.gpio.get(this.pin);

        if (!pin) return;

        this.state = pin.value === 1;

        this.brightness =

            pin.pwm > 0

            ? pin.pwm

            : this.state

            ? 255

            : 0;

        this.render();

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        const light =

            this.element.querySelector(

                ".virtual-led-light"

            );

        light.style.background =

            this.state

            ? this.color

            : "#222";

        light.style.opacity =

            this.brightness / 255;

        light.style.boxShadow =

            this.state

            ?

            `0 0 25px ${this.color}`

            :

            "none";

    }

    /**
     * Manual Control
     */

    on() {

        this.state = true;

        this.brightness = 255;

        this.render();

    }

    off() {

        this.state = false;

        this.brightness = 0;

        this.render();

    }

    toggle() {

        this.state = !this.state;

        this.render();

    }

    setBrightness(value) {

        this.brightness =

            Math.max(

                0,

                Math.min(

                    255,

                    value

                )

            );

        this.render();

    }

    setColor(color) {

        this.color = color;

        this.render();

    }

    /**
     * Export
     */

    serialize() {

        return {

            id:this.id,

            pin:this.pin,

            name:this.name,

            state:this.state,

            brightness:this.brightness,

            color:this.color

        };

    }

}
