/**
 * ==========================================================
 * Atomic IDE
 * Virtual Relay Module
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualRelay {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.name = options.name || "Relay";

        this.pin = options.pin ?? 26;

        this.activeHigh = options.activeHigh ?? true;

        this.state = false;

        this.gpio = null;

        this.element = null;

        this.listeners = [];

    }

    /**
     * Attach GPIO
     */

    attach(gpio) {

        this.gpio = gpio;

        gpio.on(this.pin, () => {

            this.update();

        });

    }

    /**
     * Mount UI
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-relay";

        this.element.innerHTML = `

            <div class="relay-header">

                ⚡ ${this.name}

            </div>

            <div class="relay-led"></div>

            <div class="relay-status">

                OFF

            </div>

        `;

        container.appendChild(this.element);

        this.render();

    }

    /**
     * Update From GPIO
     */

    update() {

        if (!this.gpio) return;

        const value = this.gpio.digitalRead(this.pin);

        this.state = this.activeHigh

            ? value === 1

            : value === 0;

        this.render();

        this.notify();

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        const led =

            this.element.querySelector(".relay-led");

        const status =

            this.element.querySelector(".relay-status");

        led.style.background =

            this.state

            ? "#00ff66"

            : "#333";

        led.style.boxShadow =

            this.state

            ? "0 0 18px #00ff66"

            : "none";

        status.textContent =

            this.state

            ? "ON"

            : "OFF";

    }

    /**
     * Manual Control
     */

    on() {

        this.state = true;

        this.render();

        this.notify();

    }

    off() {

        this.state = false;

        this.render();

        this.notify();

    }

    toggle() {

        this.state = !this.state;

        this.render();

        this.notify();

    }

    /**
     * Connected Device Callback
     */

    connect(callback) {

        if (

            typeof callback === "function"

        ) {

            this.listeners.push(callback);

        }

    }

    notify() {

        this.listeners.forEach(listener => {

            listener(this.state);

        });

    }

    /**
     * Relay Contacts
     */

    isNOClosed() {

        return this.state;

    }

    isNCClosed() {

        return !this.state;

    }

    /**
     * Export
     */

    serialize() {

        return {

            id: this.id,

            name: this.name,

            pin: this.pin,

            state: this.state,

            activeHigh: this.activeHigh

        };

    }

}
