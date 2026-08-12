export class ProjectManager {
    constructor(editor, terminal) {
        this.editor = editor;
        this.terminal = terminal;
        this.storageKey = "universal-hardware-ide:project";
    }

    snapshot(meta = {}) {
        return {
            format: "universal-hardware-ide-project",
            version: 1,
            savedAt: new Date().toISOString(),
            meta,
            files: (this.editor.tabs || []).map(file => ({
                name: file.name,
                language: file.language || "cpp",
                content: file.id === this.editor.activeTab?.id ? this.editor.getValue() : (file.content || "")
            })),
            activeFile: this.editor.activeTab?.name || null
        };
    }

    save(meta = {}) {
        const project = this.snapshot(meta);
        localStorage.setItem(this.storageKey, JSON.stringify(project));
        this.terminal?.success?.(`PROJECT saved — ${project.files.length} file(s)`);
        return project;
    }

    loadLocal() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return false;
        try {
            this.importObject(JSON.parse(raw));
            this.terminal?.success?.("PROJECT restored from local storage");
            return true;
        } catch (error) {
            this.terminal?.error?.(`PROJECT restore failed: ${error.message}`);
            return false;
        }
    }

    exportFile(meta = {}) {
        const project = this.snapshot(meta);
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${this.safeName(project.meta.name || "universal-project")}.uhp.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        this.terminal?.success?.("PROJECT exported");
    }

    importFile() {
        return new Promise(resolve => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";
            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return resolve(false);
                try {
                    const project = JSON.parse(await file.text());
                    this.importObject(project);
                    this.terminal?.success?.(`PROJECT imported — ${project.files?.length || 0} file(s)`);
                    resolve(true);
                } catch (error) {
                    this.terminal?.error?.(`PROJECT import failed: ${error.message}`);
                    resolve(false);
                }
            };
            input.click();
        });
    }

    importObject(project) {
        if (!project || project.format !== "universal-hardware-ide-project") {
            throw new Error("Invalid Universal IDE project file");
        }
        const files = Array.isArray(project.files) ? project.files : [];
        if (!files.length) throw new Error("Project contains no files");
        this.editor.tabs = [];
        for (const file of files) {
            this.editor.newFile(file.name || "Untitled.cpp", false);
            const created = this.editor.tabs[this.editor.tabs.length - 1];
            created.language = file.language || "cpp";
            created.content = String(file.content || "");
        }
        const active = files.find(file => file.name === project.activeFile) || files[0];
        this.editor.activeTab = this.editor.tabs.find(file => file.name === active.name) || this.editor.tabs[0];
        this.editor.renderTabs();
        this.editor.syncEditor();
    }

    safeName(value) {
        return String(value).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "universal-project";
    }
}
