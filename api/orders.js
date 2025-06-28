// api/orders.js
import { query } from './db.js';

export default async function handler(req, res) {
  console.log('Received /api/orders request:', req.method, req.query);
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    if (req.method === 'DELETE') {
      const { order_id } = req.body;
      if (!order_id) return res.status(400).json({ error: 'Missing order_id' });
      // Soft delete: set deleted=true for this order and user
      await query('UPDATE orders SET deleted = TRUE WHERE order_id = $1 AND user_id = $2', [order_id, user_id]);
      res.status(200).json({ ok: true });
      return;
    }

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
