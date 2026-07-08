/**
 * ==========================================================
 * Atomic IDE
 * Hardware Workspace Manager
 * ==========================================================
 */

export class HardwareWorkspace {

    constructor() {

        this.canvas = null;

        this.board = null;

        this.components = [];

        this.connections = [];

        this.selected = null;

        this.zoom = 1;

        this.offset = {

            x:0,

            y:0

        };

        this.dragging = false;

    }

    /**
     * Initialize
     */

    async initialize(){

        this.canvas = document.querySelector(

            ".hardware-canvas"

        );

        this.board = document.querySelector(

            ".esp32-board"

        );

        this.registerEvents();

    }

    /**
     * Events
     */

    registerEvents(){

        if(!this.canvas) return;

        this.canvas.addEventListener(

            "dragover",

            e=>{

                e.preventDefault();

            }

        );

        this.canvas.addEventListener(

            "drop",

            e=>{

                this.dropComponent(e);

            }

        );

    }

    /**
     * Add Component
     */

    addComponent(type,x,y){

        const component={

            id:crypto.randomUUID(),

            type,

            x,

            y,

            rotation:0,

            pins:{},

            properties:{}

        };

        this.components.push(component);

        this.render();

        return component;

    }

    /**
     * Remove Component
     */

    removeComponent(id){

        this.components=

        this.components.filter(

            c=>c.id!==id

        );

        this.render();

    }

    /**
     * Select
     */

    select(id){

        this.selected=id;

        this.render();

    }

    /**
     * Move
     */

    move(id,x,y){

        const c=

        this.components.find(

            item=>item.id===id

        );

        if(!c) return;

        c.x=x;

        c.y=y;

        this.render();

    }

    /**
     * Rotate
     */

    rotate(id){

        const c=

        this.components.find(

            item=>item.id===id

        );

        if(!c) return;

        c.rotation+=90;

        if(c.rotation>=360)

            c.rotation=0;

        this.render();

    }

    /**
     * Connect Pins
     */

    connect(

        from,

        to

    ){

        this.connections.push({

            id:crypto.randomUUID(),

            from,

            to

        });

        this.render();

    }

    /**
     * Disconnect
     */

    disconnect(id){

        this.connections=

        this.connections.filter(

            wire=>wire.id!==id

        );

        this.render();

    }

    /**
     * Zoom
     */

    zoomIn(){

        this.zoom+=0.1;

        this.applyZoom();

    }

    zoomOut(){

        this.zoom-=0.1;

        if(this.zoom<0.5)

            this.zoom=0.5;

        this.applyZoom();

    }

    resetZoom(){

        this.zoom=1;

        this.applyZoom();

    }

    applyZoom(){

        if(!this.canvas) return;

        this.canvas.style.transform=

        `scale(${this.zoom})`;

    }

    /**
     * Drop
     */

    dropComponent(event){

        const type=

        event.dataTransfer.getData(

            "component"

        );

        this.addComponent(

            type,

            event.offsetX,

            event.offsetY

        );

    }

    /**
     * Export JSON
     */

    export(){

        return JSON.stringify({

            board:"ESP32",

            components:this.components,

            wires:this.connections

        },null,4);

    }

    /**
     * Import JSON
     */

    import(json){

        const data=

        JSON.parse(json);

        this.components=

        data.components||[];

        this.connections=

        data.wires||[];

        this.render();

    }

    /**
     * Render
     */

    render(){

        if(!this.canvas) return;

        this.canvas

        .querySelectorAll(

            ".hardware-component"

        )

        .forEach(

            e=>e.remove()

        );

        this.components.forEach(

            component=>{

                const div=

                document.createElement(

                    "div"

                );

                div.className=

                "hardware-component";

                div.style.left=

                component.x+"px";

                div.style.top=

                component.y+"px";

                div.style.transform=

                `rotate(${component.rotation}deg)`;

                div.innerHTML=

                `

                <div class="hardware-component-name">

                ${component.type}

                </div>

                `;

                div.onclick=()=>{

                    this.select(

                        component.id

                    );

                };

                this.canvas.appendChild(

                    div

                );

            }

        );

    }

}
