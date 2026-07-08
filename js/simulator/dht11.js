/**
 * ==========================================================
 * Atomic IDE
 * Virtual DHT11 Sensor
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualDHT11 {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.name = options.name || "DHT11";

        this.pin = options.pin ?? 4;

        this.temperature = 25.0;

        this.humidity = 60.0;

        this.enabled = true;

        this.lastRead = 0;

        this.sampleInterval = 1000;

        this.randomNoise = true;

        this.element = null;

    }

    /**
     * Mount
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-dht11";

        this.element.innerHTML = `

            <div class="sensor-title">
                🌡️ ${this.name}
            </div>

            <div class="sensor-temp"></div>

            <div class="sensor-humidity"></div>

        `;

        container.appendChild(this.element);

        this.render();

    }

    /**
     * Read Temperature
     */

    readTemperature(unit = "C") {

        this.updateSensor();

        if (unit === "F") {

            return this.temperature * 9 / 5 + 32;

        }

        return this.temperature;

    }

    /**
     * Read Humidity
     */

    readHumidity() {

        this.updateSensor();

        return this.humidity;

    }

    /**
     * Update Sensor
     */

    updateSensor() {

        const now = performance.now();

        if (

            now - this.lastRead <

            this.sampleInterval

        ) {

            return;

        }

        this.lastRead = now;

        if (this.randomNoise) {

            this.temperature +=

                (Math.random() - 0.5) * 0.3;

            this.humidity +=

                (Math.random() - 0.5) * 0.5;

        }

        this.temperature = Math.max(

            0,

            Math.min(

                50,

                this.temperature

            )

        );

        this.humidity = Math.max(

            20,

            Math.min(

                90,

                this.humidity

            )

        );

        this.render();

    }

    /**
     * Manual Controls
     */

    setTemperature(value) {

        this.temperature = Number(value);

        this.render();

    }

    setHumidity(value) {

        this.humidity = Number(value);

        this.render();

    }

    /**
     * Random Environment
     */

    randomize() {

        this.temperature =

            18 +

            Math.random() * 18;

        this.humidity =

            40 +

            Math.random() * 40;

        this.render();

    }

    /**
     * Enable / Disable
     */

    enable() {

        this.enabled = true;

    }

    disable() {

        this.enabled = false;

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        this.element.querySelector(

            ".sensor-temp"

        ).textContent =

            `Temperature : ${this.temperature.toFixed(1)} °C`;

        this.element.querySelector(

            ".sensor-humidity"

        ).textContent =

            `Humidity : ${this.humidity.toFixed(1)} %`;

    }

    /**
     * Export
     */

    serialize() {

        return {

            id: this.id,

            pin: this.pin,

            temperature: this.temperature,

            humidity: this.humidity,

            enabled: this.enabled

        };

    }

}
