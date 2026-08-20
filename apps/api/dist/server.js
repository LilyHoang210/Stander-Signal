import { loadConfig } from "@standx/config/index";
import { buildApp } from "./app.js";
import { createProductionContext } from "./production-context.js";
const config = loadConfig(process.env);
const production = createProductionContext(config);
await production.telegramBot.init();
const app = await buildApp({
    context: production.context,
    allowedOrigin: config.miniAppOrigin,
    telegramWebhook: {
        secret: config.telegramWebhookSecret,
        handleUpdate: update => production.telegramBot.handleUpdate(update)
    }
});
app.addHook("onClose", () => production.close());
await app.listen({
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 3000)
});
//# sourceMappingURL=server.js.map