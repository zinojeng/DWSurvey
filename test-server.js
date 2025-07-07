const express = require('express');
const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send(`
    <h1>DW Survey Test Server</h1>
    <p>Server is working on port ${port}!</p>
    <a href="/admin">Go to Admin (Test)</a>
  `);
});

app.get('/admin', (req, res) => {
  res.send('<h1>Admin Test Page</h1><p>This is working!</p>');
});

app.listen(port, () => {
  console.log(`Test server running at:`);
  console.log(`- http://localhost:${port}`);
  console.log(`- http://127.0.0.1:${port}`);
});