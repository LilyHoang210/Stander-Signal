export class ConnectionApplicationError extends Error {
    code;
    constructor(code, options) {
        super(code, options);
        this.code = code;
        this.name = "ConnectionApplicationError";
    }
}
//# sourceMappingURL=context.js.map