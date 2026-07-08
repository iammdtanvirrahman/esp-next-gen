/**
 * ==========================================================
 * Atomic IDE
 * Arduino IntelliSense Engine
 * Version 3.0.0
 * ==========================================================
 */

export class AutoComplete {

    constructor(editor) {

        this.editor = editor;

        this.components = [];

        this.keywords = [];

        this.functions = [];

        this.variables = [];

        this.loaded = false;

    }

    /**
     * Load components.json
     */

    async load(url = "data/components.json") {

        try {

            const response = await fetch(url);

            const json = await response.json();

            this.components = json.components || [];

            this.buildDatabase();

            this.loaded = true;

        }

        catch (error) {

            console.error(error);

        }

    }

    /**
     * Build Database
     */

    buildDatabase() {

        this.keywords = [

            "void",
            "int",
            "float",
            "double",
            "char",
            "bool",
            "String",
            "const",
            "return",
            "if",
            "else",
            "for",
            "while",
            "switch",
            "case",
            "break",
            "continue",
            "true",
            "false"

        ];

        this.functions = [

            "setup()",
            "loop()",
            "pinMode()",
            "digitalWrite()",
            "digitalRead()",
            "analogWrite()",
            "analogRead()",
            "ledcWrite()",
            "ledcSetup()",
            "ledcAttachPin()",
            "delay()",
            "delayMicroseconds()",
            "millis()",
            "micros()",
            "tone()",
            "noTone()",
            "pulseIn()",
            "map()",
            "constrain()",
            "random()",
            "randomSeed()"

        ];

        this.components.forEach(component => {

            if (component.functions) {

                component.functions.forEach(fn => {

                    this.functions.push(fn);

                });

            }

        });

    }

    /**
     * Register Variable
     */

    addVariable(name) {

        if (

            !this.variables.includes(name)

        ) {

            this.variables.push(name);

        }

    }

    /**
     * Suggestions
     */

    suggestions(prefix = "") {

        const all = [

            ...this.keywords,

            ...this.functions,

            ...this.variables

        ];

        return all

            .filter(item =>

                item

                .toLowerCase()

                .startsWith(

                    prefix.toLowerCase()

                )

            )

            .sort();

    }

    /**
     * Hover Info
     */

    documentation(word) {

        const docs = {

            pinMode:

            "Configure GPIO mode.",

            digitalWrite:

            "Write HIGH or LOW to a pin.",

            digitalRead:

            "Read digital GPIO.",

            analogRead:

            "Read analog input.",

            analogWrite:

            "Generate PWM output.",

            delay:

            "Pause execution in milliseconds.",

            millis:

            "Milliseconds since boot.",

            micros:

            "Microseconds since boot.",

            Serial:

            "Hardware serial interface."

        };

        return docs[word] ||

               "No documentation.";

    }

    /**
     * Parameter Hint
     */

    signature(name) {

        const map = {

            pinMode:

                "pinMode(pin, mode)",

            digitalWrite:

                "digitalWrite(pin, value)",

            digitalRead:

                "digitalRead(pin)",

            analogRead:

                "analogRead(pin)",

            analogWrite:

                "analogWrite(pin, value)",

            delay:

                "delay(milliseconds)",

            pulseIn:

                "pulseIn(pin,state)"

        };

        return map[name] ||

               "";

    }

    /**
     * GPIO Suggestions
     */

    gpio() {

        return [

            "GPIO0",

            "GPIO2",

            "GPIO4",

            "GPIO5",

            "GPIO12",

            "GPIO13",

            "GPIO14",

            "GPIO15",

            "GPIO16",

            "GPIO17",

            "GPIO18",

            "GPIO19",

            "GPIO21",

            "GPIO22",

            "GPIO23",

            "GPIO25",

            "GPIO26",

            "GPIO27",

            "GPIO32",

            "GPIO33",

            "GPIO34",

            "GPIO35",

            "GPIO36",

            "GPIO39"

        ];

    }

    /**
     * Fuzzy Search
     */

    search(text) {

        const database = [

            ...this.keywords,

            ...this.functions,

            ...this.variables

        ];

        return database.filter(item =>

            item

            .toLowerCase()

            .includes(

                text.toLowerCase()

            )

        );

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            loaded: this.loaded,

            keywords:

                this.keywords.length,

            functions:

                this.functions.length,

            variables:

                this.variables.length,

            components:

                this.components.length

        };

    }

}
