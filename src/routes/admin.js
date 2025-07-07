const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../models/database');

// Simple auth middleware
const authenticate = async (req, res, next) => {
  const { password } = req.body;
  
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Create new poll
router.post('/polls', authenticate, async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    // Insert poll
    const pollResult = await db.run(
      'INSERT INTO polls (title, description) VALUES (?, ?)',
      [title, description]
    );
    
    const pollId = pollResult.id;

    // Insert questions and options
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionResult = await db.run(
        'INSERT INTO questions (poll_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)',
        [pollId, question.text, question.type || 'single', i]
      );
      
      const questionId = questionResult.id;

      // Insert options for this question
      for (let j = 0; j < question.options.length; j++) {
        await db.run(
          'INSERT INTO options (question_id, option_text, order_index) VALUES (?, ?, ?)',
          [questionId, question.options[j], j]
        );
      }
    }

    res.json({ success: true, pollId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update poll status
router.put('/polls/:id/status', authenticate, async (req, res) => {
  try {
    const { active } = req.body;
    const pollId = req.params.id;

    await db.run(
      'UPDATE polls SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [active ? 1 : 0, pollId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close poll voting
router.put('/polls/:id/close', authenticate, async (req, res) => {
  try {
    const pollId = req.params.id;

    await db.run(
      'UPDATE polls SET closed = 1, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pollId]
    );

    // Emit poll closed event via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`poll-${pollId}`).emit('pollClosed', { pollId });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update poll details
router.put('/polls/:id', authenticate, async (req, res) => {
  try {
    const pollId = req.params.id;
    const { title, description } = req.body;

    await db.run(
      'UPDATE polls SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, pollId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single poll with all questions and options
router.post('/polls/:id/edit', authenticate, async (req, res) => {
  try {
    const pollId = req.params.id;
    
    const poll = await db.get('SELECT * FROM polls WHERE id = ?', [pollId]);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const questions = await db.all(
      'SELECT * FROM questions WHERE poll_id = ? ORDER BY order_index',
      [pollId]
    );

    for (let question of questions) {
      question.options = await db.all(
        'SELECT * FROM options WHERE question_id = ? ORDER BY order_index',
        [question.id]
      );
    }

    poll.questions = questions;
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question
router.put('/questions/:id', authenticate, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { question_text, question_type } = req.body;

    await db.run(
      'UPDATE questions SET question_text = ?, question_type = ? WHERE id = ?',
      [question_text, question_type || 'single', questionId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new question to poll
router.post('/polls/:id/questions', authenticate, async (req, res) => {
  try {
    const pollId = req.params.id;
    const { question_text, question_type, options } = req.body;

    // Get max order_index
    const maxOrder = await db.get(
      'SELECT MAX(order_index) as max_order FROM questions WHERE poll_id = ?',
      [pollId]
    );
    const orderIndex = (maxOrder.max_order || 0) + 1;

    // Insert question
    const questionResult = await db.run(
      'INSERT INTO questions (poll_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)',
      [pollId, question_text, question_type || 'single', orderIndex]
    );
    
    const questionId = questionResult.id;

    // Insert options
    if (options && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        await db.run(
          'INSERT INTO options (question_id, option_text, order_index) VALUES (?, ?, ?)',
          [questionId, options[i], i]
        );
      }
    }

    res.json({ success: true, questionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete question
router.delete('/questions/:id', authenticate, async (req, res) => {
  try {
    const questionId = req.params.id;

    await db.run('DELETE FROM questions WHERE id = ?', [questionId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update option
router.put('/options/:id', authenticate, async (req, res) => {
  try {
    const optionId = req.params.id;
    const { option_text } = req.body;

    await db.run(
      'UPDATE options SET option_text = ? WHERE id = ?',
      [option_text, optionId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new option to question
router.post('/questions/:id/options', authenticate, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { option_text } = req.body;

    // Get max order_index
    const maxOrder = await db.get(
      'SELECT MAX(order_index) as max_order FROM options WHERE question_id = ?',
      [questionId]
    );
    const orderIndex = (maxOrder.max_order || 0) + 1;

    const result = await db.run(
      'INSERT INTO options (question_id, option_text, order_index) VALUES (?, ?, ?)',
      [questionId, option_text, orderIndex]
    );

    res.json({ success: true, optionId: result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete option
router.delete('/options/:id', authenticate, async (req, res) => {
  try {
    const optionId = req.params.id;

    // Check if there are votes for this option
    const voteCount = await db.get(
      'SELECT COUNT(*) as count FROM votes WHERE option_id = ?',
      [optionId]
    );

    if (voteCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete option with existing votes',
        voteCount: voteCount.count 
      });
    }

    await db.run('DELETE FROM options WHERE id = ?', [optionId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete poll
router.delete('/polls/:id', authenticate, async (req, res) => {
  try {
    const pollId = req.params.id;

    await db.run('DELETE FROM polls WHERE id = ?', [pollId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all polls (including inactive)
router.post('/polls/list', authenticate, async (req, res) => {
  try {
    const polls = await db.all('SELECT * FROM polls ORDER BY created_at DESC');
    
    for (let poll of polls) {
      const voteCount = await db.get(`
        SELECT COUNT(DISTINCT v.session_id) as participant_count
        FROM votes v
        JOIN options o ON v.option_id = o.id
        JOIN questions q ON o.question_id = q.id
        WHERE q.poll_id = ?
      `, [poll.id]);
      
      poll.participant_count = voteCount.participant_count;
    }

    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;