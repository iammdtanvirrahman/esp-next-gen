export class CircuitBuilder {
    constructor(root, terminal) { this.root = root; this.terminal = terminal; this.components = []; this.registry = []; this.board = { id: "generic-mcu", name: "Generic MCU", gpio: "dynamic" }; }
    async initialize() { if (!this.root) return; await this.loadRegistry(); this.renderShell(); this.bindEvents(); this.render(); }
    async loadRegistry() {
        try { const response = await fetch("./data/components.json", { cache: "no-store" }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); this.registry = data.components || data.interfaces || []; }
        catch (error) { this.registry = []; this.terminal?.warning?.(`Core component registry unavailable: ${error.message}`); }
    }
    setBoard(board) { if (board) { this.board = board; this.render(); } }
    renderShell() {
        this.root.innerHTML = `<div class="circuit-head"><div><h3>Virtual Circuit Builder</h3><small>Core interfaces are generic; board-specific validation is optional.</small></div><div class="circuit-actions"><button id="circuitValidateBtn">Validate</button><button id="circuitClearBtn">Clear</button></div></div><div class="circuit-registry" id="circuitRegistry"></div><div class="circuit-canvas" id="circuitCanvas"><div class="circuit-empty">Drop interfaces here</div></div><div class="circuit-report" id="circuitReport"></div>`;
    }
    bindEvents() {
        this.root.querySelector("#circuitValidateBtn")?.addEventListener("click", () => this.validate(true));
        this.root.querySelector("#circuitClearBtn")?.addEventListener("click", () => { this.components = []; this.render(); this.validate(false); });
        this.root.addEventListener("dragover", e => { if (e.target.closest("#circuitCanvas")) e.preventDefault(); });
        this.root.querySelector("#circuitCanvas")?.addEventListener("drop", e => { e.preventDefault(); const id = e.dataTransfer?.getData("component"); if (id) this.addComponent(id); });
    }
    render() {
        const registry = this.root.querySelector("#circuitRegistry"); const canvas = this.root.querySelector("#circuitCanvas"); if (!registry || !canvas) return;
        registry.innerHTML = this.registry.map(c => `<div class="circuit-reg-item" draggable="true" data-component-id="${c.id}"><span>${c.icon || "•"}</span><b>${this.escape(c.name)}</b></div>`).join("");
        registry.querySelectorAll("[data-component-id]").forEach(item => { item.addEventListener("dragstart", e => e.dataTransfer.setData("component", item.dataset.componentId)); item.addEventListener("dblclick", () => this.addComponent(item.dataset.componentId)); });
        canvas.innerHTML = "";
        if (!this.components.length) { canvas.innerHTML = `<div class="circuit-empty">Drop interfaces here</div>`; return; }
        this.components.forEach(instance => {
            const definition = this.findDefinition(instance.type); if (!definition) return;
            const card = document.createElement("div"); card.className = "circuit-component"; card.innerHTML = `<div class="circuit-component-title"><span>${definition.icon || "•"} ${this.escape(definition.name)}</span><button class="circuit-remove">×</button></div><div class="circuit-pin-list">${(definition.pins || []).map((pin,index)=>`<label><span>${this.escape(pin.name)} <small>${this.escape(pin.type)}</small></span><select data-pin-index="${index}"><option value="">Unassigned</option>${this.gpioOptions(instance.pins[index]?.gpio).map(g=>`<option value="${g}" ${instance.pins[index]?.gpio===g?"selected":""}>GPIO ${g}</option>`).join("")}</select></label>`).join("")}</div>`;
            card.querySelector(".circuit-remove")?.addEventListener("click", () => { this.components = this.components.filter(x=>x.id!==instance.id); this.render(); this.validate(false); });
            card.querySelectorAll("select[data-pin-index]").forEach(select => select.addEventListener("change", () => { const i=Number(select.dataset.pinIndex); instance.pins[i].gpio = select.value === "" ? null : Number(select.value); this.validate(false); }));
            canvas.appendChild(card);
        });
        this.validate(false);
    }
    addComponent(type) { const def=this.findDefinition(type); if(!def) return; this.components.push({ id:`${type}-${Date.now()}`, type, pins:(def.pins||[]).map(p=>({name:p.name,type:p.type,gpio:null})) }); this.terminal?.info?.(`CIRCUIT add ${def.name}`); this.render(); }
    validate(log=true) {
        const assignments=new Map(); const errors=[]; const warnings=[];
        for(const instance of this.components){ const def=this.findDefinition(instance.type); for(const pin of instance.pins){ if(pin.gpio==null) continue; const gpio=Number(pin.gpio); const label=`${def?.name||instance.type}.${pin.name}`; const previous=assignments.get(gpio); if(previous) errors.push(`GPIO ${gpio} conflict: ${previous} ↔ ${label}`); else assignments.set(gpio,label); if(Array.isArray(this.board.gpio) && !this.board.gpio.includes(gpio)) errors.push(`GPIO ${gpio} is not available on ${this.board.name}`); }}
        const report=this.root.querySelector("#circuitReport");
        if(report){ report.className=`circuit-report ${errors.length?"error":warnings.length?"warning":"ok"}`; report.innerHTML=errors.length||warnings.length?[...errors.map(x=>`<div>✕ ${this.escape(x)}</div>`),...warnings.map(x=>`<div>⚠ ${this.escape(x)}</div>`)].join(""):"✓ Circuit valid"; }
        if(log && errors.length) errors.forEach(e=>this.terminal?.error?.(`CIRCUIT ${e}`));
        if(log && !errors.length) this.terminal?.success?.(`CIRCUIT validation passed for ${this.board.name}`);
        const result={ok:errors.length===0,errors,warnings,assignments:Object.fromEntries(assignments)}; document.dispatchEvent(new CustomEvent("circuit-validation",{detail:result})); return result;
    }
    gpioOptions(selected){
        if(!Array.isArray(this.board.gpio)) return selected == null ? [] : [selected];
        return this.board.gpio.filter(g => g===selected || !this.gpioAssignedElsewhere(g));
    }
    gpioAssignedElsewhere(gpio){ return this.components.some(i=>i.pins.some(p=>Number(p.gpio)===gpio)); }
    findDefinition(type){ return this.registry.find(c=>c.id===type); }
    getConfiguration(){ return JSON.parse(JSON.stringify(this.components)); }
    escape(value){ return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
}
