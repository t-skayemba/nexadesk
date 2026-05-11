const Database = require('better-sqlite3');
const path = require('path');

// create (or open) the SQLLite database file
const db = new Database(path.join(__dirname, 'conversations.db'));

// create tables if they don't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    was_escalated INTEGER DEFAULT 0,
    escalation_reason TEXT,
    user_info TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );
`);

/**
 * Start a new conversation and return its ID
 */

function startConversation(conversationId, userInfo = {}) {
    const stmt = db.prepare(
        'INSERT INTO conversations (id, user_info) VALUES (?, ?)'
    );
    stmt.run(conversationId, JSON.stringify(userInfo));
    return conversationId;
}

/**
 * Log a single message (role = 'user' or 'assistant') 
 */
function logMessage(conversationId, role, content) {
    const stmt = db.prepare(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    );
    stmt.run(conversationId, role, content);
}

/**
 * Mark a conversation as escalated to a human
 */

function markEscalated(conversationId, reason) {
    const stmt = db.prepare(
        'UPDATE conversations SET was_escalated = 1, escalation_reason = ? WHERE id = ?'
    );
    stmt.run(reason, conversationId);
}

/**
 * Close a conversation
 */

function endConversation(conversationId) {
    const stmt = db.prepare(
        'UPDATE conversations SET ended_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(conversationId);
}

/**
 * Get all messages for a conversation (for passing history to Claude)
 */
function getConversationHistory(conversationId) {
    const stmt = db.prepare(
        'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
    );
    return stmt.all(conversationId);
}

/**
 * Get a summary of all conversations (for a dashboard later)
 */
function getConversationSummaries() {
    return db.prepare(`
        SELECT
            c.id,
            c.started_at,
            c.ended_at,
            c.was_escalated,
            c.escalation_reason,
            COUNT(m.id) as message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id
        ORDER BY c.started_at DESC
        LIMIT 50
    `).all();
}

module.exports = {
    startConversation,
    logMessage,
    markEscalated,
    endConversation,
    getConversationHistory,
    getConversationSummaries
};