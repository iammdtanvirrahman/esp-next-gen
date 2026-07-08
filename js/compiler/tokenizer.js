/**
 * ==========================================================
 * Atomic IDE
 * C++ / Arduino Tokenizer
 * ==========================================================
 */

export class Tokenizer {

    constructor() {

        this.code = "";

        this.tokens = [];

        this.line = 1;

        this.column = 1;

        this.keywords = new Set([

            "#include",

            "void",

            "int",

            "float",

            "double",

            "bool",

            "char",

            "long",

            "short",

            "String",

            "if",

            "else",

            "for",

            "while",

            "switch",

            "case",

            "return",

            "break",

            "continue",

            "setup",

            "loop",

            "HIGH",

            "LOW",

            "INPUT",

            "OUTPUT",

            "INPUT_PULLUP"

        ]);

    }

    /**
     * Tokenize
     */

    tokenize(code) {

        this.code = code;

        this.tokens = [];

        this.line = 1;

        this.column = 1;

        let i = 0;

        while (i < code.length) {

            const ch = code[i];

            /* Whitespace */

            if (ch === " " || ch === "\t") {

                i++;

                this.column++;

                continue;

            }

            /* New Line */

            if (ch === "\n") {

                this.line++;

                this.column = 1;

                i++;

                continue;

            }

            /* Identifier */

            if (/[A-Za-z_#]/.test(ch)) {

                let value = "";

                const start = this.column;

                while (

                    i < code.length &&

                    /[A-Za-z0-9_#.]/.test(code[i])

                ) {

                    value += code[i];

                    i++;

                    this.column++;

                }

                this.tokens.push({

                    type:

                        this.keywords.has(value)

                        ?

                        "keyword"

                        :

                        "identifier",

                    value,

                    line:this.line,

                    column:start

                });

                continue;

            }

            /* Number */

            if (/[0-9]/.test(ch)) {

                let value = "";

                const start = this.column;

                while (

                    i < code.length &&

                    /[0-9.]/.test(code[i])

                ) {

                    value += code[i];

                    i++;

                    this.column++;

                }

                this.tokens.push({

                    type:"number",

                    value,

                    line:this.line,

                    column:start

                });

                continue;

            }

            /* String */

            if (

                ch === '"' ||

                ch === "'"

            ) {

                const quote = ch;

                let value = "";

                const start = this.column;

                i++;

                this.column++;

                while (

                    i < code.length &&

                    code[i] !== quote

                ) {

                    value += code[i];

                    i++;

                    this.column++;

                }

                i++;

                this.column++;

                this.tokens.push({

                    type:"string",

                    value,

                    line:this.line,

                    column:start

                });

                continue;

            }

            /* Single Line Comment */

            if (

                ch === "/" &&

                code[i+1] === "/"

            ) {

                let value = "";

                while (

                    i < code.length &&

                    code[i] !== "\n"

                ) {

                    value += code[i];

                    i++;

                    this.column++;

                }

                this.tokens.push({

                    type:"comment",

                    value,

                    line:this.line

                });

                continue;

            }

            /* Operators */

            if (

                "+-*/=%<>!&|".includes(ch)

            ) {

                this.tokens.push({

                    type:"operator",

                    value:ch,

                    line:this.line,

                    column:this.column

                });

                i++;

                this.column++;

                continue;

            }

            /* Symbols */

            if (

                "{}[]();,:".includes(ch)

            ) {

                this.tokens.push({

                    type:"symbol",

                    value:ch,

                    line:this.line,

                    column:this.column

                });

                i++;

                this.column++;

                continue;

            }

            i++;

            this.column++;

        }

        return this.tokens;

    }

}
