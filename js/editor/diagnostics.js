/**
 * ==========================================================
 * Atomic IDE
 * Real-Time Diagnostics Engine
 * Version 3.0.0
 * ==========================================================
 */

export class Diagnostics {

    constructor(editor) {

        this.editor = editor;

        this.errors = [];

        this.warnings = [];

        this.hints = [];

        this.components = [];

    }

    /**
     * Load Component Database
     */

    async load(url = "data/components.json") {

        try {

            const response = await fetch(url);

            const json = await response.json();

            this.components = json.components || [];

        }

        catch (e) {

            console.error(e);

        }

    }

    /**
     * Analyze Source
     */

    analyze(code) {

        this.clear();

        const lines = code.split("\n");

        this.checkSetupLoop(lines);

        this.checkSemicolons(lines);

        this.checkBraces(lines);

        this.checkVariables(lines);

        this.checkLibraries(lines);

        this.checkPins(lines);

        return this.report();

    }

    /**
     * setup()/loop()
     */

    checkSetupLoop(lines) {

        const source = lines.join("\n");

        if (!source.includes("void setup(")) {

            this.error(

                1,

                "Missing setup() function."

            );

        }

        if (!source.includes("void loop(")) {

            this.error(

                1,

                "Missing loop() function."

            );

        }

    }

    /**
     * Semicolons
     */

    checkSemicolons(lines) {

        lines.forEach((line,index)=>{

            const text = line.trim();

            if(

                text==="" ||

                text.startsWith("//") ||

                text.startsWith("#") ||

                text.endsWith("{") ||

                text.endsWith("}")

            ){

                return;

            }

            if(

                text.startsWith("if") ||

                text.startsWith("for") ||

                text.startsWith("while")

            ){

                return;

            }

            if(!text.endsWith(";")){

                this.warning(

                    index+1,

                    "Possible missing semicolon."

                );

            }

        });

    }

    /**
     * Brace Matching
     */

    checkBraces(lines){

        let depth = 0;

        lines.forEach((line,index)=>{

            for(const c of line){

                if(c=="{") depth++;

                if(c=="}") depth--;

                if(depth<0){

                    this.error(

                        index+1,

                        "Unexpected closing brace."

                    );

                    depth=0;

                }

            }

        });

        if(depth!==0){

            this.error(

                lines.length,

                "Brace mismatch detected."

            );

        }

    }

    /**
     * Variable Check
     */

    checkVariables(lines){

        const vars = new Set();

        const regex =

        /^(int|float|double|bool|char|String|long)\s+([A-Za-z_][A-Za-z0-9_]*)/;

        lines.forEach(line=>{

            const match=line.trim().match(regex);

            if(match){

                vars.add(match[2]);

            }

        });

        if(vars.size===0){

            this.hint(

                1,

                "No variables declared."

            );

        }

    }

    /**
     * Library Check
     */

    checkLibraries(lines){

        this.components.forEach(component=>{

            if(

                component.keyword &&

                lines.join("\n").includes(

                    component.keyword

                )

            ){

                const include =

                    `#include <${component.library}>`;

                if(

                    !lines.join("\n").includes(include)

                ){

                    this.warning(

                        1,

                        `${component.library} library missing.`

                    );

                }

            }

        });

    }

    /**
     * GPIO Validation
     */

    checkPins(lines){

        const regex=

        /pinMode\s*\(\s*(\d+)/;

        lines.forEach((line,index)=>{

            const match=line.match(regex);

            if(match){

                const pin=

                    Number(match[1]);

                if(pin>39){

                    this.error(

                        index+1,

                        `GPIO ${pin} does not exist.`

                    );

                }

            }

        });

    }

    /**
     * Add Messages
     */

    error(line,message){

        this.errors.push({

            line,

            message,

            type:"error"

        });

    }

    warning(line,message){

        this.warnings.push({

            line,

            message,

            type:"warning"

        });

    }

    hint(line,message){

        this.hints.push({

            line,

            message,

            type:"hint"

        });

    }

    /**
     * Clear
     */

    clear(){

        this.errors=[];

        this.warnings=[];

        this.hints=[];

    }

    /**
     * Report
     */

    report(){

        return{

            errors:this.errors,

            warnings:this.warnings,

            hints:this.hints,

            total:

                this.errors.length+

                this.warnings.length+

                this.hints.length

        };

    }

}
