import { query } from './db.js';

export default async function handler(req, res) {
  const { period } = req.query;
  let groupBy = 'DATE(o.created_at)';
  if (period === 'week') groupBy = `DATE_TRUNC('week', o.created_at)`;
  if (period === 'month') groupBy = `DATE_TRUNC('month', o.created_at)`;
  // Assume order.items is a JSON array with {id, qty}
  const sql = `
    SELECT p.id as product_id, p.name, SUM((item->>'qty')::int) as count, ${groupBy} as period
    FROM orders o
    CROSS JOIN LATERAL jsonb_array_elements(o.items) as item
    JOIN products p ON (item->>'id')::int = p.id
    GROUP BY p.id, p.name, period
    ORDER BY period DESC, count DESC
    LIMIT 100
  `;
  const { rows } = await query(sql);
  res.status(200).json({ stats: rows });
} 