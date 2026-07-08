/**
 * ==========================================================
 * Atomic IDE
 * Explorer Manager
 * ==========================================================
 */

export class Explorer {

    constructor() {

        this.root = [];

        this.selected = null;

        this.container = null;

    }

    /* =======================================================
       Initialize
    ======================================================= */

    async initialize() {

        this.container = document.querySelector(".explorer");

        this.loadDefaultProject();

        this.render();

        this.registerEvents();

    }

    /* =======================================================
       Default Project
    ======================================================= */

    loadDefaultProject() {

        this.root = [

            {

                id: crypto.randomUUID(),

                name: "src",

                type: "folder",

                open: true,

                children: [

                    {

                        id: crypto.randomUUID(),

                        name: "main.cpp",

                        type: "file"

                    }

                ]

            },

            {

                id: crypto.randomUUID(),

                name: "include",

                type: "folder",

                open: false,

                children: []

            },

            {

                id: crypto.randomUUID(),

                name: "platformio.ini",

                type: "file"

            }

        ];

    }

    /* =======================================================
       Render
    ======================================================= */

    render() {

        if (!this.container) return;

        this.container.innerHTML = "";

        this.root.forEach(item => {

            this.container.appendChild(

                this.createItem(item)

            );

        });

    }

    /* =======================================================
       Create Item
    ======================================================= */

    createItem(item) {

        const div = document.createElement("div");

        div.className = "tree-item";

        div.dataset.id = item.id;

        div.innerHTML =

        `

        <span class="tree-icon">

        ${item.type === "folder" ? "📁" : "📄"}

        </span>

        <span class="tree-name">

        ${item.name}

        </span>

        `;

        div.onclick = () => {

            this.select(item.id);

        };

        return div;

    }

    /* =======================================================
       Select
    ======================================================= */

    select(id) {

        this.selected = id;

        this.render();

    }

    /* =======================================================
       New File
    ======================================================= */

    newFile(name = "NewFile.cpp") {

        this.root.push({

            id: crypto.randomUUID(),

            name,

            type: "file"

        });

        this.render();

    }

    /* =======================================================
       New Folder
    ======================================================= */

    newFolder(name = "NewFolder") {

        this.root.push({

            id: crypto.randomUUID(),

            name,

            type: "folder",

            open: true,

            children: []

        });

        this.render();

    }

    /* =======================================================
       Delete
    ======================================================= */

    delete(id) {

        this.root = this.root.filter(

            item => item.id !== id

        );

        this.render();

    }

    /* =======================================================
       Rename
    ======================================================= */

    rename(id, name) {

        const item = this.root.find(

            i => i.id === id

        );

        if (!item) return;

        item.name = name;

        this.render();

    }

    /* =======================================================
       Search
    ======================================================= */

    search(keyword) {

        return this.root.filter(item =>

            item.name

                .toLowerCase()

                .includes(

                    keyword.toLowerCase()

                )

        );

    }

    /* =======================================================
       Expand
    ======================================================= */

    expand(id) {

        const folder = this.root.find(

            f => f.id === id

        );

        if (!folder) return;

        folder.open = true;

        this.render();

    }

    /* =======================================================
       Collapse
    ======================================================= */

    collapse(id) {

        const folder = this.root.find(

            f => f.id === id

        );

        if (!folder) return;

        folder.open = false;

        this.render();

    }

    /* =======================================================
       Events
    ======================================================= */

    registerEvents() {

        document.addEventListener(

            "keydown",

            e => {

                if (

                    e.key === "Delete"

                    &&

                    this.selected

                ) {

                    this.delete(

                        this.selected

                    );

                }

            }

        );

    }

}
