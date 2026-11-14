# Justin HQ

Your own app: text Jarvis, Shuri and Black Widow at once. Each agent runs on a different AI:

| Agent | Default AI | Change it in |
|---|---|---|
| Jarvis | Claude | Settings in the app |
| Shuri | Muse (Meta) | Settings in the app |
| Black Widow | ChatGPT | Settings in the app |

Pick **All agents** and one message goes to all three at the same time. Each answers from its own AI, and you can attach up to 4 photos.

Two pieces:

- `web/` is the app. It's plain files you host on GitHub Pages for free.
- `worker/` is a small server on Cloudflare (free tier) that holds your API keys. The app talks to the server; the server talks to Claude, ChatGPT and Muse. Your keys never touch your phone.

Replies show up in this app only. They do not appear in your ChatGPT, Claude or Muse chat history, because none of those companies lets outside apps write into it.

---

## Step 1: Get your three API keys

1. **Claude:** go to console.anthropic.com, open **API Keys**, then **Create Key**. Add a few dollars of credit under **Billing**.
2. **ChatGPT:** go to platform.openai.com, open **API keys**, then **Create new secret key**. Add credit under **Billing**. (This is separate from a ChatGPT Plus subscription.)
3. **Muse:** go to dev.meta.ai and create an API key.

Copy each key somewhere safe for the next step. Never paste them into the app or into a chat.

## Step 2: Put the server online (Cloudflare)

You need a computer for this step, once. Install Node.js from nodejs.org first.

```bash
cd justin-hq/worker
npm install
npx wrangler login                          # opens a browser, make a free Cloudflare account
npx wrangler secret put APP_PASSWORD        # make up a long password; the app will ask for it
npx wrangler secret put ANTHROPIC_API_KEY   # paste the Claude key
npx wrangler secret put OPENAI_API_KEY      # paste the ChatGPT key
npx wrangler secret put MUSE_API_KEY        # paste the Muse key
npx wrangler deploy
```

The last command prints your server address, something like `https://justin-hq.YOURNAME.workers.dev`. Save it.

If you host the app anywhere other than `https://jlthetrader.github.io`, change `ALLOWED_ORIGINS` in `worker/wrangler.toml` to that address and run `npx wrangler deploy` again.

## Step 3: Put the app online (GitHub Pages)

1. On github.com, create a new repository named `justin-hq`, set to **Public**.
2. Upload everything inside the `web/` folder (`index.html`, `bridge.js`, `manifest.webmanifest` and the icon files) to that repository.
3. Open **Settings**, then **Pages**. Under Source pick **Deploy from a branch**, then the branch `main` and the folder `/ (root)`, and save.
4. After a minute your app is live at `https://jlthetrader.github.io/justin-hq/`.

## Step 4: Connect and install on your iPhone

1. Open the app address in Safari.
2. Settings opens by itself the first time. Enter the server address from Step 2 and your APP_PASSWORD, then tap **Save**. You should see "Claude ready · ChatGPT ready · Muse ready".
3. Tap Safari's **Share** button, then **Add to Home Screen**. It now opens full screen, like a real app.

---

## Good to know

- **Cost:** you pay each AI company per message. Texting all three agents costs about three times a single message. Light daily use is typically a few dollars a month per provider. Set a spending limit in each provider's billing page.
- **Models:** set in `worker/wrangler.toml` (`CLAUDE_MODEL`, `OPENAI_MODEL`, `MUSE_MODEL`). If one agent says it doesn't recognize the model name, update that line and deploy again.
- **Your data:** chats, quotes and P&L are saved on the phone or browser you use, not on the server. Clearing Safari's website data erases them.
- **Webull:** the investments panel only worked inside Claude, so it's off in this version.
- **Live call voices** use your phone's built-in voices. **Dictation** works in Safari and Chrome.
- **Password:** anyone with your server address and APP_PASSWORD can use your API keys. Keep the password private, and change it with `npx wrangler secret put APP_PASSWORD` if it leaks.
