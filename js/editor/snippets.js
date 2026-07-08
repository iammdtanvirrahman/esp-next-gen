/**
 * ==========================================================
 * Atomic IDE
 * Arduino & ESP32 Snippet Manager
 * Version 3.0.0
 * ==========================================================
 */

export class SnippetManager {

    constructor(editor = null) {

        this.editor = editor;

        this.snippets = [];

        this.customSnippets = [];

        this.loadDefaultSnippets();

    }

    /**
     * Load Built-in Snippets
     */

    loadDefaultSnippets() {

        this.snippets = [

            {
                id: "arduino",
                title: "Arduino Sketch",
                prefix: "sketch",
                category: "Arduino",
                code:
`void setup() {

    Serial.begin(115200);

}

void loop() {

}`
            },

            {
                id: "wifi",
                title: "WiFi Connect",
                prefix: "wifi",
                category: "Networking",
                code:
`#include <WiFi.h>

const char* ssid = "";
const char* password = "";

void setup() {

    WiFi.begin(ssid,password);

    while(WiFi.status()!=WL_CONNECTED){

        delay(500);

    }

}`
            },

            {
                id: "digitalwrite",
                title: "Digital Output",
                prefix: "digital",
                category: "GPIO",
                code:
`pinMode(2,OUTPUT);

digitalWrite(2,HIGH);`
            },

            {
                id: "analogread",
                title: "Analog Read",
                prefix: "analog",
                category: "ADC",
                code:
`int value = analogRead(34);`
            },

            {
                id: "pwm",
                title: "PWM Output",
                prefix: "pwm",
                category: "PWM",
                code:
`ledcSetup(0,5000,8);

ledcAttachPin(2,0);

ledcWrite(0,128);`
            },

            {
                id: "task",
                title: "FreeRTOS Task",
                prefix: "task",
                category: "FreeRTOS",
                code:
`void Task(void *pv){

    while(true){

        vTaskDelay(1000);

    }

}`
            },

            {
                id: "webserver",
                title: "ESP32 WebServer",
                prefix: "server",
                category: "Web",
                code:
`WebServer server(80);

server.begin();`
            },

            {
                id: "firebase",
                title: "Firebase",
                prefix: "firebase",
                category: "Cloud",
                code:
`Firebase.begin(&config,&auth);`
            }

        ];

    }

    /**
     * Get All
     */

    getAll() {

        return [

            ...this.snippets,

            ...this.customSnippets

        ];

    }

    /**
     * Search
     */

    search(keyword) {

        keyword = keyword.toLowerCase();

        return this.getAll().filter(item =>

            item.title.toLowerCase().includes(keyword) ||

            item.prefix.toLowerCase().includes(keyword) ||

            item.category.toLowerCase().includes(keyword)

        );

    }

    /**
     * Get Category
     */

    category(name) {

        return this.getAll().filter(

            item => item.category === name

        );

    }

    /**
     * Insert
     */

    insert(id) {

        if (!this.editor)

            return false;

        const snippet =

            this.getAll().find(

                s => s.id === id

            );

        if (!snippet)

            return false;

        this.editor.insert(

            snippet.code

        );

        return true;

    }

    /**
     * Add Custom Snippet
     */

    add(snippet) {

        this.customSnippets.push(snippet);

    }

    /**
     * Delete
     */

    remove(id) {

        this.customSnippets =

            this.customSnippets.filter(

                item => item.id !== id

            );

    }

    /**
     * Export
     */

    export() {

        return JSON.stringify(

            this.customSnippets,

            null,

            2

        );

    }

    /**
     * Import
     */

    import(json) {

        try {

            this.customSnippets =

                JSON.parse(json);

        }

        catch(error){

            console.error(error);

        }

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            builtIn:

                this.snippets.length,

            custom:

                this.customSnippets.length,

            total:

                this.getAll().length

        };

    }

}
