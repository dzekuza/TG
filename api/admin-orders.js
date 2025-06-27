// api/admin-orders.js
import { query } from './db.js';

export default async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'supersecret';
  if (req.method === 'GET') {
    const { password } = req.query;
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // List all orders, newest first
    const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    // Fetch admin notes for all user_ids
    const userIds = [...new Set(rows.map(r => r.user_id))];
    let notes = {};
    if (userIds.length) {
      const { rows: noteRows } = await query(
        `SELECT user_id, note FROM admin_user_notes WHERE user_id = ANY($1)`,
        [userIds]
      );
      notes = Object.fromEntries(noteRows.map(r => [r.user_id, r.note]));
    }
    // Attach note to each order
    const ordersWithNotes = rows.map(order => ({ ...order, admin_note: notes[order.user_id] || '' }));
    res.status(200).json({ orders: ordersWithNotes });
    return;
  }
  if (req.method === 'POST') {
    const { order_id, status, comment, eta, driver_location, admin_note, user_id } = req.body;
    // Update order in DB
    await query(
      `UPDATE orders SET status=$1, comment=$2, eta=$3, driver_location=$4, updated_at=NOW() WHERE order_id=$5`,
      [status, comment, eta, driver_location, order_id]
    );
    // If admin_note and user_id provided, upsert note
    if (admin_note && user_id) {
      await query(
        `INSERT INTO admin_user_notes (user_id, note) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET note = EXCLUDED.note`,
        [user_id, admin_note]
      );
    }
    // Fetch user_id for notification
    const { rows } = await query('SELECT user_id FROM orders WHERE order_id=$1', [order_id]);
    if (rows.length) {
      const notify_user_id = rows[0].user_id;
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
          chat_id: notify_user_id,
          text: msg
        })
      });
    }
    res.status(200).json({ ok: true });
    return;
  }
  if (req.method === 'DELETE') {
    const { order_id, password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!order_id) {
      res.status(400).json({ error: 'Missing order_id' });
      return;
    }
    await query('DELETE FROM orders WHERE order_id = $1', [order_id]);
    res.status(200).json({ ok: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
