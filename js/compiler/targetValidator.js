export class TargetValidator {
    constructor(terminal) {
        this.terminal = terminal;
        this.board = null;
    }

    setBoard(board) {
        this.board = board || null;
    }

    validate(source = "") {
        const errors = [];
        const warnings = [];
        if (!this.board) return { ok: true, errors, warnings };

        const digitalCalls = [...String(source).matchAll(/\b(?:pinMode|digitalWrite|digitalRead|analogRead|analogWrite)\s*\(\s*([0-9]+)\s*(?:,|\))/g)];
        const pwmCalls = [...String(source).matchAll(/\banalogWrite\s*\(\s*([0-9]+)/g)];
        const gpio = this.board.gpio;

        if (Array.isArray(gpio)) {
            for (const match of digitalCalls) {
                const pin = Number(match[1]);
                if (!gpio.includes(pin)) {
                    errors.push(`GPIO ${pin} is not available on ${this.board.name}.`);
                }
            }
        }

        if (Array.isArray(this.board.pwmPins)) {
            for (const match of pwmCalls) {
                const pin = Number(match[1]);
                if (!this.board.pwmPins.includes(pin)) {
                    errors.push(`GPIO ${pin} does not support PWM on ${this.board.name}.`);
                }
            }
        }

        if (Array.isArray(this.board.inputOnlyGpio)) {
            const outputCalls = [...String(source).matchAll(/\b(?:pinMode|digitalWrite|analogWrite)\s*\(\s*([0-9]+)/g)];
            for (const match of outputCalls) {
                const pin = Number(match[1]);
                if (this.board.inputOnlyGpio.includes(pin)) {
                    warnings.push(`GPIO ${pin} is input-only on ${this.board.name}.`);
                }
            }
        }

        if (Array.isArray(this.board.bootStrapGpio)) {
            for (const match of digitalCalls) {
                const pin = Number(match[1]);
                if (this.board.bootStrapGpio.includes(pin)) {
                    warnings.push(`GPIO ${pin} is boot-sensitive on ${this.board.name}.`);
                }
            }
        }

        return { ok: errors.length === 0, errors, warnings };
    }
}
