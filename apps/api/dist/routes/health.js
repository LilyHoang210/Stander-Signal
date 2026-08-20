export function healthRoutes(app) {
    app.get("/health", () => ({ status: "ok" }));
    return Promise.resolve();
}
//# sourceMappingURL=health.js.map