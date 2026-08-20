# Stander Signal

Stander Signal is a Telegram-based account and trade monitor for StandX users. It connects through a StandX read-only API token and delivers timely notifications without requesting trading permissions or wallet control.

## Product scope

Stander Signal is designed for visibility, not execution. It helps an active trader understand what is happening in a connected StandX account from Telegram and the Telegram Mini App.

The monitor covers:

- Position-open events
- Position-close events, including take-profit, stop-loss, and manual closes when the available account data identifies the reason
- Risk warnings for positions that are approaching stop loss, liquidation, or material margin stress
- Token and market danger signals supported by the available StandX data
- On-demand account and portfolio views

## Update model

To keep alerts focused and the service efficient, Stander Signal uses two update modes.

### Real-time monitoring

The background watcher continuously tracks:

- Newly opened positions
- Closed positions
- Risk state for currently open positions

These events can generate Telegram notifications without requiring the user to press a button.

### On-demand monitoring

The user requests secondary account information from the Telegram menu or Mini App. This includes position lists, account snapshots, and other supported StandX sections such as vault-related data. These views are refreshed when requested instead of being pushed continuously.

## Security model

The connection flow is intentionally read-only:

- Users create a StandX API token with **Read Only** permissions.
- No trading or withdrawal permission is needed.
- The system does not request a private key or seed phrase.
- The Telegram bot and Mini App never execute trades.
- `.env` files and other runtime secrets are excluded from Git and must remain on the deployment host.

Users should revoke a token from StandX immediately if it was shared accidentally or is no longer needed.

## User flow

1. Open the Telegram bot.
2. Tap **Open Mini App**.
3. On StandX, open the wallet address menu and select **Sessions**.
4. Select **Generate API Token**, open **Advanced**, choose **Read Only**, select an expiry period, and generate the token.
5. Paste the token into the Mini App and confirm the connection.
6. Use the Telegram menu for real-time notifications and on-demand account views.

When a user has not connected an API token, protected menu actions ask them to open the Mini App first. The bot does not attempt to infer or collect credentials through chat messages.

## Telegram notifications

Notifications are intentionally concise and actionable. A position-open message shows the asset, direction, leverage, collateral, entry price, size, and UTC timestamp. A position-close message shows the closure reason where available, entry and exit prices, PnL, fees, size, and holding time.

Risk messages identify the asset, direction, mark price, stop-loss or liquidation reference, distance to the threshold, severity, and a plain-language action. Example:

```text
🚨 Stop Loss Risk — Critical

Asset: BTC
Direction: SHORT 📉
Mark Price: $69,480
Stop Loss: $69,512.79
Distance to SL: 0.05%
Severity: Critical

Action: Position is extremely close to Stop Loss.
🕐 Aug 20 · 2026, 04:59 UTC
```

## Repository layout

The repository is organized as a small service-oriented workspace:

```text
apps/
  api/       HTTP API and Telegram webhook runtime
  worker/    background account watcher and alert processing
  mini-app/  Telegram Mini App build
packages/
  standx/    StandX API client and account stream integration
  risk/      risk evaluation and threshold logic
  alerts/    alert orchestration and state handling
  telegram/  Telegram message and bot interaction logic
  portfolio/ account and position normalization
  db/        persistence and repositories
  security/  credential protection and encryption helpers
  market/    market snapshots and streams
  domain/    shared domain models
  config/    runtime configuration
  scanner/   on-demand scanning workflows
docs/
  stander-signal-notion.md  product documentation and NotionAI prompt
```

The committed runtime artifacts are under the corresponding `dist/` directories. Deployment-specific secrets and configuration are supplied through the host environment.

## Deployment notes

Stander Signal can run on a VPS with the API, worker, and Mini App served from the same project. A production deployment should provide:

- HTTPS for the public API and Telegram webhook endpoint
- A process supervisor for the API and worker
- Persistent storage for connection state, alert history, and risk assessments
- Restricted firewall access and regular backups
- Environment variables for Telegram, StandX, database, and encryption configuration

Never commit `.env`, API tokens, Telegram bot tokens, private keys, database credentials, or encryption keys. Use a secret manager or protected environment files on the VPS.

## Limitations and transparency

Only data exposed through documented, supported StandX APIs is used. Account areas without a stable official API are shown as unavailable rather than being read through undocumented internal endpoints. Alert timing and fields depend on the freshness and completeness of StandX account and market data.

## Documentation

See [docs/stander-signal-notion.md](docs/stander-signal-notion.md) for the longer product/onboarding document intended for review by the StandX team.

## Status

Stander Signal is an active monitoring build focused on read-only account connectivity, real-time position lifecycle and risk alerts, and on-demand account visibility.
