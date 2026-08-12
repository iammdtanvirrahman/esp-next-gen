import { SerialTransport } from "./serialTransport.js?v=20260812-serial-1";

window.addEventListener("DOMContentLoaded", () => {
    const ide = window.__UNIVERSAL_IDE__;
    const toolbar = document.querySelector(".toolbar");
    if (!ide || !toolbar) return;

    const transport = new SerialTransport(ide.terminal);
    window.__UNIVERSAL_SERIAL__ = transport;

    const connect = document.createElement("button");
    connect.id = "serialConnectBtn";
    connect.textContent = "Connect Serial";
    connect.title = transport.supported() ? "Connect a USB serial device" : "Web Serial is unavailable in this browser";
    connect.disabled = !transport.supported();
    toolbar.insertBefore(connect, toolbar.firstChild);

    const disconnect = document.createElement("button");
    disconnect.id = "serialDisconnectBtn";
    disconnect.textContent = "Close Serial";
    toolbar.insertBefore(disconnect, connect.nextSibling);

    const setStatus = text => {
        const status = document.getElementById("connectionStatus");
        if (status) status.textContent = text;
    };

    transport.onMessage(text => {
        const terminal = ide.terminal;
        const clean = String(text).replace(/\r?\n$/, "");
        if (clean) terminal.info(`SERIAL ← ${clean}`);
    });

    connect.addEventListener("click", async () => {
        try {
            await transport.connect({ baudRate: 115200 });
            setStatus("Serial Connected");
            connect.disabled = true;
            disconnect.disabled = false;
        } catch (error) {
            ide.terminal.error(`SERIAL connect failed: ${error.message}`);
        }
    });

    disconnect.disabled = true;
    disconnect.addEventListener("click", async () => {
        await transport.disconnect();
        setStatus("Disconnected");
        connect.disabled = !transport.supported();
        disconnect.disabled = true;
    });
});
