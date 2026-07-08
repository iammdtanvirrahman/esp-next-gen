/**
 * ==========================================================
 * Atomic IDE
 * Semantic Analyzer
 * ==========================================================
 */

export class SemanticAnalyzer {

    constructor() {

        this.ast = null;

        this.symbols = new Map();

        this.errors = [];

        this.warnings = [];

        this.usedVariables = new Set();

        this.allowedPins = [

            0,2,4,5,12,13,14,15,
            16,17,18,19,21,22,23,
            25,26,27,32,33,34,35,
            36,39

        ];

    }

    /**
     * Analyze
     */

    analyze(ast) {

        this.ast = ast;

        this.errors = [];

        this.warnings = [];

        this.symbols.clear();

        this.usedVariables.clear();

        for (const node of ast.body) {

            this.visit(node);

        }

        this.checkUnusedVariables();

        return {

            success:

                this.errors.length === 0,

            errors:

                this.errors,

            warnings:

                this.warnings,

            symbols:

                Array.from(

                    this.symbols.values()

                )

        };

    }

    /**
     * Visitor
     */

    visit(node) {

        switch (node.type) {

            case "VariableDeclaration":

                this.declareVariable(node);

                break;

            case "Expression":

                this.checkExpression(node);

                break;

            case "FunctionDeclaration":

                this.declareFunction(node);

                break;

            case "Include":

                break;

        }

    }

    /**
     * Variable
     */

    declareVariable(node) {

        if (

            this.symbols.has(node.name)

        ) {

            this.errors.push({

                type:"Semantic",

                message:

                `Duplicate variable '${node.name}'`

            });

            return;

        }

        this.symbols.set(

            node.name,

            {

                kind:"variable",

                type:node.dataType,

                name:node.name,

                used:false

            }

        );

    }

    /**
     * Function
     */

    declareFunction(node) {

        if (

            this.symbols.has(node.name)

        ) {

            this.errors.push({

                type:"Semantic",

                message:

                `Duplicate function '${node.name}'`

            });

            return;

        }

        this.symbols.set(

            node.name,

            {

                kind:"function",

                name:node.name,

                returnType:

                node.returnType

            }

        );

    }

    /**
     * Expression
     */

    checkExpression(node) {

        const value = node.value;

        if (

            this.symbols.has(value)

        ) {

            this.symbols.get(value).used = true;

        }

    }

    /**
     * GPIO Validation
     */

    validateGPIO(pin) {

        if (

            !this.allowedPins.includes(

                Number(pin)

            )

        ) {

            this.errors.push({

                type:"GPIO",

                message:

                `GPIO ${pin} is invalid`

            });

        }

    }

    /**
     * Missing Library
     */

    missingLibrary(name) {

        this.warnings.push({

            type:"Library",

            message:

            `Library '${name}' not included`

        });

    }

    /**
     * Warning
     */

    warning(text) {

        this.warnings.push({

            type:"Warning",

            message:text

        });

    }

    /**
     * Error
     */

    error(text) {

        this.errors.push({

            type:"Error",

            message:text

        });

    }

    /**
     * Unused Variables
     */

    checkUnusedVariables() {

        this.symbols.forEach(symbol=>{

            if(

                symbol.kind==="variable"

                &&

                !symbol.used

            ){

                this.warnings.push({

                    type:"Unused",

                    message:

                    `${symbol.name} declared but never used`

                });

            }

        });

    }

    /**
     * Diagnostics
     */

    diagnostics() {

        return {

            errors:

                this.errors,

            warnings:

                this.warnings

        };

    }

}
