/**
 * ==========================================================
 * ESP Next Gen IDE
 * Editor Manager
 * ==========================================================
 */

export class EditorManager {
    constructor() {
        this.editor = null;
        this.tabs = [];
        this.activeTab = null;
        this.modified = false;
    }

    async initialize() {
        this.createEditor();
        this.registerEvents();
        this.newFile("main.cpp", true);
    }

    createEditor() {
        const textarea = document.getElementById("codeEditor");
        if (!textarea) return;

        if (window.CodeMirror) {
            this.editor = window.CodeMirror.fromTextArea(textarea, {
                mode: "text/x-c++src",
                theme: "dracula",
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                autofocus: true,
                lineWrapping: false,
                viewportMargin: Infinity
            });

            this.editor.on("change", () => {
                if (this.activeTab) {
                    this.activeTab.content = this.editor.getValue();
                    this.modified = true;
                }
            });
        } else {
            this.editor = textarea;
        }
    }

    registerEvents() {
        window.addEventListener("keydown", e => this.shortcuts(e));
    }

    shortcuts(e) {
        if (e.ctrlKey && e.key.toLowerCase() === "s") {
            e.preventDefault();
            this.save();
        }

        if (e.ctrlKey && e.key.toLowerCase() === "n") {
            e.preventDefault();
            this.newFile();
        }

        if (e.ctrlKey && e.key.toLowerCase() === "w") {
            e.preventDefault();
            this.closeTab();
        }
    }

    newFile(name = "Untitled.cpp", activate = true) {
        const file = {
            id: crypto.randomUUID(),
            name,
            language: "cpp",
            content: name === "main.cpp"
                ? "#include <Arduino.h>\n\nvoid setup() {\n    Serial.begin(115200);\n}\n\nvoid loop() {\n    // ESP32 code here\n}\n"
                : ""
        };

        this.tabs.push(file);
        if (activate) this.activeTab = file;
        this.renderTabs();
        this.syncEditor();
        return file;
    }

    openFile(file) {
        if (!file?.id) file.id = crypto.randomUUID();
        if (!this.tabs.some(tab => tab.id === file.id)) this.tabs.push(file);
        this.activeTab = file;
        this.renderTabs();
        this.syncEditor();
    }

    save() {
        if (!this.activeTab) return;
        this.activeTab.content = this.readEditor();
        localStorage.setItem(`esp-next-gen-file:${this.activeTab.name}`, this.activeTab.content);
        this.modified = false;
        document.dispatchEvent(new CustomEvent("terminal-log", {
            detail: { message: `${this.activeTab.name} saved locally`, level: "success" }
        }));
    }

    closeTab(id = null) {
        if (!this.tabs.length) return;

        const targetId = id || this.activeTab?.id;
        this.tabs = this.tabs.filter(tab => tab.id !== targetId);
        this.activeTab = this.tabs[this.tabs.length - 1] || null;
        this.renderTabs();
        this.syncEditor();
    }

    switchTab(id) {
        const tab = this.tabs.find(item => item.id === id);
        if (!tab) return;
        this.activeTab = tab;
        this.renderTabs();
        this.syncEditor();
    }

    renderTabs() {
        const tabs = document.querySelector(".tabs");
        if (!tabs) return;

        tabs.innerHTML = "";
        this.tabs.forEach(tab => {
            const element = document.createElement("div");
            element.className = `tab${this.activeTab?.id === tab.id ? " active" : ""}`;
            element.innerHTML = `<span>${this.escape(tab.name)}</span>`;
            element.onclick = () => this.switchTab(tab.id);
            tabs.appendChild(element);
        });
    }

    syncEditor() {
        if (!this.activeTab || !this.editor) return;
        const content = this.activeTab.content || "";

        if (typeof this.editor.setValue === "function") {
            this.editor.setValue(content);
            this.editor.clearHistory?.();
        } else {
            this.editor.value = content;
        }

        this.modified = false;
    }

    setValue(text) {
        if (!this.activeTab) return;
        this.activeTab.content = String(text);
        this.syncEditor();
    }

    getValue() {
        return this.readEditor();
    }

    readEditor() {
        if (!this.editor) return this.activeTab?.content || "";
        return typeof this.editor.getValue === "function"
            ? this.editor.getValue()
            : this.editor.value;
    }

    undo() { this.editor?.undo?.(); }
    redo() { this.editor?.redo?.(); }

    find(keyword) {
        const query = String(keyword || "");
        if (!query || !this.editor?.getSearchCursor) return false;
        return Boolean(this.editor.getSearchCursor(query).findNext());
    }

    replace(search, replacement) {
        if (!this.editor?.getSearchCursor) return false;
        const cursor = this.editor.getSearchCursor(String(search || ""));
        if (!cursor.findNext()) return false;
        cursor.replace(String(replacement ?? ""));
        return true;
    }

    format() {
        if (!this.editor?.getValue) return;
        const formatted = this.editor.getValue()
            .split("\n")
            .map(line => line.replace(/\s+$/g, ""))
            .join("\n");
        this.editor.setValue(formatted);
        this.modified = true;
    }

    toggleMinimap() {
        document.querySelector(".editor-minimap")?.classList.toggle("hidden");
    }

    escape(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }
}
