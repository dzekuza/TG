// api/order.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Incoming order request:', req.body);
  const { meal, user, location } = req.body;

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
  console.log('TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'Loaded' : 'Missing');
  console.log('ADMIN_CHAT_ID:', ADMIN_CHAT_ID ? 'Loaded' : 'Missing');

  const msg = `
🍽️ New Food Order!
👤 User: ${user?.first_name || 'Unknown'} (@${user?.username || '-'})
🧾 Order: ${meal}
📍 Location: https://www.google.com/maps?q=${location.lat},${location.lng}
  `;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: msg
      })
    });
    const tgData = await tgRes.json();
    console.log('Telegram API response:', tgData);
    res.status(200).json({ success: true, telegram: tgData });
  } catch (err) {
    console.error('Error sending message to Telegram:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}