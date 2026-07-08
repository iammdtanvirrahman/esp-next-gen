/**
 * ==========================================================
 * Atomic IDE
 * C++ / Arduino Parser
 * Version 1.0
 * ==========================================================
 */

export class Parser {

    constructor() {

        this.tokens = [];

        this.current = 0;

        this.ast = {

            type: "Program",

            body: []

        };

    }

    /**
     * Parse
     */

    parse(tokens) {

        this.tokens = tokens;

        this.current = 0;

        this.ast.body = [];

        while (!this.isAtEnd()) {

            const node = this.statement();

            if (node) {

                this.ast.body.push(node);

            }

        }

        return this.ast;

    }

    /**
     * Statement
     */

    statement() {

        const token = this.peek();

        if (!token) return null;

        if (

            token.type === "keyword"

        ) {

            switch (token.value) {

                case "#include":

                    return this.includeStatement();

                case "void":

                    return this.functionDeclaration();

                case "int":

                case "float":

                case "double":

                case "bool":

                case "char":

                case "String":

                    return this.variableDeclaration();

            }

        }

        return this.expressionStatement();

    }

    /**
     * Include
     */

    includeStatement() {

        const keyword = this.advance();

        const header = this.advance();

        return {

            type: "Include",

            keyword: keyword.value,

            header: header?.value || ""

        };

    }

    /**
     * Variable
     */

    variableDeclaration() {

        const datatype = this.advance();

        const identifier = this.advance();

        return {

            type: "VariableDeclaration",

            dataType: datatype.value,

            name: identifier?.value || ""

        };

    }

    /**
     * Function
     */

    functionDeclaration() {

        const keyword = this.advance();

        const identifier = this.advance();

        return {

            type: "FunctionDeclaration",

            returnType: keyword.value,

            name: identifier?.value || "",

            body: []

        };

    }

    /**
     * Expression
     */

    expressionStatement() {

        const token = this.advance();

        return {

            type: "Expression",

            value: token.value

        };

    }

    /**
     * Helpers
     */

    advance() {

        if (!this.isAtEnd()) {

            this.current++;

        }

        return this.tokens[this.current - 1];

    }

    peek() {

        return this.tokens[this.current];

    }

    previous() {

        return this.tokens[this.current - 1];

    }

    isAtEnd() {

        return this.current >= this.tokens.length;

    }

    /**
     * Debug
     */

    printAST() {

        console.table(this.ast.body);

    }

}
