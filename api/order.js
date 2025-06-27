// api/order.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { meal, user, location } = req.body;

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

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

  res.status(200).json({ success: true });
}