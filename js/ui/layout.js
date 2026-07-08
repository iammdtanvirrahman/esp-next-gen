/**
 * ==========================================================
 * Atomic IDE
 * Layout Manager
 * ==========================================================
 */

export class LayoutManager {

    constructor() {

        this.sidebar = null;
        this.activityBar = null;
        this.inspector = null;
        this.terminal = null;
        this.editor = null;

        this.dragging = false;

    }

    /**
     * Initialize
     */

    async initialize() {

        this.cache();

        this.restore();

        this.events();

    }

    /**
     * Cache Elements
     */

    cache() {

        this.sidebar = document.querySelector(".sidebar");

        this.activityBar = document.querySelector(".activity-bar");

        this.inspector = document.querySelector(".hardware-inspector");

        this.terminal = document.querySelector(".terminal");

        this.editor = document.querySelector(".editor-workspace");

    }

    /**
     * Events
     */

    events() {

        window.addEventListener(

            "resize",

            () => this.resize()

        );

    }

    /**
     * Resize
     */

    resize() {

        document.documentElement.style.setProperty(

            "--window-width",

            window.innerWidth + "px"

        );

        document.documentElement.style.setProperty(

            "--window-height",

            window.innerHeight + "px"

        );

    }

    /**
     * Sidebar
     */

    toggleSidebar() {

        if (!this.sidebar) return;

        this.sidebar.classList.toggle("collapsed");

        this.save();

    }

    openSidebar() {

        this.sidebar?.classList.remove("collapsed");

        this.save();

    }

    closeSidebar() {

        this.sidebar?.classList.add("collapsed");

        this.save();

    }

    /**
     * Inspector
     */

    toggleInspector() {

        this.inspector?.classList.toggle("hidden");

        this.save();

    }

    /**
     * Terminal
     */

    toggleTerminal() {

        this.terminal?.classList.toggle("hidden");

        this.save();

    }

    /**
     * Activity Bar
     */

    toggleActivityBar() {

        this.activityBar?.classList.toggle("hidden");

        this.save();

    }

    /**
     * Fullscreen
     */

    fullscreen() {

        if (!document.fullscreenElement) {

            document.documentElement.requestFullscreen();

        }

        else {

            document.exitFullscreen();

        }

    }

    /**
     * Split Editor
     */

    splitVertical() {

        this.editor?.classList.add("editor-split");

    }

    removeSplit() {

        this.editor?.classList.remove("editor-split");

    }

    /**
     * Save Layout
     */

    save() {

        const layout = {

            sidebar:

                !this.sidebar?.classList.contains("collapsed"),

            terminal:

                !this.terminal?.classList.contains("hidden"),

            inspector:

                !this.inspector?.classList.contains("hidden"),

            activity:

                !this.activityBar?.classList.contains("hidden")

        };

        localStorage.setItem(

            "atomic-layout",

            JSON.stringify(layout)

        );

    }

    /**
     * Restore Layout
     */

    restore() {

        const raw = localStorage.getItem(

            "atomic-layout"

        );

        if (!raw) return;

        const layout = JSON.parse(raw);

        if (!layout.sidebar)

            this.sidebar?.classList.add("collapsed");

        if (!layout.terminal)

            this.terminal?.classList.add("hidden");

        if (!layout.inspector)

            this.inspector?.classList.add("hidden");

        if (!layout.activity)

            this.activityBar?.classList.add("hidden");

    }

    /**
     * Command Palette Toggle
     */

    toggleCommandPalette() {

        document

            .querySelector(".command-palette")

            ?.classList.toggle("open");

    }

    /**
     * Zen Mode
     */

    zenMode() {

        this.sidebar?.classList.add("hidden");

        this.activityBar?.classList.add("hidden");

        this.inspector?.classList.add("hidden");

        this.terminal?.classList.add("hidden");

    }

    /**
     * Exit Zen
     */

    exitZenMode() {

        this.sidebar?.classList.remove("hidden");

        this.activityBar?.classList.remove("hidden");

        this.inspector?.classList.remove("hidden");

        this.terminal?.classList.remove("hidden");

    }

}
