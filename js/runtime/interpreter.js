/**
 * ==========================================================
 * Atomic IDE
 * Arduino C++ Interpreter
 * Version 2.0.0
 * ==========================================================
 */

export class Interpreter {

    constructor(runtime) {

        this.runtime = runtime;

        this.source = "";

        this.tokens = [];

        this.variables = new Map();

        this.functions = new Map();

        this.errors = [];

        this.includes = [];

        this.constants = [];

        this.setupCode = [];

        this.loopCode = [];

        this.ast = [];

    }

    /**
     * Load Code
     */

    load(source) {

        this.source = source;

        this.reset();

        this.tokenize();

        this.parse();

        return this;

    }

    /**
     * Reset
     */

    reset() {

        this.tokens = [];

        this.errors = [];

        this.includes = [];

        this.constants = [];

        this.variables.clear();

        this.functions.clear();

        this.setupCode = [];

        this.loopCode = [];

        this.ast = [];

    }

    /**
     * Tokenizer
     */

    tokenize() {

        const lines = this.source.split(/\r?\n/);

        lines.forEach((text,index)=>{

            this.tokens.push({

                line:index+1,

                text:text.trim()

            });

        });

    }

    /**
     * Parse
     */

    parse() {

        let mode = null;

        let brace = 0;

        this.tokens.forEach(token=>{

            const line = token.text;

            if(line==="") return;

            /**
             * Include
             */

            if(line.startsWith("#include")){

                this.includes.push(line);

                return;

            }

            /**
             * Constants
             */

            if(line.startsWith("#define")){

                this.constants.push(line);

                return;

            }

            /**
             * setup()
             */

            if(line.includes("setup(")){

                mode="setup";

                brace=1;

                return;

            }

            /**
             * loop()
             */

            if(line.includes("loop(")){

                mode="loop";

                brace=1;

                return;

            }

            if(mode){

                if(line.includes("{")) brace++;

                if(line.includes("}")) brace--;

                if(brace===0){

                    mode=null;

                    return;

                }

                if(mode==="setup")

                    this.setupCode.push(line);

                else

                    this.loopCode.push(line);

            }

        });

        this.findVariables();

    }

    /**
     * Variable Detection
     */

    findVariables(){

        const regex =

        /^(int|float|double|bool|char|String|long)\s+([A-Za-z_][A-Za-z0-9_]*)/;

        this.tokens.forEach(token=>{

            const match = token.text.match(regex);

            if(match){

                this.variables.set(

                    match[2],

                    {

                        type:match[1],

                        value:null

                    }

                );

            }

        });

    }

    /**
     * Execute setup()
     */

    runSetup(){

        this.execute(

            this.setupCode

        );

    }

    /**
     * Execute loop()
     */

    runLoop(){

        this.execute(

            this.loopCode

        );

    }

    /**
     * Execute Lines
     */

    execute(lines){

        lines.forEach(line=>{

            this.executeLine(line);

        });

    }

    /**
     * Execute Single Statement
     */

    executeLine(line){

        line=line.trim();

        if(line==="") return;

        /**
         * pinMode
         */

        if(line.startsWith("pinMode")){

            this.callPinMode(line);

            return;

        }

        /**
         * digitalWrite
         */

        if(line.startsWith("digitalWrite")){

            this.callDigitalWrite(line);

            return;

        }

        /**
         * analogWrite
         */

        if(line.startsWith("analogWrite")){

            this.callAnalogWrite(line);

            return;

        }

        /**
         * Serial.print
         */

        if(

            line.startsWith("Serial.print")

        ){

            this.callSerial(line);

            return;

        }

    }

    /**
     * pinMode()
     */

    callPinMode(line){

        console.log("pinMode >",line);

    }

    /**
     * digitalWrite()
     */

    callDigitalWrite(line){

        console.log("digitalWrite >",line);

    }

    /**
     * analogWrite()
     */

    callAnalogWrite(line){

        console.log("analogWrite >",line);

    }

    /**
     * Serial
     */

    callSerial(line){

        console.log("Serial >",line);

    }

    /**
     * Errors
     */

    addError(line,message){

        this.errors.push({

            line,

            message

        });

    }

    /**
     * Report
     */

    report(){

        return{

            includes:this.includes,

            constants:this.constants,

            variables:

            [...this.variables],

            setup:this.setupCode,

            loop:this.loopCode,

            errors:this.errors

        };

    }

}
