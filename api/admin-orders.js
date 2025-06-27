// api/admin-orders.js
import { query } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // List all orders, newest first
    const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.status(200).json({ orders: rows });
    return;
  }
  if (req.method === 'POST') {
    const { order_id, status, comment, eta, driver_location } = req.body;
    // Update order in DB
    await query(
      `UPDATE orders SET status=$1, comment=$2, eta=$3, driver_location=$4, updated_at=NOW() WHERE order_id=$5`,
      [status, comment, eta, driver_location, order_id]
    );
    // Fetch user_id for notification
    const { rows } = await query('SELECT user_id FROM orders WHERE order_id=$1', [order_id]);
    if (rows.length) {
      const user_id = rows[0].user_id;
      // Notify customer via Telegram
      let msg = '';
      if (status === 'preparing') msg = '🍳 Your order is being prepared!';
      else if (status === 'arriving') msg = '🚗 Your order is on the way!';
      else if (status === 'arrived') msg = '✅ Your order has arrived!';
      else msg = `Order status updated: ${status}`;
      if (eta) msg += `\n⏱️ ETA: ${eta} min`;
      if (comment) msg += `\nAdmin comment: ${comment}`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user_id,
          text: msg
        })
      });
    }
    res.status(200).json({ ok: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
