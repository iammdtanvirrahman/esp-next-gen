/**
 * ==========================================================
 * Atomic IDE
 * Multi File Tab Manager
 * Version 3.0.0
 * ==========================================================
 */

export class TabManager {

    constructor(containerId = "editor-tabs") {

        this.container = document.getElementById(containerId);

        this.tabs = [];

        this.activeTab = null;

        this.recentFiles = [];

        this.listeners = [];

    }

    /**
     * Create Tab
     */

    open(file) {

        const existing = this.tabs.find(

            tab => tab.path === file.path

        );

        if (existing) {

            this.activate(existing.id);

            return existing;

        }

        const tab = {

            id: crypto.randomUUID(),

            name: file.name,

            path: file.path,

            content: file.content || "",

            saved: true,

            pinned: false,

            icon: this.icon(file.name)

        };

        this.tabs.push(tab);

        this.activeTab = tab.id;

        this.recent(file.path);

        this.render();

        this.emit();

        return tab;

    }

    /**
     * Close Tab
     */

    close(id) {

        const index = this.tabs.findIndex(

            tab => tab.id === id

        );

        if (index === -1)

            return false;

        if (this.tabs[index].pinned)

            return false;

        this.tabs.splice(index, 1);

        if (

            this.tabs.length > 0

        ) {

            this.activeTab =

                this.tabs[

                    Math.max(0, index - 1)

                ].id;

        }

        else {

            this.activeTab = null;

        }

        this.render();

        this.emit();

        return true;

    }

    /**
     * Activate
     */

    activate(id) {

        this.activeTab = id;

        this.render();

        this.emit();

    }

    /**
     * Rename
     */

    rename(id, name) {

        const tab = this.find(id);

        if (!tab) return;

        tab.name = name;

        tab.icon = this.icon(name);

        this.render();

    }

    /**
     * Mark Saved
     */

    saved(id, value = true) {

        const tab = this.find(id);

        if (!tab) return;

        tab.saved = value;

        this.render();

    }

    /**
     * Pin
     */

    pin(id) {

        const tab = this.find(id);

        if (!tab) return;

        tab.pinned = !tab.pinned;

        this.render();

    }

    /**
     * Move
     */

    move(from, to) {

        if (

            from < 0 ||

            to < 0 ||

            from >= this.tabs.length ||

            to >= this.tabs.length

        ) return;

        const item =

            this.tabs.splice(from,1)[0];

        this.tabs.splice(to,0,item);

        this.render();

    }

    /**
     * Find
     */

    find(id) {

        return this.tabs.find(

            tab => tab.id === id

        );

    }

    /**
     * Active
     */

    current() {

        return this.find(this.activeTab);

    }

    /**
     * Recent Files
     */

    recent(path) {

        this.recentFiles =

            this.recentFiles.filter(

                item => item !== path

            );

        this.recentFiles.unshift(path);

        this.recentFiles =

            this.recentFiles.slice(0,20);

    }

    /**
     * File Icons
     */

    icon(file) {

        const ext =

            file.split(".").pop();

        switch(ext){

            case "ino":

                return "🟢";

            case "cpp":

                return "🔵";

            case "h":

                return "📘";

            case "json":

                return "🟨";

            case "html":

                return "🌐";

            case "css":

                return "🎨";

            case "js":

                return "🟨";

            default:

                return "📄";

        }

    }

    /**
     * Render
     */

    render() {

        if (!this.container)

            return;

        this.container.innerHTML = "";

        this.tabs.forEach(tab => {

            const element =

                document.createElement("div");

            element.className =

                "editor-tab";

            if (

                tab.id === this.activeTab

            ) {

                element.classList.add("active");

            }

            element.innerHTML = `

                <span class="tab-icon">${tab.icon}</span>

                <span class="tab-title">

                    ${tab.name}

                    ${tab.saved ? "" : " ●"}

                </span>

                <button class="tab-close">

                    ×

                </button>

            `;

            element.onclick = () =>

                this.activate(tab.id);

            element.querySelector(

                ".tab-close"

            ).onclick = (e)=>{

                e.stopPropagation();

                this.close(tab.id);

            };

            this.container.appendChild(element);

        });

    }

    /**
     * Save Session
     */

    saveSession() {

        localStorage.setItem(

            "atomic-tabs",

            JSON.stringify(this.tabs)

        );

    }

    /**
     * Restore Session
     */

    restoreSession() {

        const data =

            localStorage.getItem(

                "atomic-tabs"

            );

        if (!data)

            return;

        this.tabs =

            JSON.parse(data);

        if (

            this.tabs.length

        ) {

            this.activeTab =

                this.tabs[0].id;

        }

        this.render();

    }

    /**
     * Events
     */

    onChange(callback) {

        this.listeners.push(callback);

    }

    emit() {

        this.listeners.forEach(

            cb => cb(

                this.current()

            )

        );

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            openTabs:

                this.tabs.length,

            active:

                this.activeTab,

            pinned:

                this.tabs.filter(

                    t=>t.pinned

                ).length,

            unsaved:

                this.tabs.filter(

                    t=>!t.saved

                ).length,

            recent:

                this.recentFiles.length

        };

    }

}
