import { json } from 'express';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Tik POST užklausos leidžiamos' });
  }

  // Parse order/cart data
  const { items, total, address, comment } = req.body;
  if (!items || !total) {
    return res.status(400).json({ error: 'Trūksta užsakymo duomenų' });
  }

  // TODO: Set your Telegram bot token and payment provider token in env
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const PROVIDER_TOKEN = process.env.TELEGRAM_PROVIDER_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Optionally, get from user

  if (!BOT_TOKEN || !PROVIDER_TOKEN) {
    return res.status(500).json({ error: 'Nėra Telegram bot ar provider token' });
  }

  // Prepare invoice payload
  const payload = {
    chat_id: CHAT_ID, // You may want to get this from the user/session
    title: 'Maisto užsakymas',
    description: items.map(i => `${i.emoji || ''} ${i.name} x${i.qty}`).join(', '),
    payload: 'order-' + Date.now(),
    provider_token: PROVIDER_TOKEN,
    currency: 'EUR',
    prices: [
      { label: 'Užsakymas', amount: Math.round(Number(total) * 100) }, // in cents
    ],
    // Optionally, add more invoice fields
  };

  // Call Telegram sendInvoice API
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const tgData = await tgRes.json();
    if (!tgData.ok || !tgData.result) {
      return res.status(500).json({ error: 'Telegram invoice klaida', details: tgData });
    }
    // The result is the invoice link (slug)
    return res.status(200).json({ slug: tgData.result });
  } catch (e) {
    return res.status(500).json({ error: 'Telegram API klaida', details: e.message });
  }
} 