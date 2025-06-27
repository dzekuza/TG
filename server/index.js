// server/index.js
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Helper to store and retrieve order status (for demo, use a JSON file)
const ORDERS_FILE = path.join(process.cwd(), 'orders.json');
function saveOrderStatus(orderId, status) {
  let orders = {};
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  }
  orders[orderId] = status;
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders));
}
function getOrderStatus(orderId) {
  if (!fs.existsSync(ORDERS_FILE)) return null;
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  return orders[orderId] || null;
}

app.post('/order', async (req, res) => {
  const { meal, user, location, comment } = req.body;
  const orderId = `${user.id}_${Date.now()}`;

  const msg = `\n🍽️ New Food Order!\n👤 User: ${user?.first_name || 'Unknown'} (@${user?.username || '-'})\n🧾 Order: ${meal}\n📍 Location: https://www.google.com/maps?q=${location.lat},${location.lng}\n📝 Comment: ${comment || '-'}\n\nDriver: Please press a button below to update order status.`;

  // Inline keyboard for driver: Calculate ETA, Arrived
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Calculate ETA', callback_data: `calc_eta_${orderId}_${location.lat}_${location.lng}` }
      ],
      [
        { text: 'Arrived', callback_data: `arrived_${orderId}` }
      ]
    ]
  };

  // Save initial order status
  saveOrderStatus(orderId, { status: 'pending', userId: user.id, customerChatId: user.id, customerLocation: location });

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: msg,
      reply_markup: replyMarkup
    })
  });

  res.send({ success: true, orderId });
});

// Telegram webhook for driver actions
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.callback_query) {
    const cb = body.callback_query;
    const data = cb.data;
    if (data.startsWith('calc_eta_')) {
      // Parse orderId and customer location
      const [, orderId, lat, lng] = data.split('_');
      // Simulate driver location (for demo, use fixed coords)
      const driverLocation = { lat: 44.7866, lng: 20.4489 }; // Belgrade
      const customerLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
      // Calculate ETA
      const R = 6371;
      const dLat = (customerLocation.lat-driverLocation.lat)*Math.PI/180;
      const dLon = (customerLocation.lng-driverLocation.lng)*Math.PI/180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(driverLocation.lat*Math.PI/180)*Math.cos(customerLocation.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
      const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      let eta = Math.round((distance/40)*60); // minutes
      if (eta < 1) eta = 1;
      // Save ETA
      const order = getOrderStatus(orderId);
      if (order) {
        order.status = 'eta';
        order.eta = eta;
        saveOrderStatus(orderId, order);
        // Notify driver
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `ETA calculated: ${eta} min. Press 'Arrived' when you reach the customer.`
          })
        });
        // Notify customer
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `Order marked as arrived.`
          })
        });
        // Notify customer
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
});

// Add endpoint for polling order status (for frontend live updates)
app.get('/order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const status = getOrderStatus(orderId);
  res.json(status || { status: 'not_found' });
});

app.listen(3000, () => console.log('Server running on port 3000'));