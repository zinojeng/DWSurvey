const db = require('../models/database');

function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join a poll room
    socket.on('joinPoll', (pollId) => {
      socket.join(`poll-${pollId}`);
      console.log(`Socket ${socket.id} joined poll-${pollId}`);
    });

    // Leave a poll room
    socket.on('leavePoll', (pollId) => {
      socket.leave(`poll-${pollId}`);
      console.log(`Socket ${socket.id} left poll-${pollId}`);
    });

    // Handle vote updates
    socket.on('requestUpdate', async (pollId) => {
      try {
        const results = await getPollResults(pollId);
        io.to(`poll-${pollId}`).emit('resultsUpdate', results);
      } catch (error) {
        console.error('Error fetching results:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Store io instance for use in routes
  io.app = io;
}

async function getPollResults(pollId) {
  const results = await db.all(`
    SELECT 
      q.id as question_id,
      q.question_text,
      q.question_type,
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
        question_type: row.question_type,
        options: [],
        total_votes: 0
      };
    }
    if (row.option_id) {
      groupedResults[row.question_id].options.push({
        option_id: row.option_id,
        option_text: row.option_text,
        vote_count: row.vote_count,
        percentage: 0
      });
      groupedResults[row.question_id].total_votes += row.vote_count;
    }
  });

  // Calculate percentages
  Object.values(groupedResults).forEach(question => {
    question.options.forEach(option => {
      if (question.total_votes > 0) {
        option.percentage = Math.round((option.vote_count / question.total_votes) * 100);
      }
    });
  });

  return Object.values(groupedResults);
}

module.exports = setupWebSocket;