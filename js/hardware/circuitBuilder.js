/* ESP Next Gen - Virtual Circuit Builder */
export class CircuitBuilder {
    constructor(root, terminal) {
        this.root = root;
        this.terminal = terminal;
        this.components = [];
        this.registry = [];
        this.selected = null;
    }

    async initialize() {
        if (!this.root) return;
        await this.loadRegistry();
        this.renderShell();
        this.bindEvents();
        this.render();
    }

    async loadRegistry() {
        try {
            const response = await fetch("./data/components.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.registry = Array.isArray(data) ? data : (data.components || []);
        } catch (error) {
            this.registry = [];
            this.terminal?.warning?.(`Circuit registry unavailable: ${error.message}`);
        }
    }

    renderShell() {
        this.root.innerHTML = `
            <div class="circuit-head">
                <div>
                    <h3>Virtual Circuit Builder</h3>
                    <small>Drag components here and assign GPIO pins.</small>
                </div>
                <div class="circuit-actions">
                    <button id="circuitValidateBtn">Validate</button>
                    <button id="circuitClearBtn">Clear</button>
                </div>
            </div>
            <div class="circuit-registry" id="circuitRegistry"></div>
            <div class="circuit-canvas" id="circuitCanvas">
                <div class="circuit-empty">Drop hardware components here</div>
            </div>
            <div class="circuit-report" id="circuitReport"></div>
        `;
    }

    bindEvents() {
        this.root.querySelector("#circuitValidateBtn")?.addEventListener("click", () => this.validate(true));
        this.root.querySelector("#circuitClearBtn")?.addEventListener("click", () => {
            this.components = [];
            this.render();
            this.validate(false);
        });

        this.root.addEventListener("dragover", event => {
            if (event.target.closest("#circuitCanvas")) event.preventDefault();
        });

        this.root.querySelector("#circuitCanvas")?.addEventListener("drop", event => {
            event.preventDefault();
            const id = event.dataTransfer?.getData("component");
            if (id) this.addComponent(id);
        });
    }

    render() {
        const registry = this.root.querySelector("#circuitRegistry");
        const canvas = this.root.querySelector("#circuitCanvas");
        if (!registry || !canvas) return;

        registry.innerHTML = this.registry.map(component => `
            <div class="circuit-reg-item" draggable="true" data-component-id="${component.id}">
                <span>${component.icon || "🔧"}</span>
                <b>${this.escape(component.name)}</b>
            </div>
        `).join("");

        registry.querySelectorAll("[data-component-id]").forEach(item => {
            item.addEventListener("dragstart", event => {
                event.dataTransfer.setData("component", item.dataset.componentId);
            });
            item.addEventListener("dblclick", () => this.addComponent(item.dataset.componentId));
        });

        canvas.innerHTML = "";
        if (!this.components.length) {
            canvas.innerHTML = `<div class="circuit-empty">Drop hardware components here</div>`;
            return;
        }

        this.components.forEach(instance => {
            const definition = this.findDefinition(instance.type);
            if (!definition) return;
            const card = document.createElement("div");
            card.className = "circuit-component";
            card.dataset.instanceId = instance.id;
            card.innerHTML = `
                <div class="circuit-component-title">
                    <span>${definition.icon || "🔧"} ${this.escape(definition.name)}</span>
                    <button class="circuit-remove" title="Remove">×</button>
                </div>
                <div class="circuit-pin-list">
                    ${(definition.pins || []).map((pin, index) => `
                        <label>
                            <span>${this.escape(pin.name)} <small>${this.escape(pin.type)}</small></span>
                            <select data-pin-index="${index}">
                                <option value="">Unassigned</option>
                                ${this.gpioOptions(instance.pins[index]?.gpio).map(gpio => `<option value="${gpio}" ${instance.pins[index]?.gpio === gpio ? "selected" : ""}>GPIO ${gpio}</option>`).join("")}
                            </select>
                        </label>
                    `).join("")}
                </div>
            `;

            card.querySelector(".circuit-remove")?.addEventListener("click", () => {
                this.components = this.components.filter(item => item.id !== instance.id);
                this.render();
                this.validate(false);
            });

            card.querySelectorAll("select[data-pin-index]").forEach(select => {
                select.addEventListener("change", () => {
                    const index = Number(select.dataset.pinIndex);
                    instance.pins[index].gpio = select.value === "" ? null : Number(select.value);
                    this.validate(false);
                });
            });

            canvas.appendChild(card);
        });

        this.validate(false);
    }

    addComponent(type) {
        const definition = this.findDefinition(type);
        if (!definition) return;
        const instance = {
            id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type,
            pins: (definition.pins || []).map(pin => ({ name: pin.name, type: pin.type, gpio: null }))
        };
        this.components.push(instance);
        this.terminal?.info?.(`CIRCUIT add ${definition.name}`);
        this.render();
    }

    validate(log = true) {
        const assignments = new Map();
        const errors = [];
        const warnings = [];

        for (const instance of this.components) {
            const definition = this.findDefinition(instance.type);
            for (const pin of instance.pins) {
                if (pin.gpio == null) continue;
                const key = Number(pin.gpio);
                const label = `${definition?.name || instance.type}.${pin.name}`;
                const previous = assignments.get(key);
                if (previous) {
                    errors.push(`GPIO ${key} conflict: ${previous} ↔ ${label}`);
                } else {
                    assignments.set(key, label);
                }

                if ([34, 35, 36, 39].includes(key) && /output|pwm|digital/i.test(pin.type)) {
                    warnings.push(`GPIO ${key} is input-only on ESP32; ${label} may not support output.`);
                }
                if ([0, 2].includes(key)) {
                    warnings.push(`GPIO ${key} is a boot-strapping pin; verify your external hardware before boot.`);
                }
            }
        }

        const report = this.root.querySelector("#circuitReport");
        if (report) {
            if (!errors.length && !warnings.length) {
                report.className = "circuit-report ok";
                report.textContent = "✓ Circuit valid — no GPIO conflicts detected.";
            } else {
                report.className = `circuit-report ${errors.length ? "error" : "warning"}`;
                report.innerHTML = [
                    ...errors.map(item => `<div>✕ ${this.escape(item)}</div>`),
                    ...warnings.map(item => `<div>⚠ ${this.escape(item)}</div>`)
                ].join("");
            }
        }

        if (log && errors.length) errors.forEach(error => this.terminal?.error?.(`CIRCUIT ${error}`));
        if (log && !errors.length) this.terminal?.success?.("CIRCUIT validation passed");

        const result = { ok: errors.length === 0, errors, warnings, assignments: Object.fromEntries(assignments) };
        document.dispatchEvent(new CustomEvent("circuit-validation", { detail: result }));
        return result;
    }

    gpioOptions(selected) {
        const gpios = [0,2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33,34,35,36,39];
        return gpios.filter(gpio => gpio === selected || !this.gpioAssignedElsewhere(gpio));
    }

    gpioAssignedElsewhere(gpio) {
        return this.components.some(instance => instance.pins.some(pin => Number(pin.gpio) === gpio));
    }

    findDefinition(type) {
        return this.registry.find(component => component.id === type);
    }

    getConfiguration() {
        return JSON.parse(JSON.stringify(this.components));
    }

    escape(value) {
        return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }
}
