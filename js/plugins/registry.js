/* Universal Hardware IDE - Dynamic Plugin Registry */
export class PluginRegistry {
    constructor(terminal) {
        this.terminal = terminal;
        this.packs = new Map();
        this.enabled = new Set();
        this.loadedData = new Map();
    }

    async load() {
        const response = await fetch("./data/hardware-packs.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Hardware pack registry HTTP ${response.status}`);
        const data = await response.json();

        for (const pack of data.packs || []) {
            this.packs.set(pack.id, { ...pack });
            if (pack.enabledByDefault) this.enabled.add(pack.id);
        }

        return [...this.packs.values()];
    }

    list() {
        return [...this.packs.values()];
    }

    get(packId) {
        return this.packs.get(packId) || null;
    }

    isEnabled(packId) {
        return this.enabled.has(packId);
    }

    async enable(packId) {
        const pack = this.get(packId);
        if (!pack) throw new Error(`Unknown hardware pack: ${packId}`);

        const data = await this.loadPackData(pack);
        this.enabled.add(packId);
        this.terminal?.success?.(`Hardware pack enabled: ${pack.name}`);
        return data;
    }

    disable(packId) {
        if (packId === "core-generic") return false;
        this.enabled.delete(packId);
        this.loadedData.delete(packId);
        this.terminal?.info?.(`Hardware pack disabled: ${packId}`);
        return true;
    }

    async loadPackData(pack) {
        if (this.loadedData.has(pack.id)) return this.loadedData.get(pack.id);

        const loadJSON = async path => {
            if (!path) return null;
            const response = await fetch(path, { cache: "no-store" });
            if (!response.ok) throw new Error(`Plugin resource HTTP ${response.status}: ${path}`);
            return response.json();
        };

        const data = {
            manifest: pack,
            components: await loadJSON(pack.components),
            libraries: await loadJSON(pack.libraries),
            commands: await loadJSON(pack.commands)
        };

        this.loadedData.set(pack.id, data);
        return data;
    }

    async getComponents(packIds = [...this.enabled]) {
        const output = [];
        for (const id of packIds) {
            const pack = this.get(id);
            if (!pack) continue;
            const data = await this.loadPackData(pack);
            const entries = Array.isArray(data.components)
                ? data.components
                : (data.components?.components || data.components?.interfaces || []);
            output.push(...entries.map(component => ({ ...component, packId: id })));
        }
        return output;
    }

    async getLibraries(packIds = [...this.enabled]) {
        const output = [];
        for (const id of packIds) {
            const pack = this.get(id);
            if (!pack) continue;
            const data = await this.loadPackData(pack);
            const entries = Array.isArray(data.libraries)
                ? data.libraries
                : (data.libraries?.libraries || []);
            output.push(...entries.map(library => ({ ...library, packId: id })));
        }
        return output;
    }

    async getCommands(packIds = [...this.enabled]) {
        const output = [];
        for (const id of packIds) {
            const pack = this.get(id);
            if (!pack) continue;
            const data = await this.loadPackData(pack);
            const entries = Array.isArray(data.commands)
                ? data.commands
                : (data.commands?.commands || []);
            output.push(...entries.map(command => ({ ...command, packId: id })));
        }
        return output;
    }
}
