// main.js
// --- CART LOGIC ---
const cart = {};
const menuCards = document.querySelectorAll('.menu-card');
menuCards.forEach(card => {
  const meal = card.getAttribute('data-meal');
  const price = parseFloat(card.getAttribute('data-price'));
  const emoji = card.getAttribute('data-emoji');
  // Defensive: Only add qty logic if controls exist
  const qtyBadge = card.querySelector('.qty-badge');
  const plusBtn = card.querySelector('.qty-btn.plus');
  const minusBtn = card.querySelector('.qty-btn.minus');
  const addBtn = card.querySelector('.add-btn');

  if (plusBtn && qtyBadge) {
    plusBtn.addEventListener('click', () => {
      cart[meal] = cart[meal] || { qty: 0, price, emoji };
      cart[meal].qty++;
      qtyBadge.textContent = cart[meal].qty;
    });
  }
  if (minusBtn && qtyBadge) {
    minusBtn.addEventListener('click', () => {
      if (cart[meal] && cart[meal].qty > 0) {
        cart[meal].qty--;
        qtyBadge.textContent = cart[meal].qty;
        if (cart[meal].qty === 0) delete cart[meal];
      }
    });
  }
  if (addBtn && qtyBadge) {
    addBtn.addEventListener('click', () => {
      cart[meal] = cart[meal] || { qty: 0, price, emoji };
      cart[meal].qty++;
      qtyBadge.textContent = cart[meal].qty;
    });
  }
});

// --- MULTISTEP ORDER MODAL LOGIC ---
const viewOrderBtn = document.getElementById('view-order-btn');
const orderModal = document.getElementById('order-modal');
const closeModalBtn = document.getElementById('close-modal');
const orderSummaryStep = document.getElementById('order-summary-step');
const orderComment = document.getElementById('order-comment');
const getLocationBtn = document.getElementById('get-location-btn');
const locationStatusModal = document.getElementById('location-status-modal');
const submitOrderBtn = document.getElementById('submit-order-btn');
const nextToCommentBtn = document.getElementById('next-to-comment');
const nextToLocationBtn = document.getElementById('next-to-location');
const backToSummaryBtn = document.getElementById('back-to-summary');
const backToCommentBtn = document.getElementById('back-to-comment');
const step1 = document.getElementById('order-step-1');
const step2 = document.getElementById('order-step-2');
const step3 = document.getElementById('order-step-3');

let userCoords = null;

function showStep(step) {
  [step1, step2, step3].forEach((el, i) => {
    el.classList.toggle('active', i === step);
  });
}

viewOrderBtn.addEventListener('click', () => {
  orderModal.style.display = 'flex';
  showStep(0);
  renderOrderSummaryStep();
});

function renderOrderSummaryStep() {
  let html = '';
  let total = 0;
  Object.entries(cart).forEach(([meal, { qty, price, emoji }]) => {
    if (qty > 0) {
      html += `<div class='order-item' data-meal='${meal}'>
        ${emoji} <b>${meal}</b>
        <div class='summary-qty-controls'>
          <button class='summary-qty-btn minus'>−</button>
          <span class='summary-qty-badge'>${qty}</span>
          <button class='summary-qty-btn plus'>+</button>
        </div>
        <div class='summary-prices'>
          <span class='summary-price'>1x = $${price.toFixed(2)}</span>
          <span class='summary-price'>${qty}x = $${(price * qty).toFixed(2)}</span>
        </div>
      </div>`;
      total += price * qty;
    }
  });
  if (!html) html = '<div class="order-item">No items selected.</div>';
  html += `<div class='order-total'>Total: <b>$${total.toFixed(2)}</b></div>`;
  orderSummaryStep.innerHTML = html;
  nextToCommentBtn.disabled = !Object.keys(cart).length;

  // Add event listeners for summary qty controls
  orderSummaryStep.querySelectorAll('.order-item').forEach(item => {
    const meal = item.getAttribute('data-meal');
    const minusBtn = item.querySelector('.summary-qty-btn.minus');
    const plusBtn = item.querySelector('.summary-qty-btn.plus');
    minusBtn.addEventListener('click', () => {
      if (cart[meal] && cart[meal].qty > 1) {
        cart[meal].qty--;
      } else {
        delete cart[meal];
      }
      renderOrderSummaryStep();
    });
    plusBtn.addEventListener('click', () => {
      cart[meal].qty++;
      renderOrderSummaryStep();
    });
  });
}

closeModalBtn.addEventListener('click', () => {
  orderModal.style.display = 'none';
});
nextToCommentBtn.addEventListener('click', () => showStep(1));
backToSummaryBtn.addEventListener('click', () => showStep(0));
nextToLocationBtn.addEventListener('click', () => showStep(2));
backToCommentBtn.addEventListener('click', () => showStep(1));

getLocationBtn.addEventListener('click', async () => {
  // If Telegram geolocation is not available, redirect to a map page or allow manual entry
  const mapUrl = 'https://www.google.com/maps'; // Or use a custom page for copying location
  window.open(mapUrl, '_blank');
  // Show manual entry field for location
  let manualField = document.getElementById('manual-location-field');
  if (!manualField) {
    manualField = document.createElement('input');
    manualField.type = 'text';
    manualField.id = 'manual-location-field';
    manualField.placeholder = 'Paste your location (lat,lng, address, or Google Maps link)';
    manualField.className = 'order-comment';
    locationStatusModal.parentNode.insertBefore(manualField, locationStatusModal.nextSibling);
  }
  manualField.style.display = 'block';
  manualField.addEventListener('input', () => {
    let val = manualField.value.trim();
    // If it's a Google Maps link, treat as manual string
    if (val.startsWith('http')) {
      userCoords = { manual: val };
      locationStatusModal.textContent = `📍 ${val}`;
    } else if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(val)) {
      // If it's lat,lng
      const [lat, lng] = val.split(',').map(Number);
      userCoords = { lat, lng };
      locationStatusModal.textContent = `📍 ${lat}, ${lng}`;
    } else {
      userCoords = { manual: val };
      locationStatusModal.textContent = val ? `📍 ${val}` : '';
    }
  });
});

