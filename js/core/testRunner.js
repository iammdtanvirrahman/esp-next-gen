export class TestRunner {
    constructor(ide) {
        this.ide = ide;
        this.results = [];
    }

    async run() {
        this.results = [];
        await this.test("Editor available", () => Boolean(this.ide.editor?.getValue));
        await this.test("Target board selected", () => Boolean(this.ide.selectedBoard));
        await this.test("Virtual compiler available", () => Boolean(this.ide.compiler?.compile));
        await this.test("Virtual board available", () => Boolean(this.ide.virtualBoard));
        await this.test("Generic compile", () => {
            const original = this.ide.editor.getValue();
            const sample = "void setup() { Serial.begin(115200); }\nvoid loop() { delay(1); }";
            this.ide.editor.setValue(sample);
            const result = this.ide.compiler.compile(sample);
            this.ide.editor.setValue(original);
            return result.ok === true;
        });
        await this.test("Project snapshot", () => {
            const project = this.ide.projectManager.snapshot({ name: "self-test" });
            return project.format === "universal-hardware-ide-project" && project.files.length > 0;
        });

        const passed = this.results.filter(result => result.ok).length;
        const failed = this.results.length - passed;
        this.ide.terminal.info(`SELF TEST ${passed}/${this.results.length} passed`);
        if (failed === 0) this.ide.terminal.success("SELF TEST PASS — core systems healthy");
        else this.ide.terminal.warning(`SELF TEST completed with ${failed} failure(s)`);
        return { passed, failed, results: this.results };
    }

    async test(name, fn) {
        try {
            const value = await fn();
            this.results.push({ name, ok: Boolean(value) });
            this.ide.terminal[value ? "success" : "error"](`TEST ${value ? "PASS" : "FAIL"} — ${name}`);
        } catch (error) {
            this.results.push({ name, ok: false, error: error.message });
            this.ide.terminal.error(`TEST FAIL — ${name}: ${error.message}`);
        }
    }
}
