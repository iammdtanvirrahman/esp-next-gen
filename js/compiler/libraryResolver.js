/**
 * ==========================================================
 * Atomic IDE
 * Library Resolver
 * Version 1.0
 * ==========================================================
 */

export class LibraryResolver {

    constructor() {

        this.registry = [];

        this.required = new Map();

        this.loaded = false;

    }

    /**
     * Initialize
     */

    async initialize() {

        await this.loadRegistry();

    }

    /**
     * Load libraries.json
     */

    async loadRegistry() {

        try {

            const response = await fetch(

                "data/libraries.json"

            );

            const data = await response.json();

            this.registry = data.libraries || [];

            this.loaded = true;

        }

        catch(error){

            console.error(

                "Unable to load libraries.",

                error

            );

        }

    }

    /**
     * Resolve Source Code
     */

    resolve(code){

        this.required.clear();

        this.registry.forEach(library=>{

            this.scanLibrary(

                library,

                code

            );

        });

        return Array.from(

            this.required.values()

        );

    }

    /**
     * Scan One Library
     */

    scanLibrary(

        library,

        code

    ){

        let detected = false;

        const words = [

            ...(library.classes || []),

            ...(library.functions || []),

            ...(library.keywords || [])

        ];

        words.forEach(word=>{

            const regex =

            new RegExp(

                "\\b"+word+"\\b"

            );

            if(

                regex.test(code)

            ){

                detected = true;

            }

        });

        if(detected){

            this.required.set(

                library.id,

                library

            );

        }

    }

    /**
     * Missing Includes
     */

    missingIncludes(code){

        const result = [];

        this.required.forEach(lib=>{

            const include =

            `#include <${lib.header}>`;

            if(

                !code.includes(include)

            ){

                result.push(include);

            }

        });

        return result;

    }

    /**
     * Auto Generate Includes
     */

    generateIncludeBlock(){

        let output = "";

        this.required.forEach(lib=>{

            output +=

            `#include <${lib.header}>\n`;

        });

        return output;

    }

    /**
     * Check Duplicate
     */

    checkDuplicateIncludes(code){

        const duplicates = [];

        this.required.forEach(lib=>{

            const include =

            `#include <${lib.header}>`;

            const count =

            code.split(include).length-1;

            if(count>1){

                duplicates.push(include);

            }

        });

        return duplicates;

    }

    /**
     * Find Library
     */

    getLibrary(id){

        return this.registry.find(

            item=>item.id===id

        );

    }

    /**
     * Installed
     */

    isResolved(id){

        return this.required.has(id);

    }

    /**
     * Reset
     */

    clear(){

        this.required.clear();

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            totalLibraries:

            this.registry.length,

            resolved:

            this.required.size

        };

    }

}
