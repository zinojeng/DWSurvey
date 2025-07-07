const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all active polls
router.get('/', async (req, res) => {
  try {
    const polls = await db.all('SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC');
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get poll with questions and options
router.get('/:id', async (req, res) => {
  try {
    const pollId = req.params.id;
    
    // Get poll details
    const poll = await db.get('SELECT * FROM polls WHERE id = ?', [pollId]);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Get questions for this poll
    const questions = await db.all(
      'SELECT * FROM questions WHERE poll_id = ? ORDER BY order_index',
      [pollId]
    );

    // Get options for each question
    for (let question of questions) {
      const options = await db.all(
        'SELECT * FROM options WHERE question_id = ? ORDER BY order_index',
        [question.id]
      );
      question.options = options;
    }

    poll.questions = questions;
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get poll results
router.get('/:id/results', async (req, res) => {
  try {
    const pollId = req.params.id;
    
    const results = await db.all(`
      SELECT 
        q.id as question_id,
        q.question_text,
        o.id as option_id,
        o.option_text,
        COUNT(v.id) as vote_count
      FROM questions q
      LEFT JOIN options o ON q.id = o.question_id
      LEFT JOIN votes v ON o.id = v.option_id
      WHERE q.poll_id = ?
      GROUP BY q.id, o.id
      ORDER BY q.order_index, o.order_index
    `, [pollId]);

    // Group results by question
    const groupedResults = {};
    results.forEach(row => {
      if (!groupedResults[row.question_id]) {
        groupedResults[row.question_id] = {
          question_id: row.question_id,
          question_text: row.question_text,
          options: []
        };
      }
      if (row.option_id) {
        groupedResults[row.question_id].options.push({
          option_id: row.option_id,
          option_text: row.option_text,
          vote_count: row.vote_count
        });
      }
    });

    res.json(Object.values(groupedResults));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;