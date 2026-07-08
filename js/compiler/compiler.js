/**
 * ==========================================================
 * Atomic IDE
 * Virtual Compiler Engine
 * Version 1.0
 * ==========================================================
 */

export class Compiler {

    constructor() {

        this.code = "";

        this.tokens = [];

        this.errors = [];

        this.warnings = [];

        this.components = [];

        this.libraries = [];

        this.keywords = [

            "#include",

            "void",

            "setup",

            "loop",

            "int",

            "float",

            "double",

            "bool",

            "char",

            "String",

            "digitalWrite",

            "digitalRead",

            "analogRead",

            "analogWrite",

            "pinMode",

            "delay",

            "millis"

        ];

    }

    /**
     * Initialize
     */

    async initialize() {

        await this.loadRegistry();

    }

    /**
     * Load Registry
     */

    async loadRegistry() {

        try {

            const components = await fetch(

                "data/components.json"

            );

            this.components =

                await components.json();

        }

        catch {

            console.warn(

                "components.json not found"

            );

        }

        try {

            const libraries = await fetch(

                "data/libraries.json"

            );

            this.libraries =

                await libraries.json();

        }

        catch {

            console.warn(

                "libraries.json not found"

            );

        }

    }

    /**
     * Compile
     */

    compile(code) {

        this.code = code;

        this.errors = [];

        this.warnings = [];

        this.tokens = [];

        this.tokenize();

        this.syntax();

        this.includes();

        this.pinValidation();

        return {

            success:

                this.errors.length === 0,

            errors:

                this.errors,

            warnings:

                this.warnings,

            tokens:

                this.tokens

        };

    }

    /**
     * Tokenizer
     */

    tokenize() {

        this.tokens =

            this.code.match(

                /[A-Za-z_][A-Za-z0-9_]*|[{}();,#<>]/g

            ) || [];

    }

    /**
     * Syntax Check
     */

    syntax() {

        let stack = [];

        for (

            let token of this.tokens

        ) {

            if (token === "{")

                stack.push("{");

            if (token === "}") {

                if (

                    stack.length === 0

                ) {

                    this.errors.push({

                        type:"Syntax",

                        message:

                        "Unexpected }"

                    });

                }

                else {

                    stack.pop();

                }

            }

        }

        if (

            stack.length

        ) {

            this.errors.push({

                type:"Syntax",

                message:

                "Missing closing brace"

            });

        }

    }

    /**
     * Library Check
     */

    includes() {

        this.components.forEach(

            component => {

                if (

                    this.code.includes(

                        component.keyword

                    )

                ) {

                    if (

                        !this.code.includes(

                            component.library

                        )

                    ) {

                        this.warnings.push({

                            type:

                            "Library",

                            message:

                            `${component.library} missing`

                        });

                    }

                }

            }

        );

    }

    /**
     * GPIO Validation
     */

    pinValidation() {

        const matches =

        this.code.match(

            /\bGPIO([0-9]+)/g

        );

        if(!matches) return;

        const used=[];

        matches.forEach(pin=>{

            if(

                used.includes(pin)

            ){

                this.errors.push({

                    type:"GPIO",

                    message:

                    `${pin} already used`

                });

            }

            used.push(pin);

        });

    }

    /**
     * Auto Include
     */

    generateIncludes() {

        let result=[];

        this.components.forEach(

            component=>{

                if(

                    this.code.includes(

                        component.keyword

                    )

                ){

                    result.push(

                        component.library

                    );

                }

            }

        );

        return[

            ...new Set(result)

        ];

    }

    /**
     * Diagnostics
     */

    diagnostics(){

        return{

            errors:

            this.errors,

            warnings:

            this.warnings

        };

    }

    /**
     * Clear
     */

    clear(){

        this.code="";

        this.tokens=[];

        this.errors=[];

        this.warnings=[];

    }

}
