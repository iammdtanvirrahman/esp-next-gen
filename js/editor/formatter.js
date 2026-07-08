/**
 * ==========================================================
 * Atomic IDE
 * Arduino/C++ Code Formatter
 * Version 3.0.0
 * ==========================================================
 */

export class Formatter {

    constructor(editor = null) {

        this.editor = editor;

        this.indentSize = 4;

        this.useSpaces = true;

        this.braceStyle = "attach";

        this.removeTrailingSpaces = true;

    }

    /**
     * Format Entire Document
     */

    format(code) {

        let lines = code.split("\n");

        lines = this.cleanWhitespace(lines);

        lines = this.formatBraces(lines);

        lines = this.indent(lines);

        return lines.join("\n");

    }

    /**
     * Remove Trailing Spaces
     */

    cleanWhitespace(lines) {

        if (!this.removeTrailingSpaces)

            return lines;

        return lines.map(line =>

            line.replace(/\s+$/g, "")

        );

    }

    /**
     * Brace Style
     */

    formatBraces(lines) {

        const result = [];

        lines.forEach(line => {

            let text = line.trim();

            if (this.braceStyle === "allman") {

                text = text.replace(/\s*{/g, "\n{");

            }

            result.push(text);

        });

        return result;

    }

    /**
     * Auto Indentation
     */

    indent(lines) {

        let depth = 0;

        const output = [];

        lines.forEach(line => {

            let text = line.trim();

            if (text.startsWith("}")) {

                depth = Math.max(0, depth - 1);

            }

            const indent = this.useSpaces
                ? " ".repeat(depth * this.indentSize)
                : "\t".repeat(depth);

            output.push(indent + text);

            if (text.endsWith("{")) {

                depth++;

            }

        });

        return output;

    }

    /**
     * Format Current Editor
     */

    formatEditor() {

        if (!this.editor)

            return;

        const code = this.editor.getValue();

        const formatted = this.format(code);

        this.editor.setValue(formatted);

    }

    /**
     * Format Selection
     */

    formatSelection(text) {

        return this.format(text);

    }

    /**
     * Settings
     */

    setIndent(size) {

        this.indentSize = size;

    }

    setTabs() {

        this.useSpaces = false;

    }

    setSpaces() {

        this.useSpaces = true;

    }

    setBraceStyle(style) {

        this.braceStyle = style;

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            indentSize: this.indentSize,

            useSpaces: this.useSpaces,

            braceStyle: this.braceStyle,

            trimWhitespace: this.removeTrailingSpaces

        };

    }

}
