// api/webhook.js
import { query } from './db.js';

async function updateOrderStatus(orderId, fields) {
  const setClause = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = [orderId, ...Object.values(fields)];
  await query(
    `UPDATE orders SET ${setClause}, updated_at = NOW() WHERE order_id = $1`,
    values
  );
}
async function getOrder(orderId) {
  const { rows } = await query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
  return rows[0] || null;
}

// Helper to check if user is admin
async function isAdmin(userId) {
  if (String(userId) === '406266417') return true;
  const { rows } = await query('SELECT 1 FROM admin_users WHERE user_id = $1', [userId]);
  return rows.length > 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body;
  // Check admin for callback_query
  if (body.callback_query) {
    const cb = body.callback_query;
    const fromId = cb.from && cb.from.id;
    if (!await isAdmin(fromId)) {
      res.send({ ok: true });
      return;
    }
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
      const order = await getOrder(orderId);
      if (order) {
        await updateOrderStatus(orderId, { status: 'eta', eta: eta.toString() });
        // After updating order status in webhook, also update the database with the new status and ETA
        if (order) {
          // Update order in database with new status and ETA
          await query(
            'UPDATE orders SET status = $1, eta = $2, updated_at = NOW() WHERE order_id = $3',
            ['eta', eta.toString(), orderId]
          );
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
              chat_id: order.user_id,
              text: `🚗 Your order is on the way! Estimated arrival: ${eta} min.`
            })
          });
        }
      }
    } else if (data.startsWith('arrived_')) {
      const [, orderId] = data.split('_');
      const order = await getOrder(orderId);
      if (order) {
        await updateOrderStatus(orderId, { status: 'arrived' });
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
            chat_id: order.user_id,
            text: `✅ Your order has arrived!`
          })
        });
      }
    } else if (data.startsWith('set_status_preparing_')) {
      const orderId = data.replace('set_status_preparing_', '');
      await updateOrderStatus(orderId, { status: 'preparing' });
      // Update admin message with next button: Arriving
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.ADMIN_CHAT_ID,
          message_id: cb.message.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Set Arriving', callback_data: `set_status_arriving_${orderId}` }
            ]]
          }
        })
      });
      // Notify customer
      const order = await getOrder(orderId);
      if (order) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.user_id,
            text: '🍳 Your order is being prepared!'
          })
        });
      }
    } else if (data.startsWith('set_status_arriving_')) {
      const orderId = data.replace('set_status_arriving_', '');
      await updateOrderStatus(orderId, { status: 'arriving' });
      // Update admin message with next button: Arrived
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.ADMIN_CHAT_ID,
          message_id: cb.message.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Set Arrived', callback_data: `set_status_arrived_${orderId}` }
            ]]
          }
        })
      });
      // Notify customer
      const order = await getOrder(orderId);
      if (order) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.user_id,
            text: '🚗 Your order is on the way!'
          })
        });
      }
    } else if (data.startsWith('set_status_arrived_')) {
      const orderId = data.replace('set_status_arrived_', '');
      await updateOrderStatus(orderId, { status: 'arrived' });
      // Remove inline keyboard
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.ADMIN_CHAT_ID,
          message_id: cb.message.message_id,
          reply_markup: { inline_keyboard: [] }
        })
      });
      // Notify customer
      const order = await getOrder(orderId);
      if (order) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.user_id,
            text: '✅ Your order has arrived!'
          })
        });
      }
    }
    res.send({ ok: true });
    return;
  }
  // Check admin for normal message
  if (body.message && body.message.from && body.message.from.id) {
    const fromId = body.message.from.id;
    if (!await isAdmin(fromId)) {
      res.send({ ok: true });
      return;
    }
  }
  // Handle location message from driver
  if (body.message && body.message.location && body.message.chat && body.message.chat.id == process.env.ADMIN_CHAT_ID) {
    // Find orderId by reply_to_message or fallback to latest pending/eta order
    let foundOrderId = null;
    if (body.message.reply_to_message && body.message.reply_to_message.text) {
      const text = body.message.reply_to_message.text;
      const match = text.match(/Order ID: (\w+_\d+)/);
      if (match) {
        foundOrderId = match[1];
      }
    }
    if (!foundOrderId) {
      // Fallback: find latest pending/eta order
      const { rows } = await query(
        `SELECT order_id FROM orders WHERE status IN ('pending','eta') ORDER BY created_at DESC LIMIT 1`
      );
      if (rows.length) foundOrderId = rows[0].order_id;
    }
    if (foundOrderId) {
      // Update driver location in DB
      await updateOrderStatus(foundOrderId, { status: 'driver_location', driver_location: JSON.stringify(body.message.location) });
      // Fetch order for customer info
      const order = await getOrder(foundOrderId);
      // Calculate ETA if customer location is available
      let eta = null;
      if (order && order.location) {
        let customerLocation;
        try {
          customerLocation = JSON.parse(order.location);
        } catch { customerLocation = null; }
        if (customerLocation && customerLocation.lat && customerLocation.lng) {
          const driverLocation = body.message.location;
          const R = 6371;
          const dLat = (customerLocation.lat-driverLocation.latitude)*Math.PI/180;
          const dLon = (customerLocation.lng-driverLocation.longitude)*Math.PI/180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(driverLocation.latitude*Math.PI/180)*Math.cos(customerLocation.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
          const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          eta = Math.round((distance/40)*60);
          if (eta < 1) eta = 1;
          await updateOrderStatus(foundOrderId, { eta: eta.toString() });
        }
      }
      // Notify customer with driver location and ETA
      if (order) {
        let msg = `🚗 Driver shared location: https://www.google.com/maps?q=${body.message.location.latitude},${body.message.location.longitude}`;
        if (eta) msg += `\n⏱️ Estimated arrival: ${eta} min`;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.user_id,
            text: msg
          })
        });
        // Confirm to driver
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.ADMIN_CHAT_ID,
            text: `Location shared with customer for Order ID: ${foundOrderId}.` + (eta ? ` ETA: ${eta} min.` : '')
          })
        });
      }
    }
    res.send({ ok: true });
    return;
  }
  res.send({ ok: true });
}
