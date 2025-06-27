import { query } from './db.js';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Set this in your .env or Vercel env

function parseLatLng(location) {
  try {
    if (typeof location === 'string') location = JSON.parse(location);
  } catch {}
  if (location.lat && location.lng) return [Number(location.lat), Number(location.lng)];
  if (location.manual && typeof location.manual === 'string') {
    const match = location.manual.match(/@([\d.\-]+),([\d.\-]+)/) || location.manual.match(/q=([\d.\-]+),([\d.\-]+)/);
    if (match) return [Number(match[1]), Number(match[2])];
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { order_ids, driver_location } = req.body;
  if (!order_ids || !driver_location) return res.status(400).json({ error: 'Missing order_ids or driver_location' });

  // Fetch order locations
  const { rows } = await query(
    `SELECT order_id, location FROM orders WHERE order_id = ANY($1)`,
    [order_ids]
  );
  const orders = rows.map(o => ({
    order_id: o.order_id,
    coords: parseLatLng(o.location)
  })).filter(o => o.coords);

  if (!orders.length) return res.status(400).json({ error: 'No valid order locations' });

  // Prepare waypoints for Google API
  const origin = `${driver_location.lat},${driver_location.lng}`;
  const waypoints = orders.map(o => o.coords.join(',')).join('|');

  // Google Directions API call (optimize:true for best order, live traffic)
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=optimize:true|${waypoints}&departure_time=now&key=${GOOGLE_MAPS_API_KEY}`;

  const gRes = await fetch(url);
  const gData = await gRes.json();

  if (!gData.routes || !gData.routes[0]) {
    return res.status(500).json({ error: 'No route found from Google' });
  }

  // Google's waypoint_order tells us the optimal order
  const orderSequence = gData.routes[0].waypoint_order.map(idx => orders[idx].order_id);

  // Extract ETAs for each leg
  const legs = gData.routes[0].legs;
  let etaMins = [];
  let total = 0;
  for (let i = 1; i < legs.length; i++) { // skip first leg (origin to first stop)
    total += Math.round(legs[i].duration_in_traffic.value / 60);
    etaMins.push(total);
  }

  // Return the optimal order and ETAs
  res.status(200).json({
    route: orderSequence,
    etas: etaMins // in minutes, per stop
  });
} 