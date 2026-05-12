# NexaDesk — Notification Setup Guide

When a customer is escalated to human support, NexaDesk can automatically
alert your support team via Slack, email, or both.

This guide walks through setting up each channel. You only need one —
but both is recommended so nothing gets missed.

---

## Option 1 — Slack (recommended)

When a customer escalates, a message like this drops into your chosen Slack channel:

```
⚡ Customer Escalated to Human Support
────────────────────────────────────
Reason:          User requested human agent
Time:            May 8, 2026, 5:14 PM
Conversation ID: a3f9c2...

Last messages:
Customer: I've been waiting 3 days for a refund
Bot: I completely understand...
```

### Setup (takes ~2 minutes)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**
2. Choose **From scratch**, give it a name (e.g. "NexaDesk"), and pick your workspace
3. In the left sidebar, click **Incoming Webhooks**
4. Toggle **Activate Incoming Webhooks** to ON
5. Click **Add New Webhook to Workspace**
6. Choose the Slack channel where escalation alerts should appear (e.g. `#support`)
7. Click **Allow**
8. Copy the webhook URL — it looks like:
   ```
   https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN
   ```
9. Add it to your `.env` file:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
   ```
10. Restart the server — you should see `🔔 Notifications active: Slack` in the console

### Testing it
Trigger an escalation in the widget (say "I'm frustrated and need a real person")
and check your Slack channel. The message should appear within a few seconds.

---

## Option 2 — Email

When a customer escalates, your support inbox receives an email with:
- The reason for escalation
- The full conversation transcript
- The time and conversation ID

### Setup with Gmail

Gmail requires an **App Password** — this is a separate password specifically
for third-party apps. Your normal Gmail password won't work.

**Step 1 — Enable 2-Step Verification on your Google account**
(required before you can create App Passwords)
- Go to [myaccount.google.com/security](https://myaccount.google.com/security)
- Turn on 2-Step Verification if it isn't already on

**Step 2 — Create an App Password**
- Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Select app: **Mail**
- Select device: **Other** → type "NexaDesk"
- Click **Generate**
- Copy the 16-character password it gives you

**Step 3 — Add to your `.env`**
```
SUPPORT_EMAIL_USER=your-gmail@gmail.com
SUPPORT_EMAIL_PASS=xxxx xxxx xxxx xxxx   ← the 16-char App Password
SUPPORT_NOTIFY_EMAIL=support@clientcompany.com
```

**Step 4 — Restart the server**
You should see `🔔 Notifications active: Email` in the console.

---

### Setup with SendGrid (better for production)

SendGrid is more reliable than Gmail for sending automated emails
and has a free tier (100 emails/day).

1. Create a free account at [sendgrid.com](https://sendgrid.com)
2. Go to **Settings → API Keys → Create API Key**
3. Choose **Restricted Access** → enable **Mail Send**
4. Copy the API key
5. In `backend/notifier.js`, replace the transporter config:

```javascript
// Replace the Gmail transporter with this
const transporter = nodemailer.createTransport({
  host:   'smtp.sendgrid.net',
  port:    587,
  secure:  false,
  auth: {
    user: 'apikey',                        // literally the string "apikey"
    pass: process.env.SUPPORT_EMAIL_PASS   // your SendGrid API key
  }
});
```

6. Update `.env`:
```
SUPPORT_EMAIL_USER=notifications@yourdomain.com  ← must be a verified sender in SendGrid
SUPPORT_EMAIL_PASS=SG.your-sendgrid-api-key
SUPPORT_NOTIFY_EMAIL=support@clientcompany.com
```

---

## Using Both

You can run Slack and email simultaneously — just set all the variables.
Both notifications fire in parallel when an escalation happens.
If one fails (e.g. Slack is down), the other still sends.

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
SUPPORT_EMAIL_USER=notifications@yourdomain.com
SUPPORT_EMAIL_PASS=your-app-password
SUPPORT_NOTIFY_EMAIL=support@clientcompany.com
```

---

## What Happens If Notifications Aren't Configured

Nothing breaks. Escalations are still:
- Logged in the SQLite database with the full transcript
- Flagged in the admin conversations endpoint
- Shown to the customer in the widget with the yellow escalation card

Notifications are an enhancement on top of what's already tracked —
not a dependency of the system.