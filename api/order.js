// api/order.js
import fs from 'fs';
import path from 'path';
import { query } from './db.js';
import { v4 as uuidv4 } from 'uuid';

// Helper to calculate total from items
function calculateTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + Number(item.price || 0), 0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check required env vars
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or ADMIN_CHAT_ID in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration: missing Telegram credentials.' });
  }

  console.log('Incoming order request:', req.body);
  const { meal, user, location, comment, items, total } = req.body;
  const order_id = `${user.id}_${Date.now()}`;
  let orderTotal = total;
  let parsedItems = items;
  if (!orderTotal) {
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
      orderTotal = calculateTotal(parsedItems);
    } catch { orderTotal = 0; }
  }
  const user_id = user.id;
  const status = 'pending';

  console.log('TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'Loaded' : 'Missing');
  console.log('ADMIN_CHAT_ID:', ADMIN_CHAT_ID ? 'Loaded' : 'Missing');

  const msg = `
🍽️ New Food Order!
👤 User: ${user?.first_name || 'Unknown'} (@${user?.username || '-'})
🧾 Order: ${meal}
📍 Location: ${location.lat && location.lng ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : (location.manual || '-') }
📝 Comment: ${comment || '-'}
\nOrder ID: ${order_id}
Driver: Please press a button below to update order status or reply to this message with your location.
  `;

  // Inline keyboard for admin: status workflow
  const replyMarkup = {
    inline_keyboard: [[
      { text: 'Set Preparing', callback_data: `set_status_preparing_${order_id}` }
    ]]
  };

  try {
    // Insert order into database
    await query(
      `INSERT INTO orders (order_id, user_id, items, comment, location, status, created_at, updated_at, total)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)`,
      [order_id, user_id, JSON.stringify(parsedItems), comment || '', JSON.stringify(location), status, orderTotal]
    );

    // Send order message to admin group with location request button
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: msg + '\n\nAdmin: Please share your location to update the customer.',
        reply_markup: replyMarkup
      })
    });
    const tgData = await tgRes.json();
    console.log('Telegram API response:', tgData);
    res.status(200).json({ success: true, orderId: order_id });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Vercel API route for webhook
export async function webhookHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body;
  if (body.callback_query) {
    const cb = body.callback_query;
    const data = cb.data;
    if (data.startsWith('calc_eta_')) {
      const [, orderId, lat, lng] = data.split('_');
      const driverLocation = { lat: 44.7866, lng: 20.4489 }; // Belgrade
      const customerLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
      const R = 6371;
      const dLat = (customerLocation.lat-driverLocation.lat)*Math.PI/180;
      const dLon = (customerLocation.lng-driverLocation.lng)*Math.PI/180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(driverLocation.lat*Math.PI/180)*Math.cos(customerLocation.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
      const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      let eta = Math.round((distance/40)*60); // minutes
      if (eta < 1) eta = 1;
      const order = getOrderStatus(orderId);
      if (order) {
        order.status = 'eta';
        order.eta = eta;
        saveOrderStatus(orderId, order);
        // Notify driver
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.ADMIN_CHAT_ID,
            text: `ETA calculated: ${eta} min. Press 'Arrived' when you reach the customer.`
          })
        });
        // Notify customer
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.customerChatId,
            text: `🚗 Your order is on the way! Estimated arrival: ${eta} min.`
          })
        });
      }
    } else if (data.startsWith('arrived_')) {
      const [, orderId] = data.split('_');
      const order = getOrderStatus(orderId);
      if (order) {
        order.status = 'arrived';
        saveOrderStatus(orderId, order);
        // Notify driver
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.ADMIN_CHAT_ID,
            text: `Order marked as arrived.`
          })
        });
        // Notify customer
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.customerChatId,
            text: `✅ Your order has arrived!`
          })
        });
      }
    }
    res.send({ ok: true });
    return;
  }
  res.send({ ok: true });
}