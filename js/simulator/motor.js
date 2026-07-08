/**
 * ==========================================================
 * Atomic IDE
 * Virtual DC Motor (L298N Compatible)
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualMotor {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.name = options.name || "DC Motor";

        this.in1 = options.in1 ?? 18;

        this.in2 = options.in2 ?? 19;

        this.enable = options.enable ?? 5;

        this.speed = 0;

        this.targetSpeed = 0;

        this.direction = "STOP";

        this.rpm = 0;

        this.maxRPM = 320;

        this.acceleration = 5;

        this.rotation = 0;

        this.element = null;

        this.gpio = null;

    }

    /**
     * Attach GPIO
     */

    attach(gpio) {

        this.gpio = gpio;

        gpio.on(this.in1, () => this.update());

        gpio.on(this.in2, () => this.update());

        gpio.on(this.enable, () => this.update());

    }

    /**
     * Mount UI
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-motor";

        this.element.innerHTML = `

            <div class="motor-wheel"></div>

            <div class="motor-info">

                <div>${this.name}</div>

                <div class="motor-status">STOP</div>

            </div>

        `;

        container.appendChild(this.element);

    }

    /**
     * Update From GPIO
     */

    update() {

        if (!this.gpio) return;

        const in1 = this.gpio.digitalRead(this.in1);

        const in2 = this.gpio.digitalRead(this.in2);

        const en = this.gpio.get(this.enable);

        const pwm = en ? en.pwm : 255;

        this.targetSpeed = Math.round((pwm / 255) * 100);

        if (in1 && !in2) {

            this.direction = "FORWARD";

        }

        else if (!in1 && in2) {

            this.direction = "REVERSE";

        }

        else {

            this.direction = "STOP";

            this.targetSpeed = 0;

        }

    }

    /**
     * Called Every Simulator Tick
     */

    tick() {

        if (this.speed < this.targetSpeed) {

            this.speed += this.acceleration;

        }

        else if (this.speed > this.targetSpeed) {

            this.speed -= this.acceleration;

        }

        this.speed = Math.max(0, Math.min(100, this.speed));

        this.rpm = Math.round(

            (this.speed / 100) * this.maxRPM

        );

        if (this.direction !== "STOP") {

            const dir =

                this.direction === "FORWARD"

                ? 1

                : -1;

            this.rotation += dir * (this.rpm / 60) * 6;

        }

        this.render();

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        const wheel =

            this.element.querySelector(".motor-wheel");

        const status =

            this.element.querySelector(".motor-status");

        wheel.style.transform =

            `rotate(${this.rotation}deg)`;

        status.textContent =

            `${this.direction} | ${this.speed}% | ${this.rpm} RPM`;

    }

    /**
     * Manual Control
     */

    forward(speed = 100) {

        this.direction = "FORWARD";

        this.targetSpeed = speed;

    }

    reverse(speed = 100) {

        this.direction = "REVERSE";

        this.targetSpeed = speed;

    }

    stop() {

        this.direction = "STOP";

        this.targetSpeed = 0;

    }

    /**
     * Export State
     */

    serialize() {

        return {

            id: this.id,

            name: this.name,

            speed: this.speed,

            rpm: this.rpm,

            direction: this.direction,

            enable: this.enable,

            in1: this.in1,

            in2: this.in2

        };

    }

}
