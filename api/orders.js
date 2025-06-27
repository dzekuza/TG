// api/orders.js
import { query } from './db.js';

export default async function handler(req, res) {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  try {
    const { rows } = await query(
      'SELECT order_id, items, comment, location, status, eta, driver_location, created_at, updated_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [user_id]
    );
    res.status(200).json({ orders: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
