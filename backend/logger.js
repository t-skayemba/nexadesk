require('dotenv').config();
const { Pool } = require('pg');

// ---------------------------------------------------------
// DATABASE CONNECTION
// Uses DATABASE_URL from enviornment variables.
// ---------------------------------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});

// ---------------------------------------------------------
// INITIALISE TABLES
// creates tables if they don't exist yet
// runs once server starts
// ---------------------------------------------------------
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            started_at TIMESTAMPTZ DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            was_escalated BOOLEAN DEFAULT FALSE,
            escalation_reason TEXT,
            user_info JSONB
        );
        
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            conversation_id TEXT REFERENCES conversations(id),
            role TEXT,
            content TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    console.log('✅ Database tables ready');
}

// call on startup
initDB().catch(err => {
    console.error('❌ Failed to initialise database:', err.message);
});

// ---------------------------------------------------------
// START A CONVERSATION
// ---------------------------------------------------------
async function startConversation(conversationId, userInfo = {}) {
    await pool.query(
        'INSERT INTO conversations (id, user_info) VALUES ($1, $2)',
        [conversationId, JSON.stringify(userInfo)]
    );
    return conversationId;
}

// ---------------------------------------------------------
// LOG A MESSAGE
// role = 'user' or 'assistant'
// ---------------------------------------------------------
async function logMessage(conversationId, role, content) {
    await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, role, content]
    );
}

// ---------------------------------------------------------
// MARK A CONVERSATION AS ESCALATED
// ---------------------------------------------------------
async function markEscalated(conversationId, reason) {
    await pool.query(
        'UPDATE conversations SET was_escalated = TRUE, escalation_reason = $1 WHERE id = $2',
        [reason, conversationId]
    );
}

// ---------------------------------------------------------
// END A CONVERSATION
// ---------------------------------------------------------
async function endConversation(conversationId) {
    await pool.query(
        'UPDATE conversations SET ended_at = NOW() WHERE id = $1',
        [conversationId]
    );
}

// ---------------------------------------------------------
// GET CONVERSATION HISTORY
// returns all messages for a conversation in order
// used to pass history to Claude on every request
// ---------------------------------------------------------
async function getConversationHistory(conversationId) {
    const result = await pool.query(
        'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC',
        [conversationId]
    );
    return result.rows;
}

// ---------------------------------------------------------
// GET CONVERSATION SUMMARIES
// returns the last 50 conversations for the admin endpoint
// ---------------------------------------------------------
async function getConversationSummaries() {
    const result = await pool.query(`
        SELECT
            c.id,
            c.started_at,
            c.ended_at,
            c.was_escalated,
            c.escalation_reason,
            COUNT(m.id) AS message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id
        ORDER BY c.started_at DESC
        LIMIT 50
    `);
    return result.rows;
}

module.exports = {
    startConversation,
    logMessage,
    markEscalated,
    endConversation,
    getConversationHistory,
    getConversationSummaries
};