# Testmail Viewer

A clean, fast inbox UI for [testmail.app](https://testmail.app) — built with React + Vite.

## Features
- Gmail-style two-pane layout: message list on the left, reader on the right
- Search by subject/sender/tag, plus a tag filter dropdown
- Auto-refresh every 15s (toggleable), with manual refresh
- HTML / Plain text / Raw JSON view for each message (HTML renders in a sandboxed iframe)
- Attachment list, dark/light theme toggle, responsive mobile layout
- Your API key & namespace are stored only in `localStorage` — never sent anywhere but testmail.app

## Setup

```bash
npm install
npm run dev
```

The app runs at **http://localhost:6868**.

On first load you'll be asked for your testmail.app **API key** and **namespace** (find both in your [testmail.app console](https://testmail.app/console)). These are saved locally so you won't need to re-enter them.

## Why the proxy?

`vite.config.js` proxies `/tm-api/*` to `https://api.testmail.app/api/*` so the browser never has to call testmail.app directly — this avoids any CORS issues and keeps things working identically for both `npm run dev` and `npm run build && npm run preview`.

## Production build

```bash
npm run build
npm run preview   # serves the built app, also on port 6868
```

## Sending yourself a test email

Send mail to `{namespace}.{anything}@inbox.testmail.app` — e.g. `acmeinc.signup-test@inbox.testmail.app`. It'll show up in the inbox within a few seconds. Use the tag filter/search to isolate a specific tag.
