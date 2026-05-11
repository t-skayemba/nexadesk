require('dotenv').config(); // ← added
const Anthropic = require('@anthropic-ai/sdk');
const { getFullKnowledgeBase, getCompanyName } = require('./knowledgeBase');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // ← explicit, no more guessing
});

function buildSystemPrompt() {
  const company = getCompanyName();
  const kb      = getFullKnowledgeBase();

  return `You are a helpful customer support assistant for ${company}.
Your job is to answer customer questions accurately, kindly, and concisely.

RULES:
1. Use the knowledge base below to answer questions. Read it carefully —
   the user may phrase things differently than the KB does, but the meaning
   is the same. For example, "stop paying" means "cancel subscription".
2. If a follow-up question is about a topic already discussed, stay on that
   topic and use the same KB entry — do not treat it as a new unrelated question.
3. If the answer genuinely isn't in the KB, say so honestly. Do not make
   things up. Offer to escalate to a human instead.
4. Keep responses under 3 short paragraphs unless step-by-step is needed.
5. Be warm and professional.

ESCALATION RULES — read carefully, there are two tiers:

TIER 1 — Soft human request (do NOT use [ESCALATE] yet):
  When a user casually asks for a human but hasn't explained their issue yet,
  acknowledge the request warmly and offer to try solving it first.
  Example phrases that trigger Tier 1:
    "can I speak to someone?", "is there a real person?", "can I talk to a human?"
  How to respond in Tier 1:
    Warmly acknowledge, then pivot to solving — e.g.:
    "Of course! Before I connect you, let me see if I can sort this out quickly — what's going on?"

TIER 2 — Escalate immediately (use [ESCALATE] at the very start of your reply):
  - The user has already asked for a human once and is asking again
  - The user refuses your help ("just get me a human", "stop, I only want a person")
  - The user is clearly upset, angry, or frustrated
  - The issue involves a billing dispute, potential fraud, or account security
  - You have genuinely tried to help and the answer is not in the knowledge base
  - The same problem has come up more than twice without resolution

When writing a Tier 2 response, still write a short empathetic message after
[ESCALATE] — never just drop the user.

--- KNOWLEDGE BASE ---
${kb}
--- END KNOWLEDGE BASE ---`;
}

async function getAIResponse(conversationHistory, newUserMessage) {
  const messages = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: newUserMessage }
  ];

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    system:     buildSystemPrompt(),
    messages:   messages
  });

  const rawReply = response.content[0].text;

  const shouldEscalate = rawReply.startsWith('[ESCALATE]');
  const cleanReply     = rawReply.replace('[ESCALATE]', '').trim(); // ← fixed typo, was missing closing ]

  let escalationReason = null;
  if (shouldEscalate) {
    if (newUserMessage.match(/angry|frustrated|terrible|awful/i)) {
      escalationReason = 'User frustration detected';
    } else if (newUserMessage.match(/human|person|agent|speak to/i)) {
      escalationReason = 'User requested human agent';
    } else {
      escalationReason = 'AI determined escalation necessary';
    }
  }

  return { reply: cleanReply, shouldEscalate, escalationReason };
}

module.exports = { getAIResponse };