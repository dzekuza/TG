// api/orders.js
import { query } from './db.js';

export default async function handler(req, res) {
  console.log('Received /api/orders request:', req.method, req.query);
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    const { rows } = await query(
      'SELECT order_id, items, comment, location, status, eta, driver_location, created_at, updated_at, total FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [user_id]
    );
    // Fallback for missing total
    const orders = rows.map(o => ({ ...o, total: o.total !== undefined && o.total !== null ? o.total : '0.00' }));
    res.status(200).json({ orders });
  } catch (err) {
    console.error('Error in /api/orders:', err);
    res.status(500).json({ error: err.message });
  }
}
