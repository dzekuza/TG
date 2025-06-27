// server/index.js
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../api/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Database helper functions
async function saveOrderStatus(orderId, orderData) {
  try {
    const { status, userId, customerChatId, customerLocation, items, comment } = orderData;
    
    await query(`
      INSERT INTO orders (order_id, user_id, items, comment, location, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (order_id) 
      DO UPDATE SET 
        status = $6,
        comment = $4,
        updated_at = NOW()
    `, [
      orderId,
      userId,
      JSON.stringify(items),
      comment || null,
      JSON.stringify(customerLocation),
      status
    ]);
  } catch (error) {
    console.error('Error saving order to database:', error);
    throw error;
  }
}

async function getOrderStatus(orderId) {
  try {
    const result = await query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting order from database:', error);
    return null;
  }
}

async function updateOrderStatus(orderId, updates) {
  try {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [orderId, ...Object.values(updates)];
    
    await query(`
      UPDATE orders 
      SET ${setClause}, updated_at = NOW()
      WHERE order_id = $1
    `, values);
  } catch (error) {
    console.error('Error updating order in database:', error);
    throw error;
  }
}

// API Routes
app.post('/api/order', async (req, res) => {
  const { meal, user, location, comment } = req.body;
  const orderId = `${user.id}_${Date.now()}`;

  const msg = `\n🍽️ New Food Order!\n👤 User: ${user?.first_name || 'Unknown'} (@${user?.username || '-'})\n🧾 Order: ${meal}\n📍 Location: ${location.lat && location.lng ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : (location.manual || '-') }\n📝 Comment: ${comment || '-'}\n\nOrder ID: ${orderId}\nDriver: Please press a button below to update order status or reply to this message with your location.`;

  // Inline keyboard for admin: status workflow
  const replyMarkup = {
    inline_keyboard: [[
      { text: 'Set Preparing', callback_data: `set_status_preparing_${orderId}` }
    ]]
  };

  try {
    // Save initial order status to database
    await saveOrderStatus(orderId, { 
      status: 'pending', 
      userId: user.id, 
      customerChatId: user.id, 
      customerLocation: location,
      items: meal,
      comment: comment
    });

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: msg + '\n\nAdmin: Please share your location to update the customer.',
        reply_markup: replyMarkup
      })
    });
    res.send({ success: true, orderId });
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).send({ success: false, error: 'Failed to process order' });
  }
});

// Telegram webhook for driver actions
app.post('/api/webhook', async (req, res) => {
  const body = req.body;
  if (body.callback_query) {
    const cb = body.callback_query;
    const data = cb.data;
    
    if (data.startsWith('set_status_')) {
      const status = data.replace('set_status_', '').split('_')[0];
      const orderId = data.split('_').slice(2).join('_');
      
      try {
        const order = await getOrderStatus(orderId);
        if (order) {
          await updateOrderStatus(orderId, { status });
          
          // Notify customer
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: order.user_id,
                text: `Order status updated: ${status}`
              })
            });
          } catch (error) {
            console.error('Error notifying customer:', error);
          }
        }
      } catch (error) {
        console.error('Error updating order status:', error);
      }
    }
    res.send({ ok: true });
    return;
  }
  res.send({ ok: true });
});

// Add endpoint for polling order status (for frontend live updates)
app.get('/api/order-status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const status = await getOrderStatus(orderId);
    res.json(status || { status: 'not_found' });
  } catch (error) {
    console.error('Error getting order status:', error);
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

// Get orders for a user
app.get('/api/orders', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    const result = await query(`
      SELECT 
        order_id,
        user_id,
        items,
        status,
        comment,
        location,
        eta,
        created_at,
        updated_at
      FROM orders 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [user_id]);
    
    const orders = result.rows.map(row => ({
      order_id: row.order_id,
      user_id: row.user_id,
      items: typeof row.items === 'string' ? row.items : JSON.stringify(row.items),
      status: row.status,
      comment: row.comment,
      location: typeof row.location === 'string' ? row.location : JSON.stringify(row.location),
      eta: row.eta,
      created_at: row.created_at,
      total: '30.97' // You can calculate this from items if needed
    }));
    
    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin orders endpoint
app.get('/api/admin-orders', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        order_id,
        user_id,
        items,
        status,
        comment,
        location,
        eta,
        created_at,
        updated_at
      FROM orders 
      ORDER BY created_at DESC
    `);
    
    const orders = result.rows.map(row => ({
      order_id: row.order_id,
      user_id: row.user_id,
      items: typeof row.items === 'string' ? row.items : JSON.stringify(row.items),
      status: row.status,
      comment: row.comment,
      location: typeof row.location === 'string' ? row.location : JSON.stringify(row.location),
      eta: row.eta,
      created_at: row.created_at,
      total: '30.97' // You can calculate this from items if needed
    }));
    
    res.json({ orders });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/admin-orders', async (req, res) => {
  const { order_id, status, comment, eta, driver_location } = req.body;
  
  try {
    // Update order status in database
    const order = await getOrderStatus(order_id);
    if (order) {
      const updates = { status };
      if (comment) updates.comment = comment;
      if (eta) updates.eta = eta;
      if (driver_location) updates.driver_location = driver_location;
      
      await updateOrderStatus(order_id, updates);
      
      // Notify customer via Telegram
      let msg = '';
      if (status === 'preparing') msg = '🍳 Your order is being prepared!';
      else if (status === 'arriving') msg = '🚗 Your order is on the way!';
      else if (status === 'arrived') msg = '✅ Your order has arrived!';
      else msg = `Order status updated: ${status}`;
      
      if (eta) msg += `\n⏱️ ETA: ${eta} min`;
      if (comment) msg += `\nAdmin comment: ${comment}`;
      
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.user_id,
            text: msg
          })
        });
      } catch (error) {
        console.error('Error notifying customer:', error);
      }
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(3000, () => console.log('Server running on port 3000'));