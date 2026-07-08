/**
 * ==========================================================
 * Atomic IDE
 * Editor Manager
 * CodeMirror 6 Foundation
 * ==========================================================
 */

export class EditorManager {

    constructor() {

        this.editor = null;

        this.tabs = [];

        this.activeTab = null;

        this.modified = false;

    }

    /**
     * Initialize
     */

    async initialize() {

        this.createEditor();

        this.registerEvents();

    }

    /**
     * Create Editor
     */

    createEditor() {

        const container = document.querySelector("#editor");

        if (!container) return;

        container.innerHTML = "";

        this.editor = {

            container,

            value: ""

        };

    }

    /**
     * Register Events
     */

    registerEvents() {

        window.addEventListener(

            "keydown",

            e => this.shortcuts(e)

        );

    }

    /**
     * Shortcuts
     */

    shortcuts(e) {

        if (e.ctrlKey && e.key === "s") {

            e.preventDefault();

            this.save();

        }

        if (e.ctrlKey && e.key === "n") {

            e.preventDefault();

            this.newFile();

        }

        if (e.ctrlKey && e.key === "w") {

            e.preventDefault();

            this.closeTab();

        }

    }

    /**
     * New File
     */

    newFile(name = "Untitled.cpp") {

        const file = {

            id: crypto.randomUUID(),

            name,

            language: "cpp",

            content: ""

        };

        this.tabs.push(file);

        this.activeTab = file;

        this.renderTabs();

    }

    /**
     * Open File
     */

    openFile(file) {

        this.tabs.push(file);

        this.activeTab = file;

        this.renderTabs();

    }

    /**
     * Save
     */

    save() {

        if (!this.activeTab) return;

        console.log(

            "Saving",

            this.activeTab.name

        );

        this.modified = false;

    }

    /**
     * Close Tab
     */

    closeTab(id = null) {

        if (!this.tabs.length) return;

        if (id) {

            this.tabs = this.tabs.filter(

                tab => tab.id !== id

            );

        }

        else {

            this.tabs.pop();

        }

        this.activeTab =

            this.tabs[this.tabs.length - 1] || null;

        this.renderTabs();

    }

    /**
     * Switch Tab
     */

    switchTab(id) {

        this.activeTab =

            this.tabs.find(

                tab => tab.id === id

            );

        this.renderTabs();

    }

    /**
     * Render Tabs
     */

    renderTabs() {

        const tabs = document.querySelector(".tabs");

        if (!tabs) return;

        tabs.innerHTML = "";

        this.tabs.forEach(tab => {

            const element = document.createElement("div");

            element.className =

                "tab"

                +

                (

                    this.activeTab?.id === tab.id

                    ?

                    " active"

                    :

                    ""

                );

            element.innerHTML =

                `
                <span>${tab.name}</span>
                `;

            element.onclick =

                () => this.switchTab(tab.id);

            tabs.appendChild(element);

        });

    }

    /**
     * Set Content
     */

    setValue(text) {

        if (!this.activeTab) return;

        this.activeTab.content = text;

    }

    /**
     * Get Content
     */

    getValue() {

        if (!this.activeTab)

            return "";

        return this.activeTab.content;

    }

    /**
     * Undo
     */

    undo() {

        console.log("Undo");

    }

    /**
     * Redo
     */

    redo() {

        console.log("Redo");

    }

    /**
     * Find
     */

    find(keyword) {

        console.log(

            "Find:",

            keyword

        );

    }

    /**
     * Replace
     */

    replace(search, replace) {

        console.log(

            search,

            replace

        );

    }

    /**
     * Format Code
     */

    format() {

        console.log(

            "Formatting"

        );

    }

    /**
     * Toggle Minimap
     */

    toggleMinimap() {

        document

            .querySelector(

                ".editor-minimap"

            )

            ?.classList

            .toggle(

                "hidden"

            );

    }

}
