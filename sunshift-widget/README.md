# SunShift Embeddable Chat Widget

This folder gives you a reusable starting point for the offer you want to sell:

- `widget.js`: the embeddable chat widget you can paste into a client site or inject with Google Tag Manager
- `demo-life-enhancing-dentistry.html`: a polished demo page for Life Enhancing Dentistry
- `server.js`: a small Node server that keeps your OpenAI API key off the client
- `server.test.js`: basic backend tests for origin checks and request handling
- `.env.example`: environment variables for local and production setup

## Why this structure

Your original version put `OPENAI_API_KEY` in browser code. That means any visitor could open DevTools, copy your key, and spend your money. The safe pattern is:

1. Website loads `widget.js`
2. Widget sends messages to your server
3. Your server calls OpenAI with the secret key
4. The reply comes back to the widget

## Security posture

The API key is protected as long as you keep this architecture:

- The key exists only in backend environment variables
- The widget never contains the key
- The backend maps `siteId` to the system prompt and business data
- The backend keeps conversation context server-side instead of trusting a browser-supplied transcript
- Allowed origins are enforced in production
- The backend rate-limits requests and sets conservative body and message size limits

Important: origin checks and CORS reduce casual abuse, but they do not stop a determined attacker from sending direct HTTP requests. For a public widget, the key still stays secret, but endpoint abuse prevention is a separate problem. Your existing rate limiting helps; stronger bot mitigation would be something like Cloudflare, Turnstile, or a WAF in front of the endpoint.

## Run it locally

From this folder:

```bash
cp .env.example .env
npm run start:local
```

Then edit `.env` and replace `sk-your-openai-key` with your real key before starting the server.

Then open [demo-life-enhancing-dentistry.html](/Users/alexinsony/Documents/New%20project/sunshift-widget/demo-life-enhancing-dentistry.html) in a browser.

The demo uses:

- API endpoint: `http://localhost:3000/api/chat`
- Site ID: `life-enhancing-dentistry`

## One-line embed pattern

On a real client site, you can use:

```html
<script>
window.SunShiftChatConfig = {
  siteId: "life-enhancing-dentistry",
  apiEndpoint: "https://your-domain.com/api/chat",
  practiceName: "Life Enhancing Dentistry",
  assistantLabel: "24/7 Patient Assistant",
  phone: "(407) 205-9544"
};
</script>
<script async src="https://your-domain.com/widget.js"></script>
```

For Google Tag Manager, this same snippet can go inside a Custom HTML tag.

## How to add more clients

Edit `SITE_CONFIGS` inside [server.js](/Users/alexinsony/Documents/New%20project/sunshift-widget/server.js). Each business gets:

- a `siteId`
- a business-specific system prompt
- phone, email, address, and any guardrails you want

That is the right MVP for a small agency. You keep one widget file and one API, then swap behavior per client with `siteId`.

## Launch checklist

- Set `NODE_ENV=production`
- Set `ALLOWED_ORIGINS` to the exact production domains you control
- Store `OPENAI_API_KEY` only in deployment secrets, never in GTM or frontend code
- Serve the widget and API over HTTPS only
- Keep spend alerts and usage monitoring enabled in OpenAI
- Rotate the key immediately if it ever appears in browser code, logs, or screenshots
- Review whether you want chat messages persisted in the browser; the widget now defaults to not storing them

## Tests

Run:

```bash
npm test
```

## Recommended next move

After this works locally:

1. Host `widget.js` on your domain
2. Deploy `server.js` somewhere simple like Railway, Render, or a small VPS
3. Add lead capture storage so callback requests go to email or Make.com
4. Replace the static dental demo with a live Carrd or Framer page
