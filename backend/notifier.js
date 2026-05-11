require('dotenv').config()
const nodemailer = require('nodemailer');

// --------------------------------------------------
// NOTIFIER
// sends escaltion alerts via email and/or Slack
// when a converation is handed off to a human agent

// both methods are optional - if the env variables
// aren't set, that method is silently skipped
// this just means a client can use just email, just Slack,
// or both - without any code changes
// --------------------------------------------------

/**
 * Format a conversation transcript for notifications
 */
function formatTranscript(transcript) {
    return transcript
        .map(m => `${m.role == 'user' ? '👤 Customer' : '🤖 Bot'}: ${m.content}`)
        .join('\n\n');
}

/**
 * Send an email to the support team when a conversation escalates.
 * Requires: SUPPORT_EMAIL_USER, SUPPORT_EMAIL_PASS, SUPPORT_NOTIFY_EMAIL
 */
async function sendEmailNotification(conversationId, transcript, reason, suppprtEmail) {
    const { SUPPORT_EMAIL_USER, SUPPORT_EMAIL_PASS, SUPPORT_NOTIFY_EMAIL } = process.env;

    if (!SUPPORT_EMAIL_USER || !SUPPORT_EMAIL_PASS || !SUPPORT_NOTIFY_EMAIL) {
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // change to 'SendGrid', Mailgun', etc. if needed
            auth: {
                user: SUPPORT_EMAIL_USER,
                pass: SUPPORT_EMAIL_PASS
            }
        });

        const formattedTranscript = formatTranscript(transcript);
        const timestap = new Date().toLocaleString();

        await transporter.sendMail({
            from: `"NexaDesk Alerts" <${SUPPORT_EMAIL_USER}>`,
            to: SUPPORT_NOTIFY_EMAIL,
            subject: `⚡ Customer needs human support — ${timestamp}`,
            text: `
            A customer has been escalated to human support and needs your attention.
            
            REASON: ${reason}
            CONVERSATION ID: ${conversationId}
            TIME: ${timestamp}
            CUSTOMER CONTACT: ${supportEmail || 'Not provided'}
            
            -- FULL TRANSCRIPT --
            
            ${formattedTranscript}
            
            ---
            
            Reply to theis email or reach out to the customer directly at ${supportEmail || 'the address on file'}.
            `.trim(),
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 12px 12px 0 0;">
                        <h2 style="color: white; margin: 0;">⚡ Customer Needs Human Support</h2>
                    </div>
                    <div style="background: #fff8e1; border: 1px solid #fbbf24; padding: 16px; margin: 0;">
                        <strong>Reason:</strong> ${reason}
                    </div>
                    <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 12px 12px;">
                        <p><strong>Conversation ID:</strong> ${conversationId}</p>
                        <p><strong>Time:</strong> ${timestamp}</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;"/>
                        <h3>Conversation Transcript</h3>
                        ${transcript.map(m => `
                        <div style="
                            background: ${m.role === 'user' ? '#eef2ff' : '#f8f9fb'};
                            border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;
                        ">
                            <strong>${m.role === 'user' ? '👤 Customer' : '🤖 Bot'}</strong>
                            <p style="margin: 6px 0 0;">${m.content}</p>
                        </div>
                        `).join('')}
                    </div>
                    </div>
                `
        });
        console.log(`📧 Escalation email sent for conversation ${conversationId}`);
    } catch (error) {
        console.error('❌ Failed to send escalation email:', error.message);
    }
}

/**
 * Send a Slack message to the support channel when a conversation escalates.
 * Requires: SLACK_WEBHOOK_URL
 * Setup guide: see NOTIFICATIONS.md
 */
async function sendSlackNotification(conversationId, transcript, reason) {
    const { SLACK_WEBHOOK_URL } = process.env;

    if(!SLACK_WEBHOOK_URL) {
        return;
    }

    try {
        const timestamp = new Date().toLocaleString();
        const excerptMessages = transcript.slice(-4);
        const exceptText = excerptMessages
            .map(m => `*${m.role === 'user' ? 'Customer' : 'Bot'}:* ${m.content}`)
            .join('\n');
        
        const payload = {
            text: '⚡ A customer needs human support',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '⚡ Customer Escalated to Human Support'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        { 
                            type: 'mrkdwn',
                            text: `*Reason:*\n${reason}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Time:*\n${timestamp}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Conversation ID:*\n\`${conversationId}\``
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Messages in conversation:*\n${transcript.length}`
                        }
                    ]
                },
                {
                    type: 'divider'
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Last messages:*\n${excerptText}`
                    }
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: 'Powered by NexaDesk · Built by Tiana Kayemba'
                        }
                    ]
                }
            ]
        };

        const res = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Slack returned ${res.status}`);
        }

        console.log(`💬 Slack escalation alert sent for conversation ${conversationId}`);
    } catch (error) {
        console.error('❌ Failed to send Slack notification:', error.message);
    }
}

/**
 * Main export - call this whenever conversation is escalated.
 * Send to all configured notification channels simultaneously.
 */
async function sendEscalationNotification(conversationId, transcript, reason, supportEmail) {
    await Promise.allSettled([
        sendEmailNotification(conversationId, transcript, reason, supportEmail),
        sendSlackNotification(conversationId, transcript, reason)
    ]);
}

module.exports = { sendEscalationNotification }