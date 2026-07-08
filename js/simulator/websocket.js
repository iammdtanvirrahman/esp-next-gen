/**
 * ==========================================================
 * Atomic IDE
 * Virtual WebSocket Server & Client
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualWebSocket {

    constructor() {

        this.connected = false;

        this.url = "";

        this.clients = [];

        this.messageHandlers = [];

        this.closeHandlers = [];

        this.openHandlers = [];

        this.errorHandlers = [];

        this.statistics = {

            packetsSent: 0,

            packetsReceived: 0,

            bytesSent: 0,

            bytesReceived: 0

        };

    }

    /**
     * Connect
     */

    connect(url = "ws://192.168.1.100:81") {

        this.url = url;

        this.connected = true;

        this.emitOpen();

        console.log("WebSocket Connected:", url);

    }

    /**
     * Disconnect
     */

    disconnect() {

        this.connected = false;

        this.emitClose();

    }

    /**
     * Send Text
     */

    send(data) {

        if (!this.connected) return false;

        const payload =

            typeof data === "string"

                ? data

                : JSON.stringify(data);

        this.statistics.packetsSent++;

        this.statistics.bytesSent += payload.length;

        console.log("TX >", payload);

        return true;

    }

    /**
     * Send Binary
     */

    sendBinary(buffer) {

        if (!this.connected) return false;

        this.statistics.packetsSent++;

        this.statistics.bytesSent += buffer.byteLength;

        console.log("Binary TX >", buffer);

    }

    /**
     * Receive Packet
     */

    receive(data) {

        this.statistics.packetsReceived++;

        const size =

            typeof data === "string"

                ? data.length

                : data.byteLength;

        this.statistics.bytesReceived += size;

        this.messageHandlers.forEach(handler => {

            handler(data);

        });

    }

    /**
     * ESP32 Packet
     */

    sendJoystick(x, y) {

        this.send({

            type: "JOYSTICK",

            x,

            y,

            timestamp: Date.now()

        });

    }

    /**
     * Telemetry Packet
     */

    sendTelemetry(data) {

        this.send({

            type: "TELEMETRY",

            payload: data,

            timestamp: Date.now()

        });

    }

    /**
     * Ping
     */

    ping() {

        this.send({

            type: "PING",

            time: Date.now()

        });

    }

    /**
     * Event Registration
     */

    onOpen(callback) {

        this.openHandlers.push(callback);

    }

    onClose(callback) {

        this.closeHandlers.push(callback);

    }

    onMessage(callback) {

        this.messageHandlers.push(callback);

    }

    onError(callback) {

        this.errorHandlers.push(callback);

    }

    /**
     * Emit Events
     */

    emitOpen() {

        this.openHandlers.forEach(cb => cb());

    }

    emitClose() {

        this.closeHandlers.forEach(cb => cb());

    }

    emitError(error) {

        this.errorHandlers.forEach(cb => cb(error));

    }

    /**
     * Auto Reconnect
     */

    reconnect(delay = 3000) {

        setTimeout(() => {

            if (!this.connected) {

                this.connect(this.url);

            }

        }, delay);

    }

    /**
     * Export
     */

    serialize() {

        return {

            connected: this.connected,

            url: this.url,

            statistics: this.statistics

        };

    }

}
