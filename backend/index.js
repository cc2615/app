const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const geminiRoutes = require('./routes/gemini.js')
require('dotenv').config();


app.use(cors());
app.use(express.json());

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.use('/', geminiRoutes)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
