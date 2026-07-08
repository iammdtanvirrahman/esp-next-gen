/**
 * ==========================================================
 * Atomic IDE
 * HC-SR04 Ultrasonic Sensor Simulator
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualUltrasonic {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.name = options.name || "HC-SR04";

        this.trigPin = options.trigPin ?? 5;

        this.echoPin = options.echoPin ?? 18;

        this.distance = 100;

        this.minDistance = 2;

        this.maxDistance = 400;

        this.noise = true;

        this.objectSpeed = 0;

        this.gpio = null;

        this.element = null;

        this.lastMeasurement = 0;

        this.measureInterval = 50;

    }

    /**
     * Attach GPIO
     */

    attach(gpio) {

        this.gpio = gpio;

    }

    /**
     * Mount UI
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-ultrasonic";

        this.element.innerHTML = `

            <div class="ultrasonic-title">

                📡 ${this.name}

            </div>

            <div class="ultrasonic-distance"></div>

            <input
                class="ultrasonic-slider"
                type="range"
                min="${this.minDistance}"
                max="${this.maxDistance}"
                value="${this.distance}"
            >

        `;

        container.appendChild(this.element);

        const slider = this.element.querySelector(".ultrasonic-slider");

        slider.addEventListener("input",(e)=>{

            this.setDistance(Number(e.target.value));

        });

        this.render();

    }

    /**
     * Read Distance
     */

    readDistance() {

        this.update();

        return Number(this.distance.toFixed(1));

    }

    /**
     * pulseIn() Simulation
     */

    pulseIn() {

        return Math.round(

            this.readDistance() * 58

        );

    }

    /**
     * NewPing Compatibility
     */

    ping_cm() {

        return Math.round(

            this.readDistance()

        );

    }

    ping_mm() {

        return Math.round(

            this.readDistance() * 10

        );

    }

    /**
     * Set Distance
     */

    setDistance(value) {

        this.distance = Math.max(

            this.minDistance,

            Math.min(

                this.maxDistance,

                value

            )

        );

        this.render();

    }

    /**
     * Simulate Moving Object
     */

    move(speed) {

        this.objectSpeed = speed;

    }

    /**
     * Update
     */

    update() {

        const now = performance.now();

        if (

            now - this.lastMeasurement <

            this.measureInterval

        ) {

            return;

        }

        this.lastMeasurement = now;

        if (this.objectSpeed !== 0) {

            this.distance += this.objectSpeed;

        }

        if (this.noise) {

            this.distance +=

                (Math.random() - 0.5) * 0.5;

        }

        this.distance = Math.max(

            this.minDistance,

            Math.min(

                this.maxDistance,

                this.distance

            )

        );

        this.render();

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        this.element.querySelector(

            ".ultrasonic-distance"

        ).textContent =

            `Distance : ${this.distance.toFixed(1)} cm`;

        this.element.querySelector(

            ".ultrasonic-slider"

        ).value = this.distance;

    }

    /**
     * Random Environment
     */

    randomize() {

        this.distance =

            this.minDistance +

            Math.random() *

            (this.maxDistance - this.minDistance);

        this.render();

    }

    /**
     * Export
     */

    serialize() {

        return {

            id: this.id,

            trigPin: this.trigPin,

            echoPin: this.echoPin,

            distance: this.distance

        };

    }

}
