const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');

// Submit vote
router.post('/', async (req, res) => {
  try {
    const { optionIds, sessionId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const session = sessionId || uuidv4();

    // Validate option IDs
    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: 'Invalid option IDs' });
    }

    // Check if poll is closed
    const pollCheck = await db.get(`
      SELECT p.closed FROM polls p
      JOIN questions q ON p.id = q.poll_id
      JOIN options o ON q.id = o.question_id
      WHERE o.id = ?
    `, [optionIds[0]]);

    if (pollCheck && pollCheck.closed) {
      return res.status(400).json({ error: 'Voting has been closed for this poll' });
    }

    // Check if options belong to the same question (for single choice)
    const questionCheck = await db.all(
      `SELECT DISTINCT question_id FROM options WHERE id IN (${optionIds.map(() => '?').join(',')})`,
      optionIds
    );

    if (questionCheck.length > 1) {
      // Multiple questions selected, validate each
      for (const option of optionIds) {
        const questionInfo = await db.get(`
          SELECT q.question_type, o.question_id 
          FROM options o 
          JOIN questions q ON o.question_id = q.id 
          WHERE o.id = ?
        `, [option]);

        if (questionInfo && questionInfo.question_type === 'single') {
          // Check if user already voted for this question
          const existingVote = await db.get(`
            SELECT v.* FROM votes v
            JOIN options o ON v.option_id = o.id
            WHERE o.question_id = ? AND v.session_id = ?
          `, [questionInfo.question_id, session]);

          if (existingVote) {
            return res.status(400).json({ 
              error: 'Already voted for this question',
              questionId: questionInfo.question_id 
            });
          }
        }
      }
    }

    // Insert votes
    const votePromises = optionIds.map(optionId => 
      db.run(
        'INSERT OR IGNORE INTO votes (option_id, session_id, ip_address) VALUES (?, ?, ?)',
        [optionId, session, ipAddress]
      )
    );

    await Promise.all(votePromises);

    // Emit update via WebSocket (handled in socketHandler)
    const io = req.app.get('io');
    if (io) {
      // Get poll ID from first option
      const pollInfo = await db.get(`
        SELECT q.poll_id FROM options o
        JOIN questions q ON o.question_id = q.id
        WHERE o.id = ?
      `, [optionIds[0]]);

      if (pollInfo) {
        io.to(`poll-${pollInfo.poll_id}`).emit('voteUpdate', { pollId: pollInfo.poll_id });
      }
    }

    res.json({ 
      success: true, 
      sessionId: session,
      message: 'Vote submitted successfully' 
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user has voted
router.get('/check/:pollId/:sessionId', async (req, res) => {
  try {
    const { pollId, sessionId } = req.params;

    const votes = await db.all(`
      SELECT DISTINCT o.id as option_id, q.id as question_id
      FROM votes v
      JOIN options o ON v.option_id = o.id
      JOIN questions q ON o.question_id = q.id
      WHERE q.poll_id = ? AND v.session_id = ?
    `, [pollId, sessionId]);

    res.json({ hasVoted: votes.length > 0, votes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;