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
  // Render summary
  let html = '';
  let total = 0;
  Object.entries(cart).forEach(([meal, { qty, price, emoji }]) => {
    if (qty > 0) {
      html += `<div class='order-item'>${emoji} <b>${meal}</b> <span class='qty-x'>${qty}x</span> <span class='order-price'>$${(price * qty).toFixed(2)}</span></div>`;
      total += price * qty;
    }
  });
  if (!html) html = '<div class="order-item">No items selected.</div>';
  html += `<div class='order-total'>Total: <b>$${total.toFixed(2)}</b></div>`;
  orderSummaryStep.innerHTML = html;
  nextToCommentBtn.disabled = !Object.keys(cart).length;
});
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
    manualField.placeholder = 'Paste your location (lat,lng or address)';
    manualField.className = 'order-comment';
    locationStatusModal.parentNode.insertBefore(manualField, locationStatusModal.nextSibling);
  }
  manualField.style.display = 'block';
  manualField.addEventListener('input', () => {
    userCoords = manualField.value;
    locationStatusModal.textContent = userCoords ? `📍 ${userCoords}` : '';
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

function updateOrderStatusUI(status) {
  const statusDiv = document.getElementById('order-status-ui');
  if (!statusDiv) return;
  if (!status || status.status === 'pending') {
    statusDiv.innerHTML = '';
    return;
  }
  if (status.status === 'eta') {
    statusDiv.innerHTML = `<div class="order-update eta">⏱️ Estimated arrival: <b>${status.eta} min</b></div>`;
  } else if (status.status === 'arrived') {
    statusDiv.innerHTML = '<div class="order-update arrived">🚗 Your order has arrived!</div>';
  }
}

// Telegram WebApp initialization
Telegram.WebApp.ready();