let currentOrderId = null;
let pollInterval = null;

submitOrderBtn.addEventListener('click', async () => {
  if (!Object.keys(cart).length) {
    alert('Please add at least one item.');
    return;
  }
  // Accept manual location as string if geolocation is not available
  let locationToSend = userCoords;
  // Accept if userCoords is a string and not empty
  if (typeof userCoords === 'string' && userCoords.trim() !== '') {
    locationToSend = { manual: userCoords.trim() };
  }
  // Accept if userCoords is an object with lat/lng, or manual string
  if (!locationToSend || (typeof locationToSend === 'object' && !locationToSend.lat && !locationToSend.manual)) {
    alert('Please add your location.');
    return;
  }
  const tgUser = Telegram.WebApp.initDataUnsafe.user;
  const comment = orderComment.value;
  const res = await fetch("https://tg-gamma-ten.vercel.app/api/order", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meal: Object.entries(cart).map(([meal, { qty }]) => `${meal} x${qty}`).join(', '),
      user: tgUser,
      location: locationToSend,
      comment
    })
  });
  const data = await res.json();
  if (data.orderId) {
    currentOrderId = data.orderId;
    pollOrderStatus();
  }
  Telegram.WebApp.close();
});

function pollOrderStatus() {
  if (!currentOrderId) return;
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    const res = await fetch(`/order-status/${currentOrderId}`);
    const status = await res.json();
    updateOrderStatusUI(status);
    if (status.status === 'arrived') clearInterval(pollInterval);
  }, 5000);
}

// --- NAVIGATION LOGIC ---
const navNewOrder = document.getElementById('nav-new-order');
const navPastOrders = document.getElementById('nav-past-orders');
const orderSection = document.getElementById('order-section');
const pastOrdersSection = document.getElementById('past-orders-section');

navNewOrder.addEventListener('click', () => {
  navNewOrder.classList.add('active');
  navPastOrders.classList.remove('active');
  orderSection.style.display = '';
  pastOrdersSection.style.display = 'none';
});
navPastOrders.addEventListener('click', () => {
  navPastOrders.classList.add('active');
  navNewOrder.classList.remove('active');
  // Open dedicated past orders page in a new tab
  window.open('./past-orders.html', '_blank');
});

// --- ORDER STATUS UI/UPDATES ---
function updateOrderStatusUI(status) {
  if (!orderSection) return;
  orderSection.innerHTML = '';
  if (!status || status.status === 'pending') {
    orderSection.innerHTML = '';
    return;
  }
  if (status.status === 'eta') {
    orderSection.innerHTML += `<div class="order-update eta">⏱️ Estimated arrival: <b>${status.eta} min</b></div>`;
  }
  if (status.status === 'arrived') {
    orderSection.innerHTML += '<div class="order-update arrived">🚗 Your order has arrived!</div>';
  }
  if (status.driverLocation) {
    orderSection.innerHTML += `<div class="order-update driver-location">🚗 Driver shared location: <a href='https://www.google.com/maps?q=${status.driverLocation.latitude},${status.driverLocation.longitude}' target='_blank'>View on map</a></div>`;
  }
}

// --- PAST ORDERS (demo: fetch from localStorage) ---
async function renderPastOrders() {
  const tgUser = Telegram.WebApp.initDataUnsafe.user;
  if (!tgUser) {
    pastOrdersSection.innerHTML = '<div class="order-history-item">Please log in to view past orders.</div>';
    return;
  }
  pastOrdersSection.innerHTML = '<div class="order-history-item">Loading...</div>';
  try {
    const res = await fetch(`/api/orders?user_id=${tgUser.id}`);
    const data = await res.json();
    if (!data.orders || !data.orders.length) {
      pastOrdersSection.innerHTML = '<div class="order-history-item">No past orders yet.</div>';
      return;
    }
    pastOrdersSection.innerHTML = data.orders.map(order => {
      let items = '';
      try {
        const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        items = Array.isArray(parsed)
          ? parsed.map(i => `${i.emoji ? i.emoji + ' ' : ''}${i.name || i.meal || ''}${i.qty ? ' x' + i.qty : ''}`).join(', ')
          : order.items;
      } catch { items = order.items; }
      let status = order.status ? `<div>Status: <b>${order.status}</b></div>` : '';
      let eta = order.eta ? `<div>ETA: <b>${order.eta} min</b></div>` : '';
      let created = order.created_at ? `<div class='order-time'>${new Date(order.created_at).toLocaleString()}</div>` : '';
      return `<div class='order-history-item'>
        <div><b>Order ID:</b> ${order.order_id}</div>
        <div><b>Items:</b> ${items}</div>
        <div><b>Comment:</b> ${order.comment || '-'}</div>
        ${status}
        ${eta}
        ${created}
      </div>`;
    }).join('');
  } catch (e) {
    pastOrdersSection.innerHTML = '<div class="order-history-item">Failed to load past orders.</div>';
  }
}

// Telegram WebApp initialization
Telegram.WebApp.ready();
