/**
 * ==========================================================
 * Atomic IDE
 * Theme Manager
 * ==========================================================
 */

export class ThemeManager {

    constructor() {

        this.current = "dracula";

        this.storageKey = "atomic-theme";

        this.themes = {

            dracula: {
                name: "Dracula",
                class: "theme-dracula"
            },

            dark: {
                name: "Dark",
                class: "theme-dark"
            },

            light: {
                name: "Light",
                class: "theme-light"
            }

        };

    }

    /**
     * Initialize
     */

    async initialize() {

        this.load();

        this.detectSystemTheme();

        this.bindButtons();

    }

    /**
     * Load Saved Theme
     */

    load() {

        const saved = localStorage.getItem(this.storageKey);

        if(saved){

            this.setTheme(saved);

        }

        else{

            this.setTheme("dracula");

        }

    }

    /**
     * Save
     */

    save(){

        localStorage.setItem(

            this.storageKey,

            this.current

        );

    }

    /**
     * Set Theme
     */

    setTheme(name){

        if(!this.themes[name]) return;

        document.body.classList.remove(

            ...Object.values(this.themes)

            .map(theme => theme.class)

        );

        document.body.classList.add(

            this.themes[name].class

        );

        this.current = name;

        this.save();

        this.dispatch();

    }

    /**
     * Toggle
     */

    toggle(){

        switch(this.current){

            case "dracula":

                this.setTheme("dark");

                break;

            case "dark":

                this.setTheme("light");

                break;

            default:

                this.setTheme("dracula");

        }

    }

    /**
     * Accent Color
     */

    setAccent(color){

        document.documentElement.style.setProperty(

            "--color-primary",

            color

        );

        localStorage.setItem(

            "atomic-accent",

            color

        );

    }

    /**
     * Restore Accent
     */

    loadAccent(){

        const accent = localStorage.getItem(

            "atomic-accent"

        );

        if(accent){

            this.setAccent(accent);

        }

    }

    /**
     * Detect System
     */

    detectSystemTheme(){

        const media = window.matchMedia(

            "(prefers-color-scheme: dark)"

        );

        media.addEventListener(

            "change",

            e=>{

                if(localStorage.getItem(this.storageKey))

                    return;

                this.setTheme(

                    e.matches ?

                    "dark"

                    :

                    "light"

                );

            }

        );

    }

    /**
     * Theme Buttons
     */

    bindButtons(){

        document.querySelectorAll(

            "[data-theme]"

        )

        .forEach(button=>{

            button.addEventListener(

                "click",

                ()=>{

                    this.setTheme(

                        button.dataset.theme

                    );

                }

            );

        });

    }

    /**
     * Event
     */

    dispatch(){

        document.dispatchEvent(

            new CustomEvent(

                "theme-change",

                {

                    detail:{

                        theme:this.current

                    }

                }

            )

        );

    }

    /**
     * Get Current Theme
     */

    getTheme(){

        return this.current;

    }

}
