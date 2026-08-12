/* ESP Next Gen - Universal Virtual Compiler */
export class VirtualCompiler {
    constructor() {
        this.forbidden = /\b(?:window|document|globalThis|fetch|WebSocket|XMLHttpRequest|eval|Function|import|location|localStorage|sessionStorage|navigator)\b/;
        this.errors = [];
        this.warnings = [];
    }

    compile(source = "") {
        const text = String(source || "");
        this.errors = [];
        this.warnings = [];
        if (!text.trim()) return this.result(false, [], [{ line: 1, message: "Source is empty." }]);
        if (this.forbidden.test(text)) {
            const match = text.match(this.forbidden);
            return this.result(false, [], [{ line: this.findLine(text, match?.index || 0), message: `Blocked browser/global API: ${match?.[0] || "unknown"}` }]);
        }
        const normalized = this.normalize(text);
        const functions = this.extractFunctions(normalized);
        if (!functions.setup) this.errors.push({ line: 1, message: "Missing void setup()" });
        if (!functions.loop) this.errors.push({ line: 1, message: "Missing void loop()" });
        if (this.errors.length) return this.result(false, [], this.errors);

        const generatedSource = this.buildFactory(functions);
        let factory;
        try {
            factory = new Function("api", `"use strict"; return (async () => { ${generatedSource} })();`);
        } catch (error) {
            this.errors.push({ line: this.extractSyntaxLine(error?.message), message: `Virtual compile error: ${error.message}` });
            return this.result(false, [], this.errors);
        }

        const instructions = this.collectHardwareCalls(text);
        return {
            ok: true, errors: [], warnings: [...this.warnings], instructionCount: instructions.length,
            instructions, functions: Object.keys(functions).filter(k => k !== "preamble"),
            globals: functions.preamble || "", generatedSource, factory,
            sourceLines: text.split(/\r?\n/).length
        };
    }

    normalize(source) {
        return source
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/(^|\n)\s*\/\/.*$/gm, "$1")
            .replace(/^\s*#\s*include[^\n]*$/gm, "")
            .replace(/^\s*#\s*define[^\n]*$/gm, "")
            .replace(/\bPROGMEM\b/g, "")
            .replace(/\bHIGH\b/g, "true")
            .replace(/\bLOW\b/g, "false")
            .replace(/\bINPUT_PULLUP\b/g, "\"INPUT_PULLUP\"")
            .replace(/\bINPUT\b/g, "\"INPUT\"")
            .replace(/\bOUTPUT\b/g, "\"OUTPUT\"")
            .replace(/\bNULL\b/g, "null")
            .replace(/\b(?:uint8_t|uint16_t|uint32_t|int8_t|int16_t|unsigned|signed|long long|long|short|double|float|int|bool|char|byte|String|size_t)\s+(?=[A-Za-z_])/g, "let ")
            .replace(/\bconst\s+let\b/g, "const")
            .replace(/\bvoid\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g, (_, name, params) => `async function ${name}(${this.cleanParams(params)})`)
            .replace(/\b(?:int|float|double|long|short|byte|bool|char|String|uint8_t|uint16_t|uint32_t|size_t)\s+([A-Za-z_]\w*)\s*\(/g, "async function $1(")
            .replace(/\bdelayMicroseconds\s*\(/g, "await api.delayMicroseconds(")
            .replace(/\bdelay\s*\(/g, "await api.delay(")
            .replace(/\bpinMode\s*\(/g, "api.pinMode(")
            .replace(/\bdigitalWrite\s*\(/g, "api.digitalWrite(")
            .replace(/\banalogWrite\s*\(/g, "api.analogWrite(")
            .replace(/\bdigitalRead\s*\(/g, "api.digitalRead(")
            .replace(/\banalogRead\s*\(/g, "api.analogRead(")
            .replace(/\bmillis\s*\(\s*\)/g, "api.millis()")
            .replace(/\bmicros\s*\(\s*\)/g, "api.micros()")
            .replace(/\bconstrain\s*\(/g, "api.constrain(")
            .replace(/\bmap\s*\(/g, "api.map(")
            .replace(/\babs\s*\(/g, "api.abs(")
            .replace(/\bmin\s*\(/g, "api.min(")
            .replace(/\bmax\s*\(/g, "api.max(")
            .replace(/\brandom\s*\(/g, "api.random(")
            .replace(/\brandomSeed\s*\(/g, "api.randomSeed(")
            .replace(/\byield\s*\(\s*\)/g, "await api.yield()")
            .replace(/\bSerial\s*\.\s*println\s*\(/g, "await api.serialPrintln(")
            .replace(/\bSerial\s*\.\s*print\s*\(/g, "await api.serialPrint(")
            .replace(/\bSerial\s*\.\s*begin\s*\(/g, "await api.serialBegin(")
            .replace(/\bSerial\s*\.\s*printf\s*\(/g, "await api.serialPrintf(");
    }

    cleanParams(params) {
        if (!params.trim()) return "";
        return params.split(",").map(param => param.trim()
            .replace(/^(const\s+)?(?:unsigned\s+)?(?:int|float|double|long|short|bool|char|byte|String|size_t|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+/, "")
            .replace(/\s*=\s*[^=]+$/, "")).join(", ");
    }

    extractFunctions(source) {
        const functions = { preamble: "" };
        const regex = /(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g;
        let match; let firstFunctionIndex = -1;
        while ((match = regex.exec(source))) {
            if (firstFunctionIndex < 0) firstFunctionIndex = match.index;
            const name = match[1]; const start = regex.lastIndex;
            let depth = 1; let index = start; let quote = null;
            while (index < source.length && depth > 0) {
                const char = source[index];
                if (quote) { if (char === "\\") index += 2; else if (char === quote) quote = null; }
                else if (char === '"' || char === "'" || char === "`") quote = char;
                else if (char === "{") depth += 1;
                else if (char === "}") depth -= 1;
                index += 1;
            }
            if (depth !== 0) { this.errors.push({ line: this.findLine(source, match.index), message: `Unclosed function body: ${name}()` }); break; }
            functions[name] = { name, params: match[2].trim(), body: source.slice(start, index - 1) };
            regex.lastIndex = index;
        }
        if (firstFunctionIndex > 0) functions.preamble = source.slice(0, firstFunctionIndex).trim();
        return functions;
    }

    buildFactory(functions) {
        const declarations = Object.keys(functions).filter(n => n !== "preamble").map(name => {
            const fn = functions[name]; return `async function ${fn.name}(${fn.params}) { ${fn.body} }`;
        }).join("\n");
        const globals = functions.preamble ? `${functions.preamble}\n` : "";
        const names = Object.keys(functions).filter(n => n !== "preamble");
        return `${globals}${declarations}\nreturn { setup, loop, functions: { ${names.join(", ")} } };`;
    }

    collectHardwareCalls(source) {
        const calls = [];
        const patterns = [
            ["pinMode", /pinMode\s*\(([^)]*)\)/g], ["digitalWrite", /digitalWrite\s*\(([^)]*)\)/g],
            ["analogWrite", /analogWrite\s*\(([^)]*)\)/g], ["digitalRead", /digitalRead\s*\(([^)]*)\)/g],
            ["analogRead", /analogRead\s*\(([^)]*)\)/g], ["delay", /\bdelay\s*\(([^)]*)\)/g],
            ["Serial", /Serial\s*\.\s*(print|println|printf|begin)\s*\(([^)]*)\)/g]
        ];
        for (const [op, regex] of patterns) { let match; while ((match = regex.exec(source))) calls.push({ op, args: match[1] || match[2] || "", line: this.findLine(source, match.index) }); }
        calls.sort((a,b) => a.line - b.line); return calls;
    }

    result(ok, instructions, errors = []) { return { ok, errors, warnings: [...this.warnings], instructions, instructionCount: instructions.length, sourceLines: 0 }; }
    findLine(source, index) { return source.slice(0, Math.max(0,index)).split(/\r?\n/).length; }
    extractSyntaxLine(message = "") { const match = String(message).match(/line\s+(\d+)/i); return match ? Number(match[1]) : 1; }
}
