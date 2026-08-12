/* Universal Hardware IDE - Hardware Pack UI */

const escapeHTML = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function loadJSON(path) {
    if (!path) return null;
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Plugin resource HTTP ${response.status}: ${path}`);
    return response.json();
}

function renderComponents(components, packName) {
    const root = document.getElementById("componentsList");
    if (!root) return;
    if (!components.length) {
        root.innerHTML = `<small>No hardware interfaces loaded from ${escapeHTML(packName)}.</small>`;
        return;
    }
    root.innerHTML = components.map(item => `
        <div class="component-item" draggable="true" data-component-id="${escapeHTML(item.id)}">
            <div class="icon">${item.icon || "•"}</div>
            <div class="meta">
                <div class="title">${escapeHTML(item.name)}</div>
                <div class="subtitle">${escapeHTML(item.category || "Interface")} · ${escapeHTML(item.packId || "core")}</div>
            </div>
        </div>
    `).join("");
}

function renderPackDetails(data) {
    const root = document.getElementById("genericTelemetry");
    if (!root || !data) return;
    const libraries = Array.isArray(data.libraries)
        ? data.libraries
        : (data.libraries?.libraries || []);
    const commands = Array.isArray(data.commands)
        ? data.commands
        : (data.commands?.commands || []);
    const components = Array.isArray(data.components)
        ? data.components
        : (data.components?.components || data.components?.interfaces || []);

    root.innerHTML = `
        <div class="telemetry-row"><span>Pack</span><strong>${escapeHTML(data.manifest.name)}</strong></div>
        <div class="telemetry-row"><span>Components</span><strong>${components.length}</strong></div>
        <div class="telemetry-row"><span>Libraries</span><strong>${libraries.length}</strong></div>
        <div class="telemetry-row"><span>Commands</span><strong>${commands.length}</strong></div>
    `;
}

async function applyPack(pack) {
    try {
        const load = async path => path ? loadJSON(path) : null;
        const data = {
            manifest: pack,
            components: await load(pack.components),
            libraries: await load(pack.libraries),
            commands: await load(pack.commands)
        };
        const components = Array.isArray(data.components)
            ? data.components
            : (data.components?.components || data.components?.interfaces || []);
        const tagged = components.map(item => ({ ...item, packId: pack.id }));
        renderComponents(tagged, pack.name);
        renderPackDetails(data);
        window.dispatchEvent(new CustomEvent("hardware-pack-ui-ready", { detail: { pack, data } }));
    } catch (error) {
        const root = document.getElementById("componentsList");
        if (root) root.innerHTML = `<small>Unable to load hardware pack: ${escapeHTML(error.message)}</small>`;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("plugin-registry-ready", event => {
        const core = event.detail?.packs?.find(pack => pack.id === "core-generic");
        if (core) applyPack(core);
    });

    document.addEventListener("plugin-pack-changed", event => {
        if (event.detail?.action === "enable" && event.detail?.pack) {
            applyPack(event.detail.pack);
        }
        if (event.detail?.action === "disable" && event.detail?.enabled?.includes("core-generic")) {
            const core = window.__hardwarePacks?.find(pack => pack.id === "core-generic");
            if (core) applyPack(core);
        }
    });

    const boardSelect = document.getElementById("boardSelect");
    const packSelect = document.getElementById("packSelect");
    if (packSelect) {
        packSelect.addEventListener("change", () => {
            const option = packSelect.options[packSelect.selectedIndex];
            if (option) option.title = `Hardware pack: ${option.textContent}`;
        });
    }
    if (boardSelect) boardSelect.title = "Select the target board for validation";
});
