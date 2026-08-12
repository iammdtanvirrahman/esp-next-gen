export class FineSystem {
    constructor(network, terminal) {
        this.network = network;
        this.terminal = terminal;
        this.thresholdCm = 15;
        this.graceMs = 30000;
        this.increment = 2;
        this.incrementEveryMs = 3000;
        this.fine = 0;
        this.obstacle = false;
        this.startedAt = 0;
        this.timer = null;
        this.lastTelemetry = null;
        this.lastFineLogged = 0;
    }

    initialize() {
        this.render();
    }

    handleTelemetry(data) {
        this.lastTelemetry = data;
        const obstacle = Boolean(data?.obstacle) || (Number(data?.distance) > 0 && Number(data.distance) <= this.thresholdCm);

        if (obstacle && !this.obstacle) this.startGracePeriod();
        if (!obstacle && this.obstacle) this.stopDetection();

        this.obstacle = obstacle;
        this.render();
    }

    startGracePeriod() {
        this.startedAt = Date.now();
        this.lastFineLogged = 0;
        clearInterval(this.timer);
        this.terminal?.warning?.("Fine system: 15 cm obstacle detected — 30s grace period started");

        this.timer = setInterval(() => {
            if (!this.obstacle) return;

            const elapsed = Date.now() - this.startedAt;
            if (elapsed >= this.graceMs) {
                const increments = Math.floor((elapsed - this.graceMs) / this.incrementEveryMs) + 1;
                this.fine = increments * this.increment;

                if (this.fine !== this.lastFineLogged) {
                    this.lastFineLogged = this.fine;
                    this.terminal?.error?.(`Fine +$${this.increment} → total $${this.fine}`);
                }

                this.network?.sendJSON?.({ type: "fine", amount: this.fine });
            }
            this.render();
        }, 500);
    }

    stopDetection() {
        clearInterval(this.timer);
        this.timer = null;
        this.startedAt = 0;
        this.lastFineLogged = 0;
        this.terminal?.success?.("Fine system: obstacle cleared");
    }

    reset() {
        this.fine = 0;
        this.obstacle = false;
        this.lastFineLogged = 0;
        this.stopDetection();
        this.network?.sendJSON?.({ type: "fineReset" });
        this.render();
        this.terminal?.success?.("Fine system reset");
    }

    getRemainingMs() {
        if (!this.obstacle || !this.startedAt) return this.graceMs;
        return Math.max(0, this.graceMs - (Date.now() - this.startedAt));
    }

    render() {
        const distance = document.getElementById("sensorDistance");
        const countdown = document.getElementById("fineCountdown");
        const amount = document.getElementById("fineAmount");
        const state = document.getElementById("fineState");

        if (distance) {
            const value = Number(this.lastTelemetry?.distance);
            distance.textContent = value > 0 ? `${value.toFixed(1)} cm` : "-- cm";
        }

        if (amount) amount.textContent = `$${this.fine}`;
        if (countdown) countdown.textContent = this.obstacle ? `${Math.ceil(this.getRemainingMs() / 1000)}s` : "30s";

        if (state) {
            state.textContent = this.fine > 0 ? "Fine active" : this.obstacle ? "Grace period" : "Clear";
            state.className = this.fine > 0 ? "status-error" : this.obstacle ? "status-running" : "status-connected";
        }
    }
}
