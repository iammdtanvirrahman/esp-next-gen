/** Universal Hardware Workspace Manager */
export class HardwareWorkspace {
    constructor() {
        this.canvas = null; this.board = null; this.components = []; this.connections = [];
        this.selected = null; this.zoom = 1; this.offset = { x: 0, y: 0 }; this.dragging = false;
    }

    async initialize() {
        this.canvas = document.querySelector(".hardware-canvas");
        this.board = document.querySelector(".target-board");
        this.registerEvents();
    }

    registerEvents() {
        if (!this.canvas) return;
        this.canvas.addEventListener("dragover", e => e.preventDefault());
        this.canvas.addEventListener("drop", e => this.dropComponent(e));
    }

    addComponent(type, x, y) {
        const component = { id: crypto.randomUUID(), type, x, y, rotation: 0, pins: {}, properties: {} };
        this.components.push(component); this.render(); return component;
    }
    removeComponent(id) { this.components = this.components.filter(c => c.id !== id); this.render(); }
    select(id) { this.selected = id; this.render(); }
    move(id, x, y) { const c = this.components.find(item => item.id === id); if (!c) return; c.x = x; c.y = y; this.render(); }
    rotate(id) { const c = this.components.find(item => item.id === id); if (!c) return; c.rotation = (c.rotation + 90) % 360; this.render(); }
    connect(from, to) { this.connections.push({ id: crypto.randomUUID(), from, to }); this.render(); }
    disconnect(id) { this.connections = this.connections.filter(wire => wire.id !== id); this.render(); }
    zoomIn() { this.zoom += 0.1; this.applyZoom(); }
    zoomOut() { this.zoom = Math.max(0.5, this.zoom - 0.1); this.applyZoom(); }
    resetZoom() { this.zoom = 1; this.applyZoom(); }
    applyZoom() { if (this.canvas) this.canvas.style.transform = `scale(${this.zoom})`; }
    dropComponent(event) { const type = event.dataTransfer?.getData("component"); if (type) this.addComponent(type, event.offsetX, event.offsetY); }
    export() { return JSON.stringify({ version: "1.0.0", board: this.board?.dataset?.boardId || "generic-mcu", components: this.components, wires: this.connections }, null, 4); }
    import(json) { const data = JSON.parse(json); this.components = data.components || []; this.connections = data.wires || []; this.render(); }

    render() {
        if (!this.canvas) return;
        this.canvas.querySelectorAll(".hardware-component").forEach(e => e.remove());
        this.components.forEach(component => {
            const div = document.createElement("div"); div.className = "hardware-component";
            div.style.left = `${component.x}px`; div.style.top = `${component.y}px`; div.style.transform = `rotate(${component.rotation}deg)`;
            div.innerHTML = `<div class="hardware-component-name">${String(component.type)}</div>`;
            div.onclick = () => this.select(component.id); this.canvas.appendChild(div);
        });
    }
}
