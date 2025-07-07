const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../models/database');

// Generate QR code for a poll
router.get('/poll/:pollId', async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const pollUrl = `${baseUrl}/mobile/${pollId}`;
    
    const qrCode = await QRCode.toDataURL(pollUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({ 
      qrCode, 
      url: pollUrl,
      pollId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR codes for all questions in a poll
router.get('/poll/:pollId/questions', async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Get all questions for this poll
    const questions = await db.all(
      'SELECT id, question_text FROM questions WHERE poll_id = ? ORDER BY order_index',
      [pollId]
    );
    
    // Generate QR code for each question
    const qrCodes = await Promise.all(questions.map(async (question) => {
      const questionUrl = `${baseUrl}/mobile/${pollId}/${question.id}`;
      const qrCode = await QRCode.toDataURL(questionUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        questionId: question.id,
        questionText: question.question_text,
        qrCode,
        url: questionUrl
      };
    }));
    
    res.json(qrCodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate printable QR code page for a poll
router.get('/poll/:pollId/print', async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Get poll details
    const poll = await db.get('SELECT * FROM polls WHERE id = ?', [pollId]);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    // Get all questions
    const questions = await db.all(
      'SELECT id, question_text FROM questions WHERE poll_id = ? ORDER BY order_index',
      [pollId]
    );
    
    // Generate QR codes
    const qrData = await Promise.all(questions.map(async (question) => {
      const questionUrl = `${baseUrl}/mobile/${pollId}/${question.id}`;
      const qrCode = await QRCode.toDataURL(questionUrl, {
        width: 250,
        margin: 2
      });
      
      return {
        ...question,
        qrCode,
        url: questionUrl
      };
    }));
    
    // Generate HTML for printing
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>QR Codes - ${poll.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .qr-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            page-break-inside: avoid;
        }
        .qr-item {
            text-align: center;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
        }
        .qr-item h3 {
            margin-bottom: 15px;
            color: #333;
        }
        .qr-item img {
            max-width: 100%;
        }
        .url {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
            word-break: break-all;
        }
        @media print {
            .qr-item {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${poll.title}</h1>
        <p>Scan QR code to vote on each question</p>
    </div>
    <div class="qr-container">
        ${qrData.map(item => `
            <div class="qr-item">
                <h3>Question ${questions.indexOf(questions.find(q => q.id === item.id)) + 1}</h3>
                <p>${item.question_text}</p>
                <img src="${item.qrCode}" alt="QR Code">
                <div class="url">${item.url}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;