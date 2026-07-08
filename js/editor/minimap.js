/**
 * ==========================================================
 * Atomic IDE
 * VS Code Style Minimap
 * Version 3.0.0
 * ==========================================================
 */

export class MiniMap {

    constructor(editor, canvasId = "minimap") {

        this.editor = editor;

        this.canvas = document.getElementById(canvasId);

        this.ctx = this.canvas ?

            this.canvas.getContext("2d") : null;

        this.enabled = true;

        this.lineHeight = 2;

        this.fontSize = 2;

        this.viewportColor =

            "rgba(255,255,255,.15)";

        this.theme = "dracula";

        this.scale = 1;

    }

    /**
     * Render
     */

    render() {

        if (

            !this.enabled ||

            !this.ctx ||

            !this.editor

        ) return;

        const code =

            this.editor.getValue();

        const lines =

            code.split("\n");

        const w = this.canvas.width;

        const h = this.canvas.height;

        this.ctx.clearRect(0,0,w,h);

        lines.forEach((line,index)=>{

            this.drawLine(

                line,

                index

            );

        });

        this.drawViewport();

    }

    /**
     * Draw Line
     */

    drawLine(text,index){

        const y =

            index *

            this.lineHeight *

            this.scale;

        const color =

            this.pickColor(text);

        this.ctx.fillStyle = color;

        const width =

            Math.min(

                this.canvas.width,

                text.length * 2

            );

        this.ctx.fillRect(

            0,

            y,

            width,

            this.lineHeight

        );

    }

    /**
     * Color Detection
     */

    pickColor(line){

        line = line.trim();

        if(

            line.startsWith("//")

        )

            return "#6A9955";

        if(

            line.startsWith("#")

        )

            return "#C586C0";

        if(

            line.includes("\"")

        )

            return "#CE9178";

        if(

            /\b(int|void|float|bool|char)\b/

            .test(line)

        )

            return "#569CD6";

        if(

            line.includes("setup") ||

            line.includes("loop")

        )

            return "#DCDCAA";

        return "#BBBBBB";

    }

    /**
     * Viewport
     */

    drawViewport(){

        if(

            !this.editor.editor

        ) return;

        const info =

            this.editor.editor.getScrollInfo();

        const total =

            this.editor.editor.lineCount();

        const topLine =

            Math.floor(

                info.top / 20

            );

        const visible =

            Math.floor(

                info.clientHeight / 20

            );

        this.ctx.fillStyle =

            this.viewportColor;

        this.ctx.fillRect(

            0,

            topLine *

            this.lineHeight,

            this.canvas.width,

            visible *

            this.lineHeight

        );

    }

    /**
     * Jump
     */

    goto(y){

        if(

            !this.editor.editor

        ) return;

        const line =

            Math.floor(

                y / this.lineHeight

            );

        this.editor.goto(

            line + 1

        );

    }

    /**
     * Resize
     */

    resize(width,height){

        this.canvas.width = width;

        this.canvas.height = height;

        this.render();

    }

    /**
     * Scale
     */

    setScale(scale){

        this.scale = scale;

        this.render();

    }

    /**
     * Theme
     */

    setTheme(theme){

        this.theme = theme;

        this.render();

    }

    /**
     * Enable
     */

    enable(){

        this.enabled = true;

        this.render();

    }

    /**
     * Disable
     */

    disable(){

        this.enabled = false;

        if(this.ctx){

            this.ctx.clearRect(

                0,

                0,

                this.canvas.width,

                this.canvas.height

            );

        }

    }

    /**
     * Refresh
     */

    refresh(){

        this.render();

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            enabled:this.enabled,

            scale:this.scale,

            theme:this.theme,

            width:

                this.canvas ?

                this.canvas.width : 0,

            height:

                this.canvas ?

                this.canvas.height : 0

        };

    }

}
