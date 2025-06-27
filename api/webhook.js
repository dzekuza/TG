// api/webhook.js
import fs from 'fs';
import path from 'path';

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

export default async function handler(req, res) {
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
