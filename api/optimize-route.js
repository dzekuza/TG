import { query } from './db.js';

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

function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { order_ids, driver_location } = req.body;
  if (!order_ids || !driver_location) return res.status(400).json({ error: 'Missing order_ids or driver_location' });
  const { rows } = await query(
    `SELECT order_id, location FROM orders WHERE order_id = ANY($1)`,
    [order_ids]
  );
  const orders = rows.map(o => ({
    order_id: o.order_id,
    coords: parseLatLng(o.location)
  })).filter(o => o.coords);
  let route = [];
  let current = [Number(driver_location.lat), Number(driver_location.lng)];
  let remaining = [...orders];
  while (remaining.length) {
    let minIdx = 0, minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversine(current, remaining[i].coords);
      if (dist < minDist) { minDist = dist; minIdx = i; }
    }
    route.push(remaining[minIdx].order_id);
    current = remaining[minIdx].coords;
    remaining.splice(minIdx, 1);
  }
  res.status(200).json({ route });
} 