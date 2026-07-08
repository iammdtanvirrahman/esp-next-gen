/**
 * ==========================================================
 * Atomic IDE
 * ESP32 Virtual Microcontroller
 * Version 1.0.0
 * ==========================================================
 */

export class ESP32 {

    constructor(simulator) {

        this.simulator = simulator;

        this.board = "ESP32 DevKit V1";

        this.cpuFrequency = 240;

        this.flashSize = "4MB";

        this.psram = false;

        this.heap = 327680;

        this.stack = 8192;

        this.serialBuffer = [];

        this.wifi = {

            connected:false,

            ssid:"",

            ip:"0.0.0.0"

        };

        this.setupExecuted = false;

        this.loopCallback = null;

        this.setupCallback = null;

    }

    /**
     * Boot
     */

    boot() {

        console.log("Booting ESP32...");

        this.serialPrintln("ESP32 Boot Complete");

        this.setupExecuted = false;

    }

    /**
     * Register Arduino setup()
     */

    registerSetup(callback) {

        this.setupCallback = callback;

    }

    /**
     * Register Arduino loop()
     */

    registerLoop(callback) {

        this.loopCallback = callback;

    }

    /**
     * Execute
     */

    update() {

        if (!this.setupExecuted) {

            if (typeof this.setupCallback === "function") {

                this.setupCallback();

            }

            this.setupExecuted = true;

        }

        if (typeof this.loopCallback === "function") {

            this.loopCallback();

        }

    }

    /**
     * GPIO
     */

    pinMode(pin, mode) {

        this.simulator.pinMode(pin, mode);

    }

    digitalWrite(pin, value) {

        this.simulator.digitalWrite(pin, value);

    }

    digitalRead(pin) {

        return this.simulator.digitalRead(pin);

    }

    /**
     * Analog
     */

    analogRead(pin) {

        return this.simulator.digitalRead(pin);

    }

    analogWrite(pin, value) {

        this.simulator.digitalWrite(pin, value);

    }

    /**
     * Time
     */

    millis() {

        return this.simulator.millis();

    }

    delay(ms) {

        return new Promise(resolve => {

            setTimeout(resolve, ms);

        });

    }

    /**
     * Serial
     */

    serialPrint(text) {

        this.serialBuffer.push(text);

        this.dispatchSerial(text);

    }

    serialPrintln(text) {

        this.serialBuffer.push(text + "\n");

        this.dispatchSerial(text + "\n");

    }

    clearSerial() {

        this.serialBuffer = [];

    }

    /**
     * WiFi
     */

    connectWiFi(ssid) {

        this.wifi.connected = true;

        this.wifi.ssid = ssid;

        this.wifi.ip = "192.168.4.10";

        this.serialPrintln(

            `Connected to ${ssid}`

        );

    }

    disconnectWiFi() {

        this.wifi.connected = false;

        this.wifi.ssid = "";

        this.wifi.ip = "0.0.0.0";

    }

    /**
     * Heap
     */

    freeHeap() {

        return this.heap;

    }

    /**
     * Restart
     */

    restart() {

        this.boot();

    }

    /**
     * Events
     */

    dispatchSerial(text) {

        document.dispatchEvent(

            new CustomEvent(

                "serial",

                {

                    detail:{

                        text

                    }

                }

            )

        );

    }

    /**
     * Information
     */

    info() {

        return {

            board:this.board,

            cpu:this.cpuFrequency,

            flash:this.flashSize,

            heap:this.heap,

            wifi:this.wifi,

            psram:this.psram

        };

    }

}
