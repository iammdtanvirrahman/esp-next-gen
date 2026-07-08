/**
 * ==========================================================
 * Atomic IDE
 * Find & Replace Engine
 * Version 3.0.0
 * ==========================================================
 */

export class SearchEngine {

    constructor(editor = null) {

        this.editor = editor;

        this.matches = [];

        this.lastQuery = "";

        this.options = {

            matchCase: false,

            wholeWord: false,

            regex: false

        };

    }

    /**
     * Configure Search
     */

    configure(options = {}) {

        Object.assign(this.options, options);

    }

    /**
     * Build Regular Expression
     */

    buildRegex(query) {

        let pattern = query;

        if (!this.options.regex) {

            pattern = pattern.replace(

                /[.*+?^${}()|[\]\\]/g,

                "\\$&"

            );

        }

        if (this.options.wholeWord) {

            pattern = "\\b" + pattern + "\\b";

        }

        const flags = this.options.matchCase

            ? "g"

            : "gi";

        return new RegExp(pattern, flags);

    }

    /**
     * Find All
     */

    find(query, text) {

        this.lastQuery = query;

        this.matches = [];

        const regex = this.buildRegex(query);

        let match;

        while ((match = regex.exec(text)) !== null) {

            this.matches.push({

                index: match.index,

                text: match[0],

                length: match[0].length

            });

        }

        return this.matches;

    }

    /**
     * Replace First
     */

    replace(text, search, replacement) {

        const regex = this.buildRegex(search);

        return text.replace(regex, replacement);

    }

    /**
     * Replace All
     */

    replaceAll(text, search, replacement) {

        const regex = this.buildRegex(search);

        return text.replace(regex, replacement);

    }

    /**
     * Search Current Editor
     */

    searchEditor(query) {

        if (!this.editor)

            return [];

        const code = this.editor.getValue();

        return this.find(query, code);

    }

    /**
     * Replace in Editor
     */

    replaceEditor(search, replacement) {

        if (!this.editor)

            return;

        const code = this.editor.getValue();

        const output = this.replace(

            code,

            search,

            replacement

        );

        this.editor.setValue(output);

    }

    /**
     * Replace All in Editor
     */

    replaceAllEditor(search, replacement) {

        if (!this.editor)

            return;

        const code = this.editor.getValue();

        const output = this.replaceAll(

            code,

            search,

            replacement

        );

        this.editor.setValue(output);

    }

    /**
     * Search Multiple Files
     */

    searchFiles(files, query) {

        const results = [];

        files.forEach(file => {

            const found = this.find(

                query,

                file.content

            );

            if (found.length > 0) {

                results.push({

                    file: file.name,

                    matches: found

                });

            }

        });

        return results;

    }

    /**
     * Highlight Matches
     */

    highlight() {

        if (

            !this.editor ||

            !this.editor.editor

        ) return;

        this.editor.editor.operation(() => {

            this.matches.forEach(match => {

                const pos = this.editor.editor.posFromIndex(

                    match.index

                );

                const end = this.editor.editor.posFromIndex(

                    match.index +

                    match.length

                );

                this.editor.editor.markText(

                    pos,

                    end,

                    {

                        className:

                        "search-highlight"

                    }

                );

            });

        });

    }

    /**
     * Clear Highlights
     */

    clearHighlights() {

        if (

            !this.editor ||

            !this.editor.editor

        ) return;

        this.editor.editor.getAllMarks()

            .forEach(mark => mark.clear());

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            query: this.lastQuery,

            matches: this.matches.length,

            matchCase:

                this.options.matchCase,

            wholeWord:

                this.options.wholeWord,

            regex:

                this.options.regex

        };

    }

}
