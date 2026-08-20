import { Bot, InlineKeyboard } from "grammy";
export const telegramCommandMenu = [
    { command: "menu", description: "Open menu" }
];
export async function registerTelegramCommandMenu(bot, onError = () => undefined) {
    try {
        await bot.api.setMyCommands([...telegramCommandMenu]);
    }
    catch (error) {
        onError(error);
    }
}
const unavailableCommands = {
    status: () => Promise.resolve({ connected: false }),
    disconnect: () => Promise.resolve(false),
    perps: () => Promise.resolve("No Perps data is available yet."),
    positions: () => Promise.resolve("No open Perps positions are available."),
    risk: () => Promise.resolve("No risk assessment is available yet."),
    alerts: () => Promise.resolve("No active alerts are available."),
    orders: () => Promise.resolve("No order data is available yet."),
    history: () => Promise.resolve("No trade history is available yet."),
    funding: () => Promise.resolve("No funding history is available yet."),
    markets: () => Promise.resolve("No market data is available yet."),
    coverage: () => Promise.resolve("Coverage information is unavailable."),
    refresh: () => Promise.resolve("No active StandX account is connected."),
    acknowledgeAlert: () => Promise.resolve("No matching alert was found.")
};
const connectFirstMessage = "Connect your StandX account first. Tap Open Mini App to add a read-only API token.";
export function createTelegramBot(options) {
    assertHttpsMiniApp(options.miniAppUrl);
    const commands = options.commands ?? unavailableCommands;
    const bot = new Bot(options.token, {
        client: options.fetch === undefined ? {} : { fetch: options.fetch },
        ...(options.botInfo === undefined ? {} : { botInfo: options.botInfo })
    });
    bot.command("start", async (context) => {
        if (!isPrivate(context)) {
            await context.reply("Please open a private chat with the bot to connect your StandX account.");
            return;
        }
        await sendDashboard(context, commands, options.miniAppUrl);
    });
    bot.command("menu", async (context) => {
        if (!isPrivate(context)) {
            await context.reply("The dashboard is only available in a private chat.");
            return;
        }
        await sendDashboard(context, commands, options.miniAppUrl);
    });
    bot.command("status", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => buildStatusMessage(commands, telegramUserId));
    });
    bot.command("perps", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.perps?.(telegramUserId));
    });
    bot.command("positions", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.positions?.(telegramUserId));
    });
    bot.command("risk", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.risk?.(telegramUserId));
    });
    bot.command("alerts", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.alerts?.(telegramUserId));
    });
    bot.command("orders", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.orders?.(telegramUserId));
    });
    bot.command("history", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.history?.(telegramUserId));
    });
    bot.command("funding", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.funding?.(telegramUserId));
    });
    bot.command("markets", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.markets?.(telegramUserId));
    });
    bot.command("coverage", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.coverage?.(telegramUserId));
    });
    bot.command("refresh", async (context) => {
        await replyConnectedPrivateCommand(context, commands, options.miniAppUrl, telegramUserId => commands.refresh?.(telegramUserId));
    });
    bot.command("disconnect", async (context) => {
        if (!isPrivate(context)) {
            await context.reply("Disconnect is only available in a private chat.");
            return;
        }
        if (!(await isConnected(commands, String(context.from.id)))) {
            await replyConnectFirst(context, options.miniAppUrl);
            return;
        }
        await sendDisconnectConfirmation(context);
    });
    bot.command("help", async (context) => {
        await context.reply([
            "/start - Open the StandX dashboard",
            "/menu - Show the dashboard buttons",
            "/status - Show monitoring status",
            "/perps - Show Perps account overview",
            "/positions - Show positions and risk",
            "/risk - Show current risk alerts",
            "/alerts - Show alert status",
            "/orders - Show recent orders",
            "/history - Show recent trades",
            "/funding - Show recent funding records",
            "/markets - Show market data for open positions",
            "/coverage - Show supported and unsupported StandX areas",
            "/refresh - Request an account scan when cooldown allows",
            "/disconnect - Disconnect and remove saved access",
            "/help - Show this guide"
        ].join("\n"));
    });
    bot.callbackQuery("menu:home", async (context) => {
        await context.answerCallbackQuery();
        if (!isPrivate(context)) {
            await context.reply("The dashboard is only available in a private chat.");
            return;
        }
        await sendDashboard(context, commands, options.miniAppUrl);
    });
    bot.callbackQuery("menu:status", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => buildStatusMessage(commands, telegramUserId));
    });
    bot.callbackQuery("menu:positions", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.positions?.(telegramUserId));
    });
    bot.callbackQuery("menu:perps", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.perps?.(telegramUserId));
    });
    bot.callbackQuery("menu:risk", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.risk?.(telegramUserId));
    });
    bot.callbackQuery("menu:alerts", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.alerts?.(telegramUserId));
    });
    bot.callbackQuery("menu:orders", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.orders?.(telegramUserId));
    });
    bot.callbackQuery("menu:history", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.history?.(telegramUserId));
    });
    bot.callbackQuery("menu:funding", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.funding?.(telegramUserId));
    });
    bot.callbackQuery("menu:markets", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.markets?.(telegramUserId));
    });
    bot.callbackQuery("menu:coverage", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.coverage?.(telegramUserId));
    });
    bot.callbackQuery("menu:refresh", async (context) => {
        await context.answerCallbackQuery();
        await replyConnectedPrivateCallback(context, commands, options.miniAppUrl, telegramUserId => commands.refresh?.(telegramUserId));
    });
    bot.callbackQuery("menu:disconnect", async (context) => {
        await context.answerCallbackQuery();
        if (!isPrivate(context)) {
            await context.reply("Disconnect is only available in a private chat.");
            return;
        }
        if (!(await isConnected(commands, String(context.from.id)))) {
            await replyConnectFirst(context, options.miniAppUrl);
            return;
        }
        await sendDisconnectConfirmation(context);
    });
    bot.callbackQuery("disconnect:confirm", async (context) => {
        const disconnected = await commands.disconnect(String(context.from.id));
        await context.answerCallbackQuery();
        await context.reply(disconnected
            ? "Disconnected. Remaining account data is scheduled for deletion within 24 hours."
            : "No active connection was found.");
    });
    bot.callbackQuery("disconnect:cancel", async (context) => {
        await context.answerCallbackQuery({ text: "Cancelled" });
        await context.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    });
    bot.callbackQuery(/^alert:ack:/, async (context) => {
        const message = await commands.acknowledgeAlert?.(String(context.from.id), context.callbackQuery.data);
        await context.answerCallbackQuery();
        await context.reply(message ?? "No matching alert was found.");
    });
    bot.callbackQuery(/^alert:status:/, async (context) => {
        const status = await commands.alerts?.(String(context.from.id));
        await context.answerCallbackQuery();
        await context.reply(status ?? "No active alerts are available.");
    });
    return bot;
}
async function replyConnectedPrivateCommand(context, commands, miniAppUrl, run) {
    if (!isPrivate(context)) {
        await context.reply("This command is only available in a private chat.");
        return;
    }
    const telegramUserId = String(context.from.id);
    if (!(await isConnected(commands, telegramUserId))) {
        await replyConnectFirst(context, miniAppUrl);
        return;
    }
    await context.reply(await (run(telegramUserId) ?? Promise.resolve("This feature is not ready yet.")));
}
async function replyConnectedPrivateCallback(context, commands, miniAppUrl, run) {
    if (!isPrivate(context)) {
        await context.reply("This action is only available in a private chat.");
        return;
    }
    const telegramUserId = String(context.from.id);
    if (!(await isConnected(commands, telegramUserId))) {
        await replyConnectFirst(context, miniAppUrl);
        return;
    }
    await context.reply(await (run(telegramUserId) ?? Promise.resolve("This feature is not ready yet.")));
}
async function isConnected(commands, telegramUserId) {
    try {
        return (await commands.status(telegramUserId)).connected;
    }
    catch {
        return false;
    }
}
async function replyConnectFirst(context, miniAppUrl) {
    await context.reply(connectFirstMessage, {
        reply_markup: new InlineKeyboard().webApp("Open Mini App", miniAppUrl)
    });
}
async function sendDashboard(context, commands, miniAppUrl) {
    const status = await commands.status(String(context.from.id));
    const lines = status.connected
        ? [
            "StandX Risk Monitor",
            "",
            "Status: Monitoring",
            `Account: ${status.accountLabel ?? "StandX account"}`,
            "",
            "Use the buttons below to review risk, refresh data, or manage the connection."
        ]
        : [
            "StandX Risk Monitor",
            "",
            "Status: Not connected",
            "",
            "Connect a read-only StandX API token to start monitoring. The bot cannot trade or withdraw assets."
        ];
    await context.reply(lines.join("\n"), {
        reply_markup: buildDashboardKeyboard(status.connected, miniAppUrl)
    });
}
function buildDashboardKeyboard(connected, miniAppUrl) {
    const keyboard = new InlineKeyboard().webApp("Open Mini App", miniAppUrl);
    if (!connected) {
        return keyboard;
    }
    return keyboard
        .text("Status", "menu:status")
        .row()
        .text("Positions", "menu:positions")
        .text("Perps", "menu:perps")
        .row()
        .text("Risk", "menu:risk")
        .text("Alerts", "menu:alerts")
        .row()
        .text("Orders", "menu:orders")
        .text("History", "menu:history")
        .row()
        .text("Funding", "menu:funding")
        .text("Markets", "menu:markets")
        .row()
        .text("Coverage", "menu:coverage")
        .row()
        .text("Refresh data", "menu:refresh")
        .row()
        .text("Disconnect", "menu:disconnect");
}
async function buildStatusMessage(commands, telegramUserId) {
    const status = await commands.status(telegramUserId);
    return status.connected
        ? `Monitoring ${status.accountLabel ?? "StandX account"}.`
        : "No active StandX account is connected.";
}
async function sendDisconnectConfirmation(context) {
    const keyboard = new InlineKeyboard()
        .text("Disconnect", "disconnect:confirm")
        .text("Cancel", "disconnect:cancel");
    await context.reply("Confirm disconnect. Saved access will be removed immediately.", { reply_markup: keyboard });
}
function isPrivate(context) {
    return context.chat?.type === "private" && context.from !== undefined;
}
function assertHttpsMiniApp(value) {
    const url = new URL(value);
    if (url.protocol !== "https:") {
        throw new Error("Telegram Mini App URL must use HTTPS");
    }
}
//# sourceMappingURL=bot.js.map