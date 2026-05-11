# NexaDesk
Stop losing customers to slow support. Start answering them instantly.

NexaDesk is a white-label AI customer support widget that answers questions from your knowledge base, knows when to hand off to a human agent, and logs every conversation — deployable on any website with a single script tag.

[Try It Live](https://nexadesk.tianakayemba.dev)

> 🚀 **nexadesk.tianakayemba.dev** — no setup required, try it live!

---

## What It Does

Drop NexaDesk onto any website and it will:

- **Answer from your knowledge base** — questions are matched against your custom FAQ and policy content, so answers are always grounded in your actual documentation, not generic AI responses
- **Know when to escalate** — detects frustration, billing disputes, security concerns, and direct requests for a human agent, then hands off cleanly with full conversation context attached
- **Try to resolve before escalating** — if a user casually asks for a human, the bot offers to help first and only escalates if they insist or the issue genuinely requires it
- **Log every conversation** — all messages are stored with timestamps, escalation flags, and session IDs for review and auditing
- **Notify your support team** — when a customer escalates, your team is alerted instantly via Slack, email, or both, with the full transcript attached
- **Adapt to any brand** — colours, logo, and bot name are fully configurable without touching code
- **Deploy with one script tag** — clients add one line to their website. Works on WordPress, Webflow, Shopify, or plain HTML — no framework or build step required on their end

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI | Anthropic Claude API (claude-sonnet-4-5) |
| Backend | Node.js, Express |
| Database | SQLite (via better-sqlite3) |
| Knowledge Base | JSON + full-context Claude injection |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Notifications | Nodemailer (email) + Slack Webhooks |
| Auth | API key middleware (admin routes) |

---

## How It Works

Each client gets their own backend instance with their own knowledge base, colours, and support team connected. Once deployed, they add one line to their website:

```html
<script src="https://their-backend.railway.app/embed.js"></script>
```

The embed script bootstraps itself — injects the widget, connects to the right backend, and loads the right knowledge base. Nothing else needed on the client's end.

---

## Running Locally

### 1. Clone the repo
```bash
git clone https://github.com/t-skayemba/nexadesk.git
cd nexadesk
```

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Set your API key
```bash
cp .env.example .env
```
Open `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
ADMIN_SECRET_KEY=any-long-random-string
PORT=3001
```
Get an API key at [console.anthropic.com](https://console.anthropic.com)

### 4. Start the backend
```bash
node server.js
```

### 5. Serve the frontend
```bash
# In a new terminal tab, from the project root
npx serve .
```

Visit `http://localhost:3000/demo/`

---

## Using the Demo

- **Open the widget** — click the 💬 bubble in the bottom-right corner
- **Ask a question** — try billing, passwords, or team management questions
- **Test escalation** — say something like *"I'm really frustrated and need a real person"*
- **Try the Brand Customizer** — enter a company name, pick a colour, upload a logo, and watch the widget update in real time
- **Use the quick-try buttons** — simulate common support scenarios instantly

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/embed.js` | Self-bootstrapping embed script |
| GET | `/widget/widget.html` | Standalone widget page |
| POST | `/chat/start` | Start a new conversation session |
| POST | `/chat/message` | Send a message, receive AI response |
| POST | `/chat/end` | Close a conversation session |
| GET | `/admin/conversations` | View conversation logs (requires `x-admin-key` header) |

### Accessing admin logs
```bash
curl https://your-backend.railway.app/admin/conversations \
  -H "x-admin-key: your-admin-secret-key"
```

---

## Project Structure

```
nexadesk/
├── backend/
│   ├── server.js              # Express server, API routes, embed script serving
│   ├── aiHandler.js           # Claude AI integration and system prompt
│   ├── knowledgeBase.js       # Knowledge base loader
│   ├── logger.js              # SQLite conversation logger
│   ├── notifier.js            # Slack and email escalation notifications
│   ├── knowledgeBase.json     # Knowledge base content (customised per client)
│   ├── .env.example           # Environment variable template
│   └── package.json
├── widget/
│   ├── widget.html            # Standalone embeddable widget
│   └── embed.js               # One-line embed script template
├── demo/
│   └── index.html             # Pitch page with live brand customizer
├── NOTIFICATIONS.md           # Slack and email alert setup guide
└── README.md
```

---

## Data & Privacy

| What | Where |
|---|---|
| Conversation logs | Stored in `backend/conversations.db` |
| Knowledge base | Stored in `backend/knowledgeBase.json` |
| Message processing | Sent to Anthropic's API to generate responses |

Conversation content is sent to Anthropic's API for answer generation. See [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) for details.

---

## Deploying for Your Business

Want NexaDesk running on your website with your knowledge base, your branding, and your support team connected?

📩 **[tskayemba@gmail.com](mailto:tskayemba@gmail.com)**

---

Built by **Tiana Kayemba**

MIT License