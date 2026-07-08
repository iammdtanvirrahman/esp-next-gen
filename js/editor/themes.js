/**
 * ==========================================================
 * Atomic IDE
 * Theme Manager
 * Version 3.0.0
 * ==========================================================
 */

export class ThemeManager {

    constructor() {

        this.current = "dracula";

        this.storageKey = "atomic-theme";

        this.themes = {

            dracula:{

                "--bg":"#282A36",
                "--panel":"#21222C",
                "--sidebar":"#1E1F29",
                "--editor":"#282A36",
                "--text":"#F8F8F2",
                "--comment":"#6272A4",
                "--keyword":"#FF79C6",
                "--string":"#F1FA8C",
                "--function":"#50FA7B",
                "--number":"#BD93F9",
                "--accent":"#8BE9FD",
                "--border":"#44475A"

            },

            dark:{

                "--bg":"#1E1E1E",
                "--panel":"#252526",
                "--sidebar":"#2D2D30",
                "--editor":"#1E1E1E",
                "--text":"#D4D4D4",
                "--comment":"#6A9955",
                "--keyword":"#569CD6",
                "--string":"#CE9178",
                "--function":"#DCDCAA",
                "--number":"#B5CEA8",
                "--accent":"#007ACC",
                "--border":"#3C3C3C"

            },

            light:{

                "--bg":"#FFFFFF",
                "--panel":"#F3F3F3",
                "--sidebar":"#ECECEC",
                "--editor":"#FFFFFF",
                "--text":"#000000",
                "--comment":"#008000",
                "--keyword":"#0000FF",
                "--string":"#A31515",
                "--function":"#795E26",
                "--number":"#098658",
                "--accent":"#0066CC",
                "--border":"#CCCCCC"

            },

            github:{

                "--bg":"#0D1117",
                "--panel":"#161B22",
                "--sidebar":"#161B22",
                "--editor":"#0D1117",
                "--text":"#C9D1D9",
                "--comment":"#8B949E",
                "--keyword":"#FF7B72",
                "--string":"#A5D6FF",
                "--function":"#D2A8FF",
                "--number":"#79C0FF",
                "--accent":"#58A6FF",
                "--border":"#30363D"

            },

            monokai:{

                "--bg":"#272822",
                "--panel":"#2D2E27",
                "--sidebar":"#1F201B",
                "--editor":"#272822",
                "--text":"#F8F8F2",
                "--comment":"#75715E",
                "--keyword":"#F92672",
                "--string":"#E6DB74",
                "--function":"#A6E22E",
                "--number":"#AE81FF",
                "--accent":"#66D9EF",
                "--border":"#3A3B35"

            }

        };

    }

    /**
     * Apply Theme
     */

    apply(name){

        if(!this.themes[name])

            return false;

        this.current = name;

        const theme = this.themes[name];

        Object.keys(theme).forEach(key=>{

            document.documentElement

            .style

            .setProperty(

                key,

                theme[key]

            );

        });

        this.save();

        return true;

    }

    /**
     * Theme Names
     */

    names(){

        return Object.keys(

            this.themes

        );

    }

    /**
     * Current Theme
     */

    currentTheme(){

        return this.current;

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
     * Restore
     */

    restore(){

        const saved =

            localStorage.getItem(

                this.storageKey

            );

        if(

            saved &&

            this.themes[saved]

        ){

            this.apply(saved);

        }

        else{

            this.apply("dracula");

        }

    }

    /**
     * Add Custom Theme
     */

    add(name,colors){

        this.themes[name]=colors;

    }

    /**
     * Remove Theme
     */

    remove(name){

        if(

            ["dracula",

             "dark",

             "light",

             "github",

             "monokai"]

            .includes(name)

        ){

            return false;

        }

        delete this.themes[name];

        return true;

    }

    /**
     * Export
     */

    export(name){

        if(!this.themes[name])

            return null;

        return JSON.stringify(

            this.themes[name],

            null,

            2

        );

    }

    /**
     * Import
     */

    import(name,json){

        try{

            this.themes[name]=

                JSON.parse(json);

            return true;

        }

        catch{

            return false;

        }

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            current:this.current,

            totalThemes:

                Object.keys(

                    this.themes

                ).length

        };

    }

}
