import { z } from "zod";
export const decimalStringSchema = z
    .string()
    .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, "Expected a decimal string");
const timestampSchema = z.iso.datetime({ offset: true });
export const balanceSchema = z.object({
    isolated_balance: decimalStringSchema,
    isolated_upnl: decimalStringSchema,
    cross_balance: decimalStringSchema,
    cross_margin: decimalStringSchema,
    cross_upnl: decimalStringSchema,
    locked: decimalStringSchema,
    cross_available: decimalStringSchema,
    balance: decimalStringSchema,
    upnl: decimalStringSchema,
    equity: decimalStringSchema,
    pnl_freeze: decimalStringSchema
});
export const positionSchema = z.object({
    bankruptcy_price: decimalStringSchema.optional(),
    created_at: timestampSchema,
    entry_price: decimalStringSchema,
    entry_value: decimalStringSchema,
    holding_margin: decimalStringSchema,
    id: z.number().int().nonnegative(),
    initial_margin: decimalStringSchema,
    leverage: decimalStringSchema,
    liq_price: decimalStringSchema.nullable(),
    maint_margin: decimalStringSchema,
    margin_asset: z.string().min(1),
    margin_mode: z.enum(["cross", "isolated"]),
    mark_price: decimalStringSchema,
    mmr: decimalStringSchema.nullable(),
    position_value: decimalStringSchema,
    qty: decimalStringSchema,
    realized_pnl: decimalStringSchema,
    status: z.string().min(1),
    symbol: z.string().min(1),
    time: timestampSchema,
    updated_at: timestampSchema,
    upnl: decimalStringSchema,
    user: z.string().min(1)
});
export const positionsSchema = z.array(positionSchema);
export const openOrderSchema = z.object({
    avail_locked: decimalStringSchema.optional(),
    cl_ord_id: z.string().min(1),
    closed_block: z.number().int(),
    created_at: timestampSchema,
    created_block: z.number().int(),
    fill_avg_price: decimalStringSchema,
    fill_qty: decimalStringSchema,
    id: z.number().int().nonnegative(),
    leverage: decimalStringSchema,
    liq_id: z.number().int().nonnegative(),
    margin: decimalStringSchema.optional(),
    order_type: z.string().min(1),
    position_id: z.number().int().nonnegative(),
    price: decimalStringSchema,
    qty: decimalStringSchema,
    reduce_only: z.boolean(),
    remark: z.string(),
    side: z.enum(["buy", "sell"]),
    source: z.string().min(1),
    status: z.string().min(1),
    symbol: z.string().min(1),
    time_in_force: z.string().min(1),
    updated_at: timestampSchema,
    user: z.string().min(1)
});
export const openOrdersSchema = z
    .object({
    page_size: z.number().int().nonnegative(),
    result: z.array(openOrderSchema),
    total: z.number().int().nonnegative().optional()
})
    .transform(value => ({
    ...value,
    total: value.total ?? value.result.length
}));
export const orderSchema = openOrderSchema;
export const ordersSchema = openOrdersSchema;
export const tradeSchema = z.object({
    created_at: timestampSchema,
    fee_asset: z.string().min(1),
    fee_qty: decimalStringSchema,
    id: z.number().int().nonnegative(),
    order_id: z.number().int().nonnegative(),
    pnl: decimalStringSchema,
    price: decimalStringSchema,
    qty: decimalStringSchema,
    side: z.enum(["buy", "sell"]),
    symbol: z.string().min(1),
    updated_at: timestampSchema,
    user: z.string().min(1),
    value: decimalStringSchema
});
export const tradesSchema = z
    .object({
    page_size: z.number().int().nonnegative(),
    result: z.array(tradeSchema),
    total: z.number().int().nonnegative().optional()
})
    .transform(value => ({
    ...value,
    total: value.total ?? value.result.length
}));
export const fundingRecordSchema = z.object({
    id: z.number().int().nonnegative(),
    user: z.string().min(1),
    asset: z.string().min(1),
    symbol: z.string().min(1),
    qty: decimalStringSchema,
    txn_type: z.string().min(1),
    transact_time: timestampSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema
});
export const fundingHistorySchema = z.array(fundingRecordSchema);
const nullableDecimalStringSchema = decimalStringSchema.nullable();
export const marketOverviewSymbolSchema = z.object({
    base: z.string().min(1),
    quote: z.string().min(1),
    symbol: z.string().min(1),
    last_price: nullableDecimalStringSchema,
    mark_price: decimalStringSchema,
    funding_rate: decimalStringSchema,
    open_interest: decimalStringSchema,
    open_interest_notional: decimalStringSchema,
    price_change_pct: z.number(),
    volume_24h: decimalStringSchema,
    volume_quote_24h: decimalStringSchema,
    time: timestampSchema
});
export const marketOverviewSchema = z.object({
    summary: z.object({
        open_interest_notional: decimalStringSchema,
        symbol_count: z.number().int().nonnegative(),
        volume_quote_24h: decimalStringSchema
    }),
    symbols: z.array(marketOverviewSymbolSchema)
});
export const symbolMarketSchema = z.object({
    base: z.string().min(1),
    quote: z.string().min(1),
    symbol: z.string().min(1),
    funding_rate: decimalStringSchema,
    high_price_24h: decimalStringSchema,
    index_price: decimalStringSchema,
    last_price: nullableDecimalStringSchema,
    low_price_24h: decimalStringSchema,
    mark_price: decimalStringSchema,
    mid_price: nullableDecimalStringSchema,
    next_funding_time: timestampSchema,
    open_interest: decimalStringSchema,
    spread: z.tuple([nullableDecimalStringSchema, nullableDecimalStringSchema]),
    time: timestampSchema,
    volume_24h: decimalStringSchema
});
//# sourceMappingURL=schemas.js.map