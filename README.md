# Alex Trader AI — IQ Option signal prototype (v0.2)

## What this build does
- Accepts a user-uploaded PNG/JPG/WEBP BTC/USD chart screenshot.
- Sends the screenshot to a vision-capable OpenAI model from the server.
- Returns a structured `HIGHER`, `LOWER`, or `WAIT` assessment.
- Suggests a 1–5 minute expiry and explains visible evidence and uncertainty.
- Has no broker login, no IQ Option connection, no order endpoint, and no trading execution.

## Important limitations
This is screenshot analysis, not a live scanner. It cannot continuously watch BTC or send push/Telegram alerts while closed. The screenshot can be stale, and the model's confidence score is a heuristic estimate, not a calibrated probability or verified win rate. IQ Option's instrument naming, quote and expiry availability must be checked in the user's own app.

## Run locally
Requires Node.js 20+.

```bash
npm install
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
npm start
```
Open http://localhost:3000

## Deploy
Deploy the Node app to a host that supports Node.js server processes and environment secrets. Set `OPENAI_API_KEY` in the host's secret/environment settings. Do not put the key in browser JavaScript or commit `.env`.

## GitHub
Upload the contents of this folder to the user's `alex-trader` repository on the `main` branch. The GitHub connection must be authorized before changes can be pushed.

## Safety
`SIGNALS_ONLY` is returned by the API. No real-money or automatic execution is implemented. Keep manual confirmation and test in demo mode.
