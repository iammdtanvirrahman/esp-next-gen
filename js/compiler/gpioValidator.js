/**
 * ==========================================================
 * Atomic IDE
 * ESP32 GPIO Validator
 * Version 1.0
 * ==========================================================
 */

export class GPIOValidator {

    constructor() {

        this.usedPins = new Map();

        this.errors = [];

        this.warnings = [];

        this.validGPIO = [

            0,2,4,5,
            12,13,14,15,
            16,17,18,19,
            21,22,23,
            25,26,27,
            32,33,34,
            35,36,39

        ];

        this.inputOnly = [

            34,
            35,
            36,
            39

        ];

        this.pwmPins = [

            2,4,5,
            12,13,14,
            15,16,17,
            18,19,21,
            22,23,25,
            26,27,32,33

        ];

        this.adcPins = [

            32,33,34,
            35,36,39,
            25,26,27,
            14,12,13,
            15,2,4

        ];

        this.i2cDefault = {

            SDA:21,

            SCL:22

        };

        this.spiDefault = {

            MOSI:23,

            MISO:19,

            SCK:18,

            SS:5

        };

    }

    /**
     * Validate Pin
     */

    validate(pin, mode = "digital") {

        pin = Number(pin);

        if (!this.validGPIO.includes(pin)) {

            this.errors.push({

                type: "GPIO",

                pin,

                message: `GPIO ${pin} is not available`

            });

            return false;

        }

        if (this.usedPins.has(pin)) {

            this.errors.push({

                type: "Conflict",

                pin,

                message: `GPIO ${pin} already assigned`

            });

            return false;

        }

        this.usedPins.set(pin, mode);

        return true;

    }

    /**
     * Output Validation
     */

    validateOutput(pin) {

        pin = Number(pin);

        if (this.inputOnly.includes(pin)) {

            this.errors.push({

                type: "Output",

                pin,

                message: `GPIO ${pin} is input only`

            });

            return false;

        }

        return true;

    }

    /**
     * PWM Validation
     */

    validatePWM(pin) {

        pin = Number(pin);

        if (!this.pwmPins.includes(pin)) {

            this.warnings.push({

                type: "PWM",

                pin,

                message: `GPIO ${pin} is not recommended for PWM`

            });

        }

    }

    /**
     * ADC Validation
     */

    validateADC(pin) {

        pin = Number(pin);

        if (!this.adcPins.includes(pin)) {

            this.warnings.push({

                type: "ADC",

                pin,

                message: `GPIO ${pin} has no ADC capability`

            });

        }

    }

    /**
     * I2C Validation
     */

    validateI2C(sda, scl) {

        if (sda == scl) {

            this.errors.push({

                type: "I2C",

                message: "SDA and SCL cannot use the same GPIO"

            });

        }

    }

    /**
     * SPI Validation
     */

    validateSPI(mosi, miso, sck) {

        const pins = [mosi, miso, sck];

        const unique = new Set(pins);

        if (unique.size !== pins.length) {

            this.errors.push({

                type: "SPI",

                message: "Duplicate SPI pin detected"

            });

        }

    }

    /**
     * Free Pin
     */

    release(pin) {

        this.usedPins.delete(Number(pin));

    }

    /**
     * Reset
     */

    clear() {

        this.usedPins.clear();

        this.errors = [];

        this.warnings = [];

    }

    /**
     * Diagnostics
     */

    diagnostics() {

        return {

            errors: this.errors,

            warnings: this.warnings,

            usedPins: Object.fromEntries(this.usedPins)

        };

    }

}
