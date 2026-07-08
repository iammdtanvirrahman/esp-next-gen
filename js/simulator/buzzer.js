/**
 * ==========================================================
 * Atomic IDE
 * Virtual Buzzer
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualBuzzer {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.name = options.name || "Buzzer";

        this.pin = options.pin ?? 27;

        this.enabled = false;

        this.frequency = 1000;

        this.volume = 0.3;

        this.duration = 0;

        this.audioContext = null;

        this.oscillator = null;

        this.gainNode = null;

        this.element = null;

        this.gpio = null;

    }

    /**
     * Attach GPIO
     */

    attach(gpio) {

        this.gpio = gpio;

        gpio.on(this.pin, () => {

            const value = gpio.digitalRead(this.pin);

            if (value) {

                this.tone(this.frequency);

            } else {

                this.noTone();

            }

        });

    }

    /**
     * Mount UI
     */

    mount(container) {

        this.element = document.createElement("div");

        this.element.className = "virtual-buzzer";

        this.element.innerHTML = `

            <div class="buzzer-icon">🔊</div>

            <div class="buzzer-name">${this.name}</div>

            <div class="buzzer-status">OFF</div>

        `;

        container.appendChild(this.element);

        this.render();

    }

    /**
     * Audio Context
     */

    initializeAudio() {

        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this.gainNode = this.audioContext.createGain();

        this.gainNode.connect(this.audioContext.destination);

        this.gainNode.gain.value = this.volume;

    }

    /**
     * tone()
     */

    tone(frequency = 1000, duration = 0) {

        this.initializeAudio();

        this.noTone();

        this.frequency = frequency;

        this.oscillator = this.audioContext.createOscillator();

        this.oscillator.type = "square";

        this.oscillator.frequency.value = frequency;

        this.oscillator.connect(this.gainNode);

        this.oscillator.start();

        this.enabled = true;

        this.render();

        if (duration > 0) {

            setTimeout(() => {

                this.noTone();

            }, duration);

        }

    }

    /**
     * noTone()
     */

    noTone() {

        if (this.oscillator) {

            try {

                this.oscillator.stop();

            } catch {}

            this.oscillator.disconnect();

            this.oscillator = null;

        }

        this.enabled = false;

        this.render();

    }

    /**
     * Volume
     */

    setVolume(volume) {

        this.volume = Math.max(0, Math.min(1, volume));

        if (this.gainNode) {

            this.gainNode.gain.value = this.volume;

        }

    }

    /**
     * Melody
     */

    async playMelody(notes) {

        for (const note of notes) {

            this.tone(note.frequency, note.duration);

            await new Promise(resolve =>

                setTimeout(resolve, note.duration)

            );

        }

        this.noTone();

    }

    /**
     * Render
     */

    render() {

        if (!this.element) return;

        const status =

            this.element.querySelector(".buzzer-status");

        const icon =

            this.element.querySelector(".buzzer-icon");

        status.textContent =

            this.enabled

                ? `${this.frequency} Hz`

                : "OFF";

        icon.style.transform =

            this.enabled

                ? "scale(1.2)"

                : "scale(1)";

        icon.style.filter =

            this.enabled

                ? "drop-shadow(0 0 10px yellow)"

                : "none";

    }

    /**
     * Export
     */

    serialize() {

        return {

            id: this.id,

            pin: this.pin,

            enabled: this.enabled,

            frequency: this.frequency,

            volume: this.volume

        };

    }

}
