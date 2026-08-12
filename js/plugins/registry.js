export class PluginRegistry {
    constructor(terminal) {
        this.terminal = terminal;
        this.packs = new Map();
        this.enabled = new Set(["core-generic"]);
    }

    async load() {
        const response = await fetch("./data/hardware-packs.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Hardware pack registry HTTP ${response.status}`);
        const data = await response.json();
        for (const pack of data.packs || []) this.packs.set(pack.id, pack);
        return [...this.packs.values()];
    }

    list() { return [...this.packs.values()]; }

    async enable(packId) {
        const pack = this.packs.get(packId);
        if (!pack) throw new Error(`Unknown hardware pack: ${packId}`);
        this.enabled.add(packId);
        this.terminal?.success?.(`Hardware pack enabled: ${pack.name}`);
        return pack;
    }

    disable(packId) {
        if (packId === "core-generic") return;
        this.enabled.delete(packId);
    }

    isEnabled(packId) { return this.enabled.has(packId); }
}
