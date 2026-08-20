const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
];
export function formatTelegramUtcTimestamp(timestamp) {
    const month = months[timestamp.getUTCMonth()] ?? "Jan";
    const day = timestamp.getUTCDate();
    const year = timestamp.getUTCFullYear();
    const hour = String(timestamp.getUTCHours()).padStart(2, "0");
    const minute = String(timestamp.getUTCMinutes()).padStart(2, "0");
    return `🕘 ${month} ${String(day)} · ${String(year)}, ${hour}:${minute} UTC`;
}
//# sourceMappingURL=time-format.js.map