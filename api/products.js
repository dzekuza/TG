import { query } from './db.js';

const ADMIN_PASSWORD = process.env.MAIN_ADMIN_PASSWORD || 'mainadmin';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { rows } = await query('SELECT * FROM products ORDER BY id');
    res.status(200).json({ products: rows });
    return;
  }
  const password = req.body.password;
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method === 'POST') {
    const { name, price, image_url, available } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Missing name or price' });
    const { rows } = await query(
      'INSERT INTO products (name, price, image_url, available) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, image_url || null, available !== undefined ? available : true]
    );
    res.status(200).json({ product: rows[0] });
    return;
  }
  if (req.method === 'PUT') {
    const { id, name, price, image_url, available } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { rows } = await query(
      'UPDATE products SET name=$1, price=$2, image_url=$3, available=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, price, image_url || null, available !== undefined ? available : true, id]
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