import { query } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { user_id, nickname } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    await query(
      `INSERT INTO admin_users (user_id, nickname) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname`,
      [user_id, nickname || null]
    );
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    if (req.query.stats) {
      // Return all driver stats, joined with admin_users for nickname
      const { rows } = await query(`
        SELECT s.user_id, u.nickname, s.date, s.orders_delivered, s.profit, s.hours_worked, s.km_driven
        FROM driver_stats s
        LEFT JOIN admin_users u ON s.user_id = u.user_id
        ORDER BY s.date DESC, s.user_id
      `);
      res.status(200).json({ stats: rows });
      return;
    }
    const { rows } = await query('SELECT user_id, nickname, created_at FROM admin_users ORDER BY created_at DESC');
    res.status(200).json({ users: rows });
    return;
  }

  if (req.method === 'DELETE') {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    await query('DELETE FROM admin_users WHERE user_id = $1', [user_id]);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
} 