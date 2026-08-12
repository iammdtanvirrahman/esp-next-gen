export class BuildManager {
    constructor({ terminal, compiler, libraryResolver, targetValidator, plugins }) {
        this.terminal = terminal;
        this.compiler = compiler;
        this.libraryResolver = libraryResolver;
        this.targetValidator = targetValidator;
        this.plugins = plugins;
        this.initialized = false;
        this.lastReport = null;
    }

    async initialize() {
        if (this.libraryResolver?.initialize) await this.libraryResolver.initialize();
        this.initialized = true;
    }

    build({ source, target, project = {} }) {
        const code = String(source || "");
        const report = {
            ok: false,
            timestamp: new Date().toISOString(),
            target: target?.id || "generic-mcu",
            targetName: target?.name || "Generic MCU",
            project: project.name || "Untitled Project",
            sourceLines: code.split(/\r?\n/).length,
            libraries: [],
            missingIncludes: [],
            duplicateIncludes: [],
            warnings: [],
            errors: [],
            instructionCount: 0
        };

        if (!this.initialized) report.warnings.push("Build manager was not initialized; using available registry data.");

        const targetResult = this.targetValidator?.validate?.(code) || { ok: true, warnings: [], errors: [] };
        report.warnings.push(...(targetResult.warnings || []));
        report.errors.push(...(targetResult.errors || []));

        let resolution = [];
        try {
            resolution = this.libraryResolver?.resolve?.(code) || [];
            report.libraries = resolution.map(lib => ({
                id: lib.id,
                name: lib.name,
                header: lib.header,
                platform: lib.platform || "generic"
            }));
            report.missingIncludes = this.libraryResolver?.missingIncludes?.(code) || [];
            report.duplicateIncludes = this.libraryResolver?.checkDuplicateIncludes?.(code) || [];
            report.warnings.push(...report.duplicateIncludes.map(item => `Duplicate include: ${item}`));
        } catch (error) {
            report.warnings.push(`Library resolution unavailable: ${error.message}`);
        }

        const compileResult = this.compiler.compile(code);
        report.errors.push(...(compileResult.errors || []).map(item => item.message || String(item)));
        report.warnings.push(...(compileResult.warnings || []).map(item => item.message || String(item)));
        report.instructionCount = compileResult.instructionCount || compileResult.instructions?.length || 0;
        report.ok = Boolean(compileResult.ok ?? compileResult.success) && report.errors.length === 0;
        report.compiler = {
            ok: Boolean(compileResult.ok ?? compileResult.success),
            functions: compileResult.functions || [],
            instructions: compileResult.instructions || [],
            generatedIncludes: this.libraryResolver?.generateIncludeBlock?.() || ""
        };

        this.lastReport = report;
        this.render(report);
        return report;
    }

    projectManifest({ name, target, pack, files = [] }) {
        return {
            format: "universal-hardware-project",
            version: 1,
            name: name || "Untitled Project",
            target: target?.id || "generic-mcu",
            hardwarePack: pack?.id || "core-generic",
            files: files.map(file => ({ name: file.name, language: file.language || "cpp" }))
        };
    }

    render(report) {
        const root = document.getElementById("buildReport");
        if (!root) return;
        const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
        root.className = `build-report ${report.ok ? "ok" : "error"}`;
        root.innerHTML = `
            <div class="build-report-head">
                <strong>${report.ok ? "BUILD PASSED" : "BUILD FAILED"}</strong>
                <span>${esc(report.targetName)}</span>
            </div>
            <div class="build-report-grid">
                <div><span>Project</span><b>${esc(report.project)}</b></div>
                <div><span>Source lines</span><b>${report.sourceLines}</b></div>
                <div><span>Libraries</span><b>${report.libraries.length}</b></div>
                <div><span>Ops</span><b>${report.instructionCount}</b></div>
            </div>
            ${report.libraries.length ? `<div class="build-report-section"><h4>Resolved libraries</h4>${report.libraries.map(lib => `<div>${esc(lib.name)} — &lt;${esc(lib.header)}&gt;</div>`).join("")}</div>` : ""}
            ${report.missingIncludes.length ? `<div class="build-report-section warning"><h4>Missing includes</h4>${report.missingIncludes.map(item => `<div>${esc(item)}</div>`).join("")}</div>` : ""}
            ${report.warnings.length ? `<div class="build-report-section warning"><h4>Warnings</h4>${report.warnings.map(item => `<div>${esc(item)}</div>`).join("")}</div>` : ""}
            ${report.errors.length ? `<div class="build-report-section error"><h4>Errors</h4>${report.errors.map(item => `<div>${esc(item)}</div>`).join("")}</div>` : ""}
        `;
    }
}
