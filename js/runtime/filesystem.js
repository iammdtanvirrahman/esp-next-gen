/**
 * ==========================================================
 * Atomic IDE
 * Virtual SPIFFS / LittleFS
 * Version 2.0.0
 * ==========================================================
 */

export class FileSystem {

    constructor() {

        this.label = "LittleFS";

        this.capacity = 4 * 1024 * 1024; // 4MB

        this.used = 0;

        this.files = new Map();

        this.directories = new Set(["/"]);

    }

    /**
     * Format Filesystem
     */

    format() {

        this.files.clear();

        this.directories.clear();

        this.directories.add("/");

        this.used = 0;

    }

    /**
     * Mount
     */

    begin() {

        return true;

    }

    /**
     * Create Directory
     */

    mkdir(path) {

        if (!path.startsWith("/"))

            path = "/" + path;

        this.directories.add(path);

        return true;

    }

    /**
     * Remove Directory
     */

    rmdir(path) {

        if (path === "/")

            return false;

        this.directories.delete(path);

        return true;

    }

    /**
     * Exists
     */

    exists(path) {

        return this.files.has(path);

    }

    /**
     * Write File
     */

    writeFile(path, content = "") {

        const size =

            new TextEncoder()

            .encode(content).length;

        if (

            this.used + size >

            this.capacity

        ) {

            throw new Error(

                "Filesystem Full"

            );

        }

        if (

            this.files.has(path)

        ) {

            this.used -=

            this.files.get(path).size;

        }

        this.files.set(path, {

            path,

            content,

            size,

            created:new Date(),

            modified:new Date()

        });

        this.used += size;

        return true;

    }

    /**
     * Read File
     */

    readFile(path) {

        if (!this.files.has(path))

            return null;

        return this.files.get(path).content;

    }

    /**
     * Append
     */

    appendFile(path, text) {

        const old =

            this.readFile(path) || "";

        this.writeFile(

            path,

            old + text

        );

    }

    /**
     * Delete
     */

    remove(path) {

        if (

            !this.files.has(path)

        )

            return false;

        this.used -=

        this.files.get(path).size;

        this.files.delete(path);

        return true;

    }

    /**
     * Rename
     */

    rename(oldPath,newPath){

        if(

            !this.files.has(oldPath)

        )

            return false;

        const file =

            this.files.get(oldPath);

        file.path=newPath;

        this.files.delete(oldPath);

        this.files.set(newPath,file);

        return true;

    }

    /**
     * Copy
     */

    copy(source,target){

        if(

            !this.files.has(source)

        )

            return false;

        const file=

        this.files.get(source);

        this.writeFile(

            target,

            file.content

        );

        return true;

    }

    /**
     * List Files
     */

    list(directory="/"){

        return

        [...this.files.values()]

        .filter(

            file=>file.path

            .startsWith(directory)

        );

    }

    /**
     * Search
     */

    search(keyword){

        return

        [...this.files.values()]

        .filter(file=>

            file.path.includes(keyword)

            ||

            file.content.includes(keyword)

        );

    }

    /**
     * File Info
     */

    info(path){

        return this.files.get(path);

    }

    /**
     * Free Space
     */

    free(){

        return

        this.capacity -

        this.used;

    }

    /**
     * Usage
     */

    usage(){

        return (

            this.used /

            this.capacity

        ) * 100;

    }

    /**
     * Export
     */

    export(){

        return JSON.stringify(

            {

                files:

                [...this.files],

                directories:

                [...this.directories]

            },

            null,

            2

        );

    }

    /**
     * Import
     */

    import(data){

        const json=

        JSON.parse(data);

        this.files=

        new Map(json.files);

        this.directories=

        new Set(json.directories);

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            filesystem:this.label,

            capacity:this.capacity,

            used:this.used,

            free:this.free(),

            usage:

                this.usage().toFixed(2),

            files:

                this.files.size,

            directories:

                this.directories.size

        };

    }

}
