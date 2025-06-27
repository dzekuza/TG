// api/order.js
import fs from 'fs';
import path from 'path';
import * as db from './db.js';
import { v4 as uuidv4 } from 'uuid';

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
  const { meal, user, location, comment } = req.body;
  const order_id = `${user.id}_${Date.now()}`;
  const items = Array.isArray(meal) ? meal : [{ name: meal, qty: 1 }];
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
\nOrder ID: ${orderId}
Driver: Please press a button below to update order status or reply to this message with your location.
  `;

  // Inline keyboard to request location from admin
  const replyMarkup = {
    inline_keyboard: [[
      {
        text: 'Share Your Location',
        request_location: true,
        callback_data: `share_location_${user?.id}`
      }
    ]]
  };

  try {
    // Insert order into database
    await db.query(
      `INSERT INTO orders (order_id, user_id, items, comment, location, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [order_id, user_id, JSON.stringify(items), comment || '', JSON.stringify(location), status]
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