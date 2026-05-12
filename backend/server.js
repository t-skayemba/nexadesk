require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { getAIResponse } = require('./aiHandler');
const { getCompanyName, getSupportEmail } = require('./knowledgeBase');
const logger   = require('./logger');
const { sendEscalationNotification } = require('./notifier'); // ← added

const app  = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve widget files as static assets
app.use('/widget', express.static(path.join(__dirname, '../widget')));

// ─────────────────────────────────────────────
// EMBED SCRIPT
// The one script tag clients add to their site:
// <script src="https://your-backend.railway.app/embed.js"></script>
// ─────────────────────────────────────────────
app.get('/embed.js', (req, res) => {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  const fs         = require('fs');
  const template   = fs.readFileSync(
    path.join(__dirname, '../widget/embed.js'), 'utf-8'
  );
  const script = template.replace('{{BACKEND_URL}}', backendUrl);
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(script);
});

// ─────────────────────────────────────────────
// ADMIN AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─────────────────────────────────────────────
// POST /chat/start
// ─────────────────────────────────────────────
app.post('/chat/start', async (req, res) => {
  const conversationId = uuidv4();
  const userInfo       = req.body.userInfo || {};
  const company        = getCompanyName();
  const supportEmail   = getSupportEmail();

  await logger.startConversation(conversationId, userInfo);

  res.json({
    conversationId,
    supportEmail,
    greeting: `Hi there! 👋 Welcome to ${company} support. How can I help you today?`
  });
});

// ─────────────────────────────────────────────
// POST /chat/message
// ─────────────────────────────────────────────
app.post('/chat/message', async (req, res) => {
  const { conversationId, message } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ error: 'conversationId and message are required' });
  }

  try {
    logger.logMessage(conversationId, 'user', message);

    const history         = await logger.getConversationHistory(conversationId);
    const previousHistory = history.slice(0, -1);

    const { reply, shouldEscalate, escalationReason } = await getAIResponse(
      previousHistory,
      message
    );

    logger.logMessage(conversationId, 'assistant', reply);

    if (shouldEscalate) {
      logger.markEscalated(conversationId, escalationReason);

      // Get full transcript and notify the support team
      const transcript   = logger.getConversationHistory(conversationId);
      const supportEmail = getSupportEmail();

      // Runs in background — doesn't slow down the response to the user
      sendEscalationNotification(
        conversationId,
        transcript,
        escalationReason,
        supportEmail
      ).catch(err => console.error('Notification error:', err));
    }

    res.json({ reply, shouldEscalate, escalationReason, conversationId });

  } catch (error) {
    console.error('❌ Error processing message:', error.message);
    console.error(error.stack);

    const email = getSupportEmail();
    res.status(500).json({
      error: 'Something went wrong. Please try again.',
      reply: `I apologize, I'm having trouble right now. Please try again or contact us at ${email}.`
    });
  }
});

// ─────────────────────────────────────────────
// POST /chat/end
// ─────────────────────────────────────────────
app.post('/chat/end', async (req, res) => {
  const { conversationId } = req.body;
  if (conversationId) {
    await logger.endConversation(conversationId);
  }
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// GET /admin/conversations  ← protected
// ─────────────────────────────────────────────
app.get('/admin/conversations', requireAdminKey, (req, res) => {
  const summaries = logger.getConversationSummaries();
  res.json(summaries);
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ NexaDesk backend running on http://localhost:${PORT}`);
  console.log(`📦 Embed script: http://localhost:${PORT}/embed.js`);
  console.log(`🔗 Widget: http://localhost:${PORT}/widget/widget.html`);

  // Show which notification channels are active on startup
  const channels = [];
  if (process.env.SLACK_WEBHOOK_URL)  channels.push('Slack');
  if (process.env.SUPPORT_EMAIL_USER) channels.push('Email');
  if (channels.length > 0) {
    console.log(`🔔 Notifications active: ${channels.join(', ')}`);
  } else {
    console.log(`⚠️  No notification channels configured (see .env.example)`);
  }
});