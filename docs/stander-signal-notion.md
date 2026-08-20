# Stander Signal

Stander Signal is a Telegram-based account monitoring assistant for StandX users.

It helps traders stay informed about their account activity without exposing trading keys or granting execution rights. Users connect with a read-only StandX API token, then receive timely alerts and on-demand account summaries through Telegram and the Mini App.

## What it does

Stander Signal focuses on account awareness, risk visibility, and trade lifecycle alerts.

It monitors:

- Open and close events for positions
- Stop loss and liquidation proximity risk
- Token-level danger signals
- Live account state and position summaries
- On-demand scans for account areas that are not pushed in real time

## Core value

The product is built for traders who want fast visibility without manual checking.

Instead of opening StandX repeatedly, users can:

- Get notified when a position opens or closes
- See when an active position is approaching a risky state
- Review current positions and account status from Telegram
- Check additional account sections from the Mini App when needed

## Safety model

Stander Signal is designed around read-only access.

That means:

- No trading permissions are required
- No wallet control is requested
- No execution authority is granted
- The bot only reads account data to generate alerts and summaries

This makes onboarding easier while keeping the security surface small.

## How it works

1. The user opens the Mini App from Telegram.
2. The user follows the instructions to create a StandX read-only API token.
3. The token is saved securely for account monitoring.
4. The backend starts monitoring the connected account.
5. Telegram alerts are sent when important account events occur.
6. The user can open the Mini App or use bot buttons to view additional data on demand.

## Real-time vs on-demand behavior

Not every dataset needs to be pushed continuously.

Stander Signal uses two update modes:

### Real-time

These must stay live:

- Position opened
- Position closed
- Risk alerts for currently active positions

### On-demand

These are refreshed only when the user asks for them:

- Positions overview
- Portfolio/account snapshots
- Vault-related data
- Other secondary account sections

This keeps the bot responsive while avoiding unnecessary polling.

## Alert types

### 1. Position opened

Sent when a new position is detected.

Includes:

- Asset
- Direction
- Leverage
- Entry price
- Size
- Timestamp

### 2. Position closed

Sent when an active position is no longer open.

Can be closed by:

- Take profit
- Stop loss
- Manual close

Includes:

- Asset
- Direction
- Entry price
- Exit price
- PnL
- Fee
- Holding time
- Closure reason

### 3. Risk alert

Sent when an active position is getting close to a dangerous state.

Examples:

- Stop loss proximity
- Liquidation proximity
- Margin stress
- Critical token behavior

The purpose is not to predict everything perfectly. The goal is to surface high-signal warnings early enough for the user to act.

## Mini App experience

The Mini App exists to make setup and monitoring easier.

It should:

- Explain how to create a read-only StandX token
- Show connection status clearly
- Make the main actions obvious
- Present current account information in a clean layout
- Keep the language simple and direct

## Recommended user flow

1. Open Telegram bot
2. Tap Open Mini App
3. Read the read-only token instructions
4. Generate a StandX read-only API token
5. Paste the token into the Mini App
6. Confirm connection
7. Return to Telegram to use the menu buttons

## What Stander Signal is not

It is not:

- A trading bot
- A signal-copying bot
- A portfolio manager that moves funds
- A wallet connector that can execute actions

Its scope is monitoring, visibility, and alerts.

## Product promise

Stander Signal gives StandX users a safer way to stay aware of account activity.

It reduces the need for manual checking, helps traders react faster, and keeps the system centered on read-only access.

## Suggested positioning

Short version:

> Stander Signal is a Telegram account monitor for StandX users, built for secure read-only setup, real-time trade alerts, and on-demand account visibility.

---

## NotionAI prompt

Use the content above to create a polished Notion page.

Requirements:

- Keep all factual content unchanged
- Do not invent extra features
- Reformat the page for clarity and professional presentation
- Use a strong title, clear section hierarchy, and clean spacing
- Turn dense paragraphs into readable bullets where appropriate
- Highlight the read-only safety model prominently
- Make the real-time vs on-demand behavior easy to scan
- Keep the tone professional, concise, and product-focused
- Do not write marketing fluff

Output style:

- Clean product documentation
- Suitable for internal review by the StandX team
- Easy to skim
- Structured with headings, callouts, and bullet lists

