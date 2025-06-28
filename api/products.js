import { query } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { rows } = await query('SELECT * FROM products ORDER BY id');
    res.status(200).json({ products: rows });
    return;
  }
  if (req.method === 'POST') {
    const { name, price_ranges, image_url, available } = req.body;
    if (!name || !Array.isArray(price_ranges) || price_ranges.length === 0) {
      return res.status(400).json({ error: 'Missing name or price_ranges' });
    }
    const { rows } = await query(
      'INSERT INTO products (name, price_ranges, image_url, available) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, JSON.stringify(price_ranges), image_url || null, available !== undefined ? available : true]
    );
    res.status(200).json({ product: rows[0] });
    return;
  }
  if (req.method === 'PUT') {
    const { id, name, price_ranges, image_url, available } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    if (!name || !Array.isArray(price_ranges) || price_ranges.length === 0) {
      return res.status(400).json({ error: 'Missing name or price_ranges' });
    }
    const { rows } = await query(
      'UPDATE products SET name=$1, price_ranges=$2, image_url=$3, available=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, JSON.stringify(price_ranges), image_url || null, available !== undefined ? available : true, id]
    );
    res.status(200).json({ product: rows[0] });
    return;
  }
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await query('DELETE FROM products WHERE id=$1', [id]);
    res.status(200).json({ ok: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
} 