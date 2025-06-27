import { query } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { rows } = await query('SELECT * FROM products ORDER BY id');
    res.status(200).json({ products: rows });
    return;
  }
  if (req.method === 'POST') {
    const { name, price_1, price_2, price_3, image_url, available } = req.body;
    if (!name || price_1 === undefined) return res.status(400).json({ error: 'Missing name or price_1' });
    const { rows } = await query(
      'INSERT INTO products (name, price_1, price_2, price_3, image_url, available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, price_1, price_2, price_3, image_url || null, available !== undefined ? available : true]
    );
    res.status(200).json({ product: rows[0] });
    return;
  }
  if (req.method === 'PUT') {
    const { id, name, price_1, price_2, price_3, image_url, available } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { rows } = await query(
      'UPDATE products SET name=$1, price_1=$2, price_2=$3, price_3=$4, image_url=$5, available=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, price_1, price_2, price_3, image_url || null, available !== undefined ? available : true, id]
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