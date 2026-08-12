/**
 * ESP Next Gen - Virtual Compiler
 * Browser-side compiler for the supported Arduino-like command subset.
 * Produces safe virtual instructions instead of native machine code.
 */
export class VirtualCompiler {
    compile(source = "") {
        const errors = [];
        const warnings = [];
        const instructions = [];
        const lines = String(source).split(/\r?\n/);
        let phase = null;
        let braceDepth = 0;

        lines.forEach((raw, index) => {
            const lineNo = index + 1;
            const line = raw.trim();
            if (!line || line.startsWith("//") || line.startsWith("#include") || line.startsWith("#define")) return;

            if (/\bvoid\s+setup\s*\(\s*\)/.test(line)) {
                phase = "setup";
                braceDepth = Math.max(1, (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length);
                return;
            }
            if (/\bvoid\s+loop\s*\(\s*\)/.test(line)) {
                phase = "loop";
                braceDepth = Math.max(1, (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length);
                return;
            }
            if (!phase) return;

            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;
            if (braceDepth <= 0) {
                phase = null;
                return;
            }

            const parsed = this.parseStatement(line, lineNo);
            if (parsed.error) errors.push(parsed.error);
            if (parsed.warning) warnings.push(parsed.warning);
            if (parsed.instruction) instructions.push({ ...parsed.instruction, phase, line: lineNo });
        });

        if (!/void\s+setup\s*\(/.test(source)) errors.push({ line: 1, message: "Missing setup()" });
        if (!/void\s+loop\s*\(/.test(source)) errors.push({ line: 1, message: "Missing loop()" });

        return {
            ok: errors.length === 0,
            errors,
            warnings,
            instructions,
            instructionCount: instructions.length
        };
    }

    parseStatement(line, lineNo) {
        let m;
        m = line.match(/^pinMode\s*\(\s*(\d+)\s*,\s*(INPUT|OUTPUT|INPUT_PULLUP)\s*\)\s*;?$/);
        if (m) return { instruction: { op: "pinMode", pin: Number(m[1]), mode: m[2] } };

        m = line.match(/^digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW|true|false|1|0)\s*\)\s*;?$/);
        if (m) return { instruction: { op: "digitalWrite", pin: Number(m[1]), state: ["HIGH", "true", "1"].includes(m[2]) } };

        m = line.match(/^analogWrite\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*;?$/);
        if (m) return { instruction: { op: "analogWrite", pin: Number(m[1]), value: Number(m[2]) } };

        m = line.match(/^delay\s*\(\s*(\d+)\s*\)\s*;?$/);
        if (m) return { instruction: { op: "delay", ms: Number(m[1]) } };

        m = line.match(/^Serial\.(print|println)\s*\(\s*(.*?)\s*\)\s*;?$/);
        if (m) return { instruction: { op: "serial", newline: m[1] === "println", value: this.cleanLiteral(m[2]) } };

        m = line.match(/^servo\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*;?$/);
        if (m) return { instruction: { op: "servo", pin: Number(m[1]), angle: Number(m[2]) } };

        m = line.match(/^move\s*\(\s*"(forward|backward|left|right|stop)"\s*(?:,\s*(\d+))?\s*\)\s*;?$/);
        if (m) return { instruction: { op: "move", direction: m[1], speed: Number(m[2] || 0) } };

        if (/^stop\s*\(\s*\)\s*;?$/.test(line)) {
            return { instruction: { op: "move", direction: "stop", speed: 0 } };
        }

        if (/^(int|float|double|bool|long|String|char)\b/.test(line)) {
            return { warning: { line: lineNo, message: "Variable declaration is retained as virtual state." } };
        }

        if (/^\}/.test(line)) return {};
        return { error: { line: lineNo, message: `Unsupported statement: ${line}` } };
    }

    cleanLiteral(value) {
        const text = value.trim();
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            return text.slice(1, -1);
        }
        return text;
    }
}
