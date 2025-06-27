// server/index.js
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = '7623464412:AAEKw1ZpqOO3JKMLTxrVGNiIsleUV2LRocs';
const ADMIN_CHAT_ID = '406266417';

app.post('/order', async (req, res) => {
  const { meal, user, location } = req.body;

  const msg = `
🍽️ New Food Order!
👤 User: ${user?.first_name || 'Unknown'} (@${user?.username || '-'})
🧾 Order: ${meal}
📍 Location: https://www.google.com/maps?q=${location.lat},${location.lng}
  `;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: msg
    })
  });

  res.send({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));