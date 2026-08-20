import { InMemoryMarketSnapshotStore } from "@standx/market/market-snapshot-store";
import { StandXMarketStream } from "@standx/market/standx-market-stream";
const symbols = (process.env.STANDX_MARKET_SYMBOLS ?? "BTC-USD")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);
if (symbols.length === 0) {
    throw new Error("STANDX_MARKET_SYMBOLS must contain at least one symbol");
}
const store = new InMemoryMarketSnapshotStore();
const stream = new StandXMarketStream({
    symbols,
    store,
    onError: (error) => {
        console.error(JSON.stringify({
            level: "error",
            component: "standx-market-stream",
            message: error.message
        }));
    }
});
await stream.start();
console.log(JSON.stringify({
    level: "info",
    component: "standx-market-worker",
    message: "started",
    symbols
}));
const shutdown = async () => {
    await stream.stop();
    process.exit(0);
};
process.once("SIGINT", () => {
    void shutdown();
});
process.once("SIGTERM", () => {
    void shutdown();
});
//# sourceMappingURL=market-worker.js.map