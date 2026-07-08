/**
 * ==========================================================
 * Atomic IDE
 * GPIO Controller
 * Version 1.0.0
 * ==========================================================
 */

export class GPIOController {

    constructor() {

        this.pins = new Map();

        this.interrupts = new Map();

        this.listeners = new Map();

        this.initializePins();

    }

    /**
     * Initialize GPIO Pins
     */

    initializePins() {

        for (let pin = 0; pin <= 39; pin++) {

            this.pins.set(pin, {

                number: pin,

                mode: "INPUT",

                value: 0,

                analog: 0,

                pwm: 0,

                pullup: false,

                pulldown: false,

                enabled: true

            });

        }

    }

    /**
     * Reset
     */

    reset() {

        this.initializePins();

    }

    /**
     * Pin Mode
     */

    pinMode(pin, mode) {

        if (!this.exists(pin)) return;

        this.pins.get(pin).mode = mode;

    }

    /**
     * Digital Write
     */

    digitalWrite(pin, value) {

        if (!this.exists(pin)) return;

        const gpio = this.pins.get(pin);

        gpio.value = value ? 1 : 0;

        this.trigger(pin);

    }

    /**
     * Digital Read
     */

    digitalRead(pin) {

        if (!this.exists(pin)) return 0;

        return this.pins.get(pin).value;

    }

    /**
     * Analog Write
     */

    analogWrite(pin, value) {

        if (!this.exists(pin)) return;

        this.pins.get(pin).analog = value;

        this.trigger(pin);

    }

    /**
     * Analog Read
     */

    analogRead(pin) {

        if (!this.exists(pin)) return 0;

        return this.pins.get(pin).analog;

    }

    /**
     * PWM
     */

    pwmWrite(pin, duty) {

        if (!this.exists(pin)) return;

        this.pins.get(pin).pwm = duty;

        this.trigger(pin);

    }

    /**
     * Pull-Up
     */

    enablePullup(pin) {

        if (!this.exists(pin)) return;

        this.pins.get(pin).pullup = true;

    }

    /**
     * Pull-Down
     */

    enablePulldown(pin) {

        if (!this.exists(pin)) return;

        this.pins.get(pin).pulldown = true;

    }

    /**
     * Interrupt
     */

    attachInterrupt(pin, callback) {

        this.interrupts.set(pin, callback);

    }

    detachInterrupt(pin) {

        this.interrupts.delete(pin);

    }

    trigger(pin) {

        if (

            this.interrupts.has(pin)

        ) {

            this.interrupts.get(pin)(

                this.pins.get(pin)

            );

        }

        if (

            this.listeners.has(pin)

        ) {

            this.listeners.get(pin).forEach(

                callback => callback(

                    this.pins.get(pin)

                )

            );

        }

    }

    /**
     * Listener
     */

    on(pin, callback) {

        if (

            !this.listeners.has(pin)

        ) {

            this.listeners.set(

                pin,

                []

            );

        }

        this.listeners.get(pin)

            .push(callback);

    }

    /**
     * Exists
     */

    exists(pin) {

        return this.pins.has(Number(pin));

    }

    /**
     * Get Pin
     */

    get(pin) {

        return this.pins.get(Number(pin));

    }

    /**
     * Export
     */

    export() {

        return Array.from(

            this.pins.values()

        );

    }

    /**
     * Import
     */

    import(data) {

        data.forEach(pin => {

            this.pins.set(

                pin.number,

                pin

            );

        });

    }

    /**
     * Statistics
     */

    statistics() {

        let high = 0;

        let low = 0;

        this.pins.forEach(pin => {

            if (pin.value)

                high++;

            else

                low++;

        });

        return {

            total: this.pins.size,

            high,

            low

        };

    }

}
