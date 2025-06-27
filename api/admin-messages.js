import { query } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { rows } = await query('SELECT id, user_id, nickname, message, created_at FROM admin_messages ORDER BY created_at DESC LIMIT 50');
    res.status(200).json({ messages: rows.reverse() });
    return;
  }
  if (req.method === 'POST') {
    const { user_id, nickname, message } = req.body;
    if (!user_id || !message) return res.status(400).json({ error: 'Missing user_id or message' });
    await query(
      'INSERT INTO admin_messages (user_id, nickname, message) VALUES ($1, $2, $3)',
      [user_id, nickname || null, message]
    );
    res.status(200).json({ ok: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
} 