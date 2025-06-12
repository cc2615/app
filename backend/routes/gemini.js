const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/gemini', async (req, res) => {
  const { prompt, imageBase64 } = req.body;

  try {
    const parts = [];
    if (prompt) {
      parts.push({ text: prompt });
    }

    if (imageBase64) {
      const mimeMatch = imageBase64.match(/^data:(image\/(png|jpeg));base64,/);
      if (!mimeMatch) {
        return res.status(400).json({ error: 'invalid image format' });
      }

      const mimeType = mimeMatch[1];
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, '');

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    if (parts.length === 0) {
      return res.status(400).json({ error: 'nothing provided' });
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      { contents: [{ parts }] },
      {
        params: { key: process.env.GEMINI_API_KEY },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('api error:', error.response?.data || error.message);
    res.status(500).json({ error: 'failed!' });
  }
});

module.exports = router;
