// public/admin.js
async function fetchOrders() {
  const res = await fetch('/api/admin-orders');
  const data = await res.json();
  return data.orders || [];
}

function statusOptions(current) {
  const all = ['pending','preparing','arriving','arrived'];
  return all.map(s => `<option value="${s}"${s===current?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
}

function renderOrders(orders) {
  const section = document.getElementById('admin-orders-section');
  if (!orders.length) {
    section.innerHTML = '<div class="order-history-item">No orders found.</div>';
    return;
  }
  section.innerHTML = orders.map(order => {
    let items = '';
    try {
      const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      items = Array.isArray(parsed)
        ? parsed.map(i => `<span style='font-size:1.2em;'>${i.emoji ? i.emoji + ' ' : ''}</span><b>${i.name || i.meal || ''}</b>${i.qty ? ' <span class=\'qty-badge\'>' + i.qty + '</span>' : ''}`).join(' ')
        : order.items;
    } catch { items = order.items; }
    return `<form class='order-history-item' data-order-id='${order.order_id}'>
      <div><b>Order ID:</b> ${order.order_id}</div>
      <div><b>User:</b> ${order.user_id}</div>
      <div><b>Items:</b> ${items}</div>
      <div><b>Comment:</b> <input name='comment' value='${order.comment||''}' style='width:90%;background:#23272f;color:#fff;border:1px solid #444;border-radius:6px;padding:2px 6px;'></div>
      <div><b>Status:</b> <select name='status'>${statusOptions(order.status)}</select></div>
      <div><b>ETA:</b> <input name='eta' value='${order.eta||''}' style='width:60px;background:#23272f;color:#fff;border:1px solid #444;border-radius:6px;padding:2px 6px;'></div>
      <div><b>Driver Location:</b> <input name='driver_location' value='${order.driver_location||''}' style='width:90%;background:#23272f;color:#fff;border:1px solid #444;border-radius:6px;padding:2px 6px;'></div>
      <div class='order-time'>${order.created_at ? new Date(order.created_at).toLocaleString() : ''}</div>
      <button type='submit' class='order-btn' style='margin-top:8px;'>Update</button>
    </form>`;
  }).join('');
  // Add listeners
  document.querySelectorAll('.order-history-item').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const orderId = form.getAttribute('data-order-id');
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      await fetch(`/api/admin-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, ...body })
      });
      // Refresh after update
      renderOrders(await fetchOrders());
    });
  });
}

fetchOrders().then(renderOrders);
