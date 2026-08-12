/**
 * ==========================================================
 * ESP Next Gen IDE
 * Network Manager
 * ESP32 WebSocket Engine
 * ==========================================================
 */

export class NetworkManager {

    constructor() {
        this.socket = null;
        this.connected = false;
        this.ip = "";
        this.port = 81;
        this.autoReconnect = true;
        this.reconnectDelay = 3000;
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.connecting = false;

        this.telemetry = {
            ping: 0,
            packetsSent: 0,
            packetsReceived: 0,
            lastMessage: null
        };
    }

    async initialize() {
        this.loadSettings();
    }

    connect(ip = this.ip, port = this.port) {
        if (!ip) {
            this.dispatch("error", new Error("ESP32 IP address is required"));
            return false;
        }

        this.ip = String(ip).trim();
        this.port = Number(port) || 81;
        this.saveSettings();
        this.clearReconnect();

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            this.socket.close();
        }

        this.connecting = true;
        this.dispatch("connecting", { ip: this.ip, port: this.port });

        try {
            this.socket = new WebSocket(`ws://${this.ip}:${this.port}`);
            this.socket.binaryType = "arraybuffer";

            this.socket.onopen = () => {
                this.connected = true;
                this.connecting = false;
                this.startPing();
                this.dispatch("connected", { ip: this.ip, port: this.port });
            };

            this.socket.onmessage = event => {
                this.telemetry.packetsReceived += 1;
                this.telemetry.lastMessage = event.data;

                if (typeof event.data === "string" && event.data === "PONG") {
                    this.telemetry.ping = this._pingStartedAt
                        ? Math.max(0, Math.round(performance.now() - this._pingStartedAt))
                        : 0;
                    this._pingStartedAt = 0;
                }

                this.dispatch("message", event.data);
            };

            this.socket.onerror = error => {
                this.connecting = false;
                this.dispatch("error", error);
            };

            this.socket.onclose = () => {
                this.connected = false;
                this.connecting = false;
                this.stopPing();
                this.dispatch("disconnected");

                if (this.autoReconnect && this.ip) {
                    this.scheduleReconnect();
                }
            };

            return true;
        } catch (error) {
            this.connecting = false;
            this.dispatch("error", error);
            return false;
        }
    }

    disconnect() {
        this.autoReconnect = false;
        this.clearReconnect();
        this.stopPing();

        if (this.socket) {
            this.socket.close();
        }

        this.connected = false;
        this.connecting = false;
        this.dispatch("disconnected");
    }

    enableAutoReconnect() {
        this.autoReconnect = true;
    }

    send(message) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        this.socket.send(message);
        this.telemetry.packetsSent += 1;
        return true;
    }

    sendJSON(data) {
        return this.send(JSON.stringify(data));
    }

    sendBinary(buffer) {
        return this.send(buffer);
    }

    sendJoystick(x, y) {
        return this.sendJSON({
            type: "joystick",
            x: Math.round(Number(x) || 0),
            y: Math.round(Number(y) || 0)
        });
    }

    sendMove(direction, speed = 0) {
        return this.sendJSON({
            type: "move",
            direction,
            speed: Math.max(0, Math.min(255, Number(speed) || 0))
        });
    }

    stopMotors() {
        return this.sendJSON({ type: "move", direction: "stop", speed: 0 });
    }

    digitalWrite(pin, state) {
        return this.sendJSON({
            type: "digitalWrite",
            pin: Number(pin),
            state: Boolean(state)
        });
    }

    analogWrite(pin, value) {
        return this.sendJSON({
            type: "analogWrite",
            pin: Number(pin),
            value: Math.max(0, Math.min(255, Number(value) || 0))
        });
    }

    servo(pin, angle) {
        return this.sendJSON({
            type: "servo",
            pin: Number(pin),
            angle: Math.max(0, Math.min(180, Number(angle) || 0))
        });
    }

    startPing() {
        this.stopPing();

        this.pingTimer = setInterval(() => {
            if (!this.connected) return;
            this._pingStartedAt = performance.now();
            this.send("PING");
        }, 1000);
    }

    stopPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        this._pingStartedAt = 0;
    }

    scheduleReconnect() {
        this.clearReconnect();
        this.reconnectTimer = setTimeout(() => {
            this.connect(this.ip, this.port);
        }, this.reconnectDelay);
    }

    clearReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    async discover() {
        this.dispatch("discovery-start");
        return [];
    }

    saveSettings() {
        localStorage.setItem("esp-next-gen-network", JSON.stringify({
            ip: this.ip,
            port: this.port,
            autoReconnect: this.autoReconnect
        }));
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem("esp-next-gen-network");
            if (!raw) return;

            const settings = JSON.parse(raw);
            this.ip = settings.ip || "";
            this.port = Number(settings.port) || 81;
            this.autoReconnect = settings.autoReconnect !== false;
        } catch {
            this.ip = "";
            this.port = 81;
        }
    }

    dispatch(type, data = null) {
        document.dispatchEvent(new CustomEvent("network", {
            detail: { type, data, manager: this }
        }));
    }
}
