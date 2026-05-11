const fs = require('fs');
const path = require('path');

// load the knowledge base once the server starts
const kb = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'knowledgeBase.json'), 'utf-8')
);

/**
 * OLD APPROARCH: Search the knowledge base for entries relevent to the user's message.
 * Returns the top matches as a formatted string to inject into the AI prompt.
 */
/** function searchKnowledgeBase(userMessage) {
*    const message = userMessage.toLowerCase();
*    const scored = []
*
*    for (const topic of kb.topics) {
*        let score = 0;
*
*        // score by keyword matches
*        for (const keyword of topic.keywords) {
*            if (message.includes(keyword.toLowerCase())) {
*                score += 2;
*            }
*        }
*
*        if (message.includes(topic.category.toLowerCase())) {
*            score += 1;
*        }
*
*        if (score > 0) {
*            scored.push({ ...topic, score });
*        }
*    }
*
*    // sort by relevance, take top 3
*    const topMatches = scored
*    .sort((a, b) => b.score - a.score)
*    .slice(0, 3);
*
*    if (topMatches.length == 0) {
*        return null; // no relebent KB entries found
*    }
*
*    // format for injection into the AI system prompt
*    return topMatches
*        .map(t => `[${t.category}] ${t.question}\nAnswer: ${t.answer}`)
*        .join('\n\n');
*}
*/

/**
 * NEW APPROACH: return the entire knowleddge base formatted as a string.
 * Claude reads it an figures out what's relevant - even when the user words things completely differently
 * or asks follow-up questions.
 */

function getFullKnowledgeBase() {
    return kb.topics
        .map(t => `[${t.category}] ${t.question}\nAnswer: ${t.answer}`)
        .join('\n\n');
}

function getCompanyName() {
    return kb.company;
}

function getSupportEmail() {
    return kb.getSupportEmail || 'our support team';
}

module.exports = { getFullKnowledgeBase, getCompanyName, getSupportEmail };