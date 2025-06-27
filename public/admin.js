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
    return `<form class='order-history-item admin-order-card' data-order-id='${order.order_id}'>
      <div class='order-row'><span class='order-label'>Order ID:</span> <span class='order-value'>${order.order_id}</span></div>
      <div class='order-row'><span class='order-label'>User:</span> <span class='order-value'>${order.user_id}</span></div>
      <div class='order-row'><span class='order-label'>Items:</span> <span class='order-value'>${items}</span></div>
      <div class='order-row'><span class='order-label'>Comment:</span> <input name='comment' value='${order.comment||''}' class='admin-input'></div>
      <div class='order-row'><span class='order-label'>Status:</span> <select name='status' class='admin-select'>${statusOptions(order.status)}</select></div>
      <div class='order-row'><span class='order-label'>ETA:</span> <input name='eta' value='${order.eta||''}' class='admin-input eta-input'>
        <span class='eta-quick-btns'>
          <button type='button' class='eta-btn' data-eta='5'>5 min</button>
          <button type='button' class='eta-btn' data-eta='10'>10 min</button>
          <button type='button' class='eta-btn' data-eta='arriving'>Arriving</button>
        </span>
      </div>
      <div class='order-row'><span class='order-label'>Driver Location:</span> <input name='driver_location' value='${order.driver_location||''}' class='admin-input'></div>
      <div class='order-time'>${order.created_at ? new Date(order.created_at).toLocaleString() : ''}</div>
      <button type='submit' class='order-btn admin-update-btn'>Update</button>
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
    // ETA quick buttons
    form.querySelectorAll('.eta-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const etaInput = form.querySelector('.eta-input');
        if (btn.dataset.eta === 'arriving') etaInput.value = 'Arriving';
        else etaInput.value = btn.dataset.eta;
      });
    });
  });
}

// Add admin navigation bar to admin.html
const nav = document.createElement('nav');
nav.className = 'admin-nav';
nav.innerHTML = `
  <button class="admin-nav-btn active" id="nav-orders">
    <span class="nav-icon">📦</span>
    <span class="nav-label">Orders</span>
  </button>
  <button class="admin-nav-btn" id="nav-search">
    <span class="nav-icon">🔍</span>
    <span class="nav-label">Search</span>
  </button>
  <button class="admin-nav-btn" id="nav-settings">
    <span class="nav-icon">⚙️</span>
    <span class="nav-label">Settings</span>
  </button>
`;
document.body.appendChild(nav);
// Navigation logic (future expansion)
[...document.querySelectorAll('.admin-nav-btn')].forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Add section switching logic here if needed
  });
});

fetchOrders().then(renderOrders);
