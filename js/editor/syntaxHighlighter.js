/**
 * ==========================================================
 * Atomic IDE
 * Syntax Highlighter
 * Version 3.0.0
 * ==========================================================
 */

export class SyntaxHighlighter {

    constructor(editor) {

        this.editor = editor;

        this.enabled = true;

        this.theme = "dracula";

        this.keywords = [

            "void",
            "int",
            "float",
            "double",
            "char",
            "bool",
            "String",
            "long",
            "short",
            "const",
            "static",
            "return",
            "if",
            "else",
            "switch",
            "case",
            "for",
            "while",
            "do",
            "break",
            "continue",
            "true",
            "false",
            "HIGH",
            "LOW",
            "INPUT",
            "OUTPUT",
            "INPUT_PULLUP"

        ];

        this.functions = [

            "setup",
            "loop",
            "pinMode",
            "digitalWrite",
            "digitalRead",
            "analogRead",
            "analogWrite",
            "ledcWrite",
            "ledcSetup",
            "ledcAttachPin",
            "delay",
            "delayMicroseconds",
            "millis",
            "micros",
            "pulseIn",
            "tone",
            "noTone",

            "Serial",
            "WiFi",
            "SPIFFS",
            "LittleFS"

        ];

        this.preprocessor = [

            "#include",

            "#define",

            "#ifdef",

            "#ifndef",

            "#endif",

            "#pragma"

        ];

    }

    /**
     * Enable
     */

    enable() {

        this.enabled = true;

    }

    /**
     * Disable
     */

    disable() {

        this.enabled = false;

    }

    /**
     * Theme
     */

    setTheme(theme) {

        this.theme = theme;

    }

    /**
     * Analyze Source
     */

    analyze(code) {

        const tokens = [];

        const lines = code.split("\n");

        lines.forEach((line,index)=>{

            tokens.push(

                ...this.tokenize(

                    line,

                    index+1

                )

            );

        });

        return tokens;

    }

    /**
     * Tokenizer
     */

    tokenize(line,lineNumber){

        const tokens=[];

        const words=

            line.match(

                /"[^"]*"|\/\/.*|#\w+|[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|./g

            ) || [];

        words.forEach(word=>{

            let type="text";

            if(

                this.keywords.includes(word)

            ){

                type="keyword";

            }

            else if(

                this.functions.includes(word)

            ){

                type="function";

            }

            else if(

                this.preprocessor.includes(word)

            ){

                type="preprocessor";

            }

            else if(

                /^\/\/.*/.test(word)

            ){

                type="comment";

            }

            else if(

                /^".*"$/.test(word)

            ){

                type="string";

            }

            else if(

                /^\d+(\.\d+)?$/.test(word)

            ){

                type="number";

            }

            tokens.push({

                line:lineNumber,

                value:word,

                type

            });

        });

        return tokens;

    }

    /**
     * CSS Class
     */

    css(type){

        const classes={

            keyword:

                "token-keyword",

            function:

                "token-function",

            string:

                "token-string",

            comment:

                "token-comment",

            number:

                "token-number",

            preprocessor:

                "token-preprocessor",

            text:

                "token-text"

        };

        return classes[type] ||

               "token-text";

    }

    /**
     * Highlight Errors
     */

    error(line){

        if(

            !this.editor ||

            !this.editor.editor

        ) return;

        this.editor.editor.addLineClass(

            line-1,

            "background",

            "syntax-error"

        );

    }

    /**
     * Clear Errors
     */

    clearErrors(totalLines){

        if(

            !this.editor ||

            !this.editor.editor

        ) return;

        for(

            let i=0;

            i<totalLines;

            i++

        ){

            this.editor.editor.removeLineClass(

                i,

                "background",

                "syntax-error"

            );

        }

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            enabled:this.enabled,

            theme:this.theme,

            keywords:

                this.keywords.length,

            functions:

                this.functions.length,

            preprocessors:

                this.preprocessor.length

        };

    }

}
