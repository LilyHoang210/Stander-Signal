import { describe, expect, it, vi } from "vitest";
import { createTelegramBot, registerTelegramCommandMenu, telegramCommandMenu } from "./bot.js";
const botInfo = {
    id: 777000,
    is_bot: true,
    first_name: "StandX Guard",
    username: "standx_guard_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: true,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false
};
function createHarness(commands) {
    const replies = [];
    const fetch = (_input, init) => {
        if (typeof init?.body !== "string") {
            return Promise.reject(new Error("Expected Telegram JSON request body"));
        }
        const body = JSON.parse(init.body);
        replies.push(body);
        return Promise.resolve(new Response(JSON.stringify({
            ok: true,
            result: {
                message_id: replies.length,
                date: 1_786_685_200,
                chat: { id: body.chat_id, type: "private" },
                text: body.text
            }
        }), { headers: { "content-type": "application/json" } }));
    };
    const bot = createTelegramBot({
        token: "777000:valid-looking-bot-token",
        miniAppUrl: "https://app.example.com",
        fetch,
        botInfo,
        ...(commands === undefined ? {} : { commands })
    });
    return { bot, replies };
}
describe("Telegram bot shell", () => {
    it("exposes only /menu as the visible Telegram command menu", () => {
        expect(telegramCommandMenu).toEqual([
            { command: "menu", description: "Open menu" }
        ]);
    });
    it("registers the one-command Telegram menu without sending chat messages", async () => {
        const requests = [];
        const fetch = (_input, init) => {
            if (typeof init?.body !== "string") {
                return Promise.reject(new Error("Expected Telegram JSON request body"));
            }
            requests.push(JSON.parse(init.body));
            return Promise.resolve(new Response(JSON.stringify({ ok: true, result: true }), {
                headers: { "content-type": "application/json" }
            }));
        };
        const bot = createTelegramBot({
            token: "777000:valid-looking-bot-token",
            miniAppUrl: "https://app.example.com",
            fetch,
            botInfo
        });
        await registerTelegramCommandMenu(bot);
        expect(requests).toEqual([
            { commands: [{ command: "menu", description: "Open menu" }] }
        ]);
    });
    it("renders the English dashboard with the Mini App button in a private chat", async () => {
        const harness = createHarness();
        await harness.bot.handleUpdate({
            update_id: 1,
            message: {
                message_id: 1,
                date: 1_786_685_200,
                chat: { id: 42, type: "private", first_name: "An" },
                from: { id: 42, is_bot: false, first_name: "An" },
                text: "/start",
                entities: [{ offset: 0, length: 6, type: "bot_command" }]
            }
        });
        expect(harness.replies[0]?.text).toContain("StandX Risk Monitor");
        expect(harness.replies[0]?.text).toContain("Status: Not connected");
        expect(harness.replies[0]?.reply_markup?.inline_keyboard[0]?.[0]).toMatchObject({
            text: "Open Mini App",
            web_app: { url: "https://app.example.com" }
        });
        expect(harness.replies[0]?.reply_markup?.inline_keyboard).toEqual([
            [{ text: "Open Mini App", web_app: { url: "https://app.example.com" } }]
        ]);
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).not.toContain("Status");
        expect(JSON.stringify(harness.replies)).not.toMatch(/private key|secret key|request sign key/i);
    });
    it("renders the same dashboard from /menu", async () => {
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false)
        });
        await harness.bot.handleUpdate({
            update_id: 30,
            message: {
                message_id: 30,
                date: 1_786_685_200,
                chat: { id: 42, type: "private", first_name: "An" },
                from: { id: 42, is_bot: false, first_name: "An" },
                text: "/menu",
                entities: [{ offset: 0, length: 5, type: "bot_command" }]
            }
        });
        expect(harness.replies[0]?.text).toContain("StandX Risk Monitor");
        expect(harness.replies[0]?.text).toContain("Status: Monitoring");
        expect(harness.replies[0]?.text).toContain("Account: standx-main");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).toContain("Risk");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).not.toContain("Set alert thresholds");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).not.toContain("menu:thresholds");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).toContain("Orders");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).toContain("History");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).toContain("Funding");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).toContain("Markets");
        expect(JSON.stringify(harness.replies[0]?.reply_markup)).toContain("Coverage");
    });
    it("directs group users to open a private chat without exposing a Mini App button", async () => {
        const harness = createHarness();
        await harness.bot.handleUpdate({
            update_id: 2,
            message: {
                message_id: 2,
                date: 1_786_685_200,
                chat: { id: -1001, type: "group", title: "Trading" },
                from: { id: 42, is_bot: false, first_name: "An" },
                text: "/start",
                entities: [{ offset: 0, length: 6, type: "bot_command" }]
            }
        });
        expect(harness.replies[0]?.text).toMatch(/private chat/i);
        expect(harness.replies[0]?.reply_markup).toBeUndefined();
    });
    it("requires inline confirmation before disconnect", async () => {
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false)
        });
        await harness.bot.handleUpdate({
            update_id: 3,
            message: {
                message_id: 3,
                date: 1_786_685_200,
                chat: { id: 42, type: "private", first_name: "An" },
                from: { id: 42, is_bot: false, first_name: "An" },
                text: "/disconnect",
                entities: [{ offset: 0, length: 11, type: "bot_command" }]
            }
        });
        expect(harness.replies[0]?.text).toContain("Confirm disconnect");
        expect(harness.replies[0]?.reply_markup?.inline_keyboard[0]).toEqual([
            { text: "Disconnect", callback_data: "disconnect:confirm" },
            { text: "Cancel", callback_data: "disconnect:cancel" }
        ]);
    });
    it("disconnects only after the trusted inline confirmation callback", async () => {
        const disconnect = vi.fn(() => Promise.resolve(true));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "bsc_0x12...cdef" }),
            disconnect
        });
        await harness.bot.handleUpdate({
            update_id: 4,
            callback_query: {
                id: "callback-1",
                chat_instance: "chat-instance",
                from: { id: 42, is_bot: false, first_name: "An" },
                data: "disconnect:confirm",
                message: {
                    message_id: 4,
                    date: 1_786_685_200,
                    chat: { id: 42, type: "private", first_name: "An" },
                    text: "Confirm"
                }
            }
        });
        expect(disconnect).toHaveBeenCalledWith("42");
        expect(harness.replies.some(reply => reply.text?.includes("Disconnected") === true)).toBe(true);
    });
    it("serves private risk commands through the command port", async () => {
        const refresh = vi.fn(() => Promise.resolve("A new scan has been queued."));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false),
            positions: () => Promise.resolve("POSITIONS_REPORT"),
            risk: () => Promise.resolve("RISK_REPORT"),
            alerts: () => Promise.resolve("ALERTS_REPORT"),
            refresh
        });
        for (const [index, command] of ["/positions", "/risk", "/alerts", "/refresh"].entries()) {
            await harness.bot.handleUpdate({
                update_id: 10 + index,
                message: {
                    message_id: 10 + index,
                    date: 1_786_685_200,
                    chat: { id: 42, type: "private", first_name: "An" },
                    from: { id: 42, is_bot: false, first_name: "An" },
                    text: command,
                    entities: [{ offset: 0, length: command.length, type: "bot_command" }]
                }
            });
        }
        expect(harness.replies.map(reply => reply.text)).toEqual([
            "POSITIONS_REPORT",
            "RISK_REPORT",
            "ALERTS_REPORT",
            "A new scan has been queued."
        ]);
        expect(refresh).toHaveBeenCalledWith("42");
    });
    it("guides disconnected command users to the Mini App before account actions", async () => {
        const perps = vi.fn(() => Promise.resolve("PERPS_REPORT"));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: false }),
            disconnect: () => Promise.resolve(false),
            perps
        });
        await harness.bot.handleUpdate({
            update_id: 90,
            message: {
                message_id: 90,
                date: 1_786_685_200,
                chat: { id: 42, type: "private", first_name: "An" },
                from: { id: 42, is_bot: false, first_name: "An" },
                text: "/perps",
                entities: [{ offset: 0, length: 6, type: "bot_command" }]
            }
        });
        expect(perps).not.toHaveBeenCalled();
        expect(harness.replies[0]?.text).toBe("Connect your StandX account first. Tap Open Mini App to add a read-only API token.");
        expect(harness.replies[0]?.reply_markup?.inline_keyboard).toEqual([
            [{ text: "Open Mini App", web_app: { url: "https://app.example.com" } }]
        ]);
    });
    it("serves private on-demand informational commands through the command port", async () => {
        const commands = {
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false),
            orders: vi.fn(() => Promise.resolve("ORDERS_REPORT")),
            history: vi.fn(() => Promise.resolve("HISTORY_REPORT")),
            funding: vi.fn(() => Promise.resolve("FUNDING_REPORT")),
            markets: vi.fn(() => Promise.resolve("MARKETS_REPORT")),
            coverage: vi.fn(() => Promise.resolve("COVERAGE_REPORT"))
        };
        const harness = createHarness(commands);
        for (const [index, command] of ["/orders", "/history", "/funding", "/markets", "/coverage"].entries()) {
            await harness.bot.handleUpdate({
                update_id: 70 + index,
                message: {
                    message_id: 70 + index,
                    date: 1_786_685_200,
                    chat: { id: 42, type: "private", first_name: "An" },
                    from: { id: 42, is_bot: false, first_name: "An" },
                    text: command,
                    entities: [{ offset: 0, length: command.length, type: "bot_command" }]
                }
            });
        }
        expect(harness.replies.map(reply => reply.text)).toEqual([
            "ORDERS_REPORT",
            "HISTORY_REPORT",
            "FUNDING_REPORT",
            "MARKETS_REPORT",
            "COVERAGE_REPORT"
        ]);
    });
    it("routes dashboard callbacks through the existing command port", async () => {
        const risk = vi.fn(() => Promise.resolve("RISK_REPORT"));
        const refresh = vi.fn(() => Promise.resolve("A new scan has been queued."));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false),
            risk,
            refresh
        });
        for (const [index, data] of ["menu:risk", "menu:refresh"].entries()) {
            await harness.bot.handleUpdate({
                update_id: 40 + index,
                callback_query: {
                    id: `callback-menu-${String(index)}`,
                    chat_instance: "chat-instance",
                    from: { id: 42, is_bot: false, first_name: "An" },
                    data,
                    message: {
                        message_id: 40 + index,
                        date: 1_786_685_200,
                        chat: { id: 42, type: "private", first_name: "An" },
                        text: "Menu"
                    }
                }
            });
        }
        expect(risk).toHaveBeenCalledWith("42");
        expect(refresh).toHaveBeenCalledWith("42");
        expect(harness.replies.some(reply => reply.text === "RISK_REPORT")).toBe(true);
        expect(harness.replies.some(reply => reply.text === "A new scan has been queued.")).toBe(true);
    });
    it("guides disconnected stale callback users to the Mini App before account actions", async () => {
        const risk = vi.fn(() => Promise.resolve("RISK_REPORT"));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: false }),
            disconnect: () => Promise.resolve(false),
            risk
        });
        await harness.bot.handleUpdate({
            update_id: 91,
            callback_query: {
                id: "callback-stale-risk",
                chat_instance: "chat-instance",
                from: { id: 42, is_bot: false, first_name: "An" },
                data: "menu:risk",
                message: {
                    message_id: 91,
                    date: 1_786_685_200,
                    chat: { id: 42, type: "private", first_name: "An" },
                    text: "Old menu"
                }
            }
        });
        expect(risk).not.toHaveBeenCalled();
        const reply = harness.replies.find(item => item.text?.startsWith("Connect your StandX account first."));
        expect(reply?.text).toBe("Connect your StandX account first. Tap Open Mini App to add a read-only API token.");
        expect(reply?.reply_markup?.inline_keyboard).toEqual([
            [{ text: "Open Mini App", web_app: { url: "https://app.example.com" } }]
        ]);
    });
    it("routes on-demand dashboard callbacks through the command port", async () => {
        const orders = vi.fn(() => Promise.resolve("ORDERS_REPORT"));
        const history = vi.fn(() => Promise.resolve("HISTORY_REPORT"));
        const funding = vi.fn(() => Promise.resolve("FUNDING_REPORT"));
        const markets = vi.fn(() => Promise.resolve("MARKETS_REPORT"));
        const coverage = vi.fn(() => Promise.resolve("COVERAGE_REPORT"));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false),
            orders,
            history,
            funding,
            markets,
            coverage
        });
        for (const [index, data] of ["menu:orders", "menu:history", "menu:funding", "menu:markets", "menu:coverage"].entries()) {
            await harness.bot.handleUpdate({
                update_id: 80 + index,
                callback_query: {
                    id: `callback-on-demand-${String(index)}`,
                    chat_instance: "chat-instance",
                    from: { id: 42, is_bot: false, first_name: "An" },
                    data,
                    message: {
                        message_id: 80 + index,
                        date: 1_786_685_200,
                        chat: { id: 42, type: "private", first_name: "An" },
                        text: "Menu"
                    }
                }
            });
        }
        expect(orders).toHaveBeenCalledWith("42");
        expect(history).toHaveBeenCalledWith("42");
        expect(funding).toHaveBeenCalledWith("42");
        expect(markets).toHaveBeenCalledWith("42");
        expect(coverage).toHaveBeenCalledWith("42");
    });
    it("keeps disconnect confirmation behind the dashboard disconnect callback", async () => {
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true, accountLabel: "standx-main" }),
            disconnect: () => Promise.resolve(false)
        });
        await harness.bot.handleUpdate({
            update_id: 50,
            callback_query: {
                id: "callback-menu-disconnect",
                chat_instance: "chat-instance",
                from: { id: 42, is_bot: false, first_name: "An" },
                data: "menu:disconnect",
                message: {
                    message_id: 50,
                    date: 1_786_685_200,
                    chat: { id: 42, type: "private", first_name: "An" },
                    text: "Menu"
                }
            }
        });
        expect(harness.replies.some(reply => reply.reply_markup?.inline_keyboard[0]?.some(button => button.callback_data === "disconnect:confirm") === true)).toBe(true);
    });
    it("acknowledges alert callbacks through the command port", async () => {
        const acknowledgeAlert = vi.fn(() => Promise.resolve("Alert acknowledged."));
        const harness = createHarness({
            status: () => Promise.resolve({ connected: true }),
            disconnect: () => Promise.resolve(false),
            acknowledgeAlert
        });
        await harness.bot.handleUpdate({
            update_id: 20,
            callback_query: {
                id: "callback-alert-1",
                chat_instance: "chat-instance",
                from: { id: 42, is_bot: false, first_name: "An" },
                data: "alert:ack:user-1:account-1:position-1:liquidation:threshold-v1:critical",
                message: {
                    message_id: 20,
                    date: 1_786_685_200,
                    chat: { id: 42, type: "private", first_name: "An" },
                    text: "Alert"
                }
            }
        });
        expect(acknowledgeAlert).toHaveBeenCalledWith("42", "alert:ack:user-1:account-1:position-1:liquidation:threshold-v1:critical");
        expect(harness.replies.some(reply => reply.text === "Alert acknowledged.")).toBe(true);
    });
});
//# sourceMappingURL=bot.test.js.map