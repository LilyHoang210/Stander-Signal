import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
describe("health route", () => {
    it("returns an explicit healthy payload", async () => {
        const app = await buildApp();
        const response = await app.inject({ method: "GET", url: "/health" });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: "ok" });
        await app.close();
    });
});
//# sourceMappingURL=app.test.js.map