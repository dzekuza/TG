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
  // Use Telegram WebApp geolocation if available
  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.requestGeoLocation) {
    Telegram.WebApp.requestGeoLocation((location) => {
      if (location && location.latitude && location.longitude) {
        userCoords = { lat: location.latitude, lng: location.longitude };
        locationStatusModal.textContent = `📍 ${userCoords.lat}, ${userCoords.lng}`;
      } else {
        alert('Unable to fetch location from Telegram.');
      }
    });
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      userCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      locationStatusModal.textContent = `📍 ${userCoords.lat}, ${userCoords.lng}`;
    }, () => {
      alert('Unable to fetch location');
    });
  }
});

submitOrderBtn.addEventListener('click', async () => {
  if (!Object.keys(cart).length) {
    alert('Please add at least one item.');
    return;
  }
  if (!userCoords) {
    alert('Please add your location.');
    return;
  }
  const tgUser = Telegram.WebApp.initDataUnsafe.user;
  const comment = orderComment.value;
  await fetch("https://tg-gamma-ten.vercel.app/api/order", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meal: Object.entries(cart).map(([meal, { qty }]) => `${meal} x${qty}`).join(', '),
      user: tgUser,
      location: userCoords,
      comment
    })
  });
  Telegram.WebApp.close();
});

Telegram.WebApp.ready();

document.getElementById('get-location').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      userCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      document.getElementById('location-status').innerText = `📍 ${userCoords.lat}, ${userCoords.lng}`;
    }, () => {
      alert('Unable to fetch location');
    });
  }
});

// Modern menu logic for selecting items and ordering
let selectedMeal = null;
menuCards.forEach(card => {
  card.querySelector('button').addEventListener('click', () => {
    menuCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedMeal = card.getAttribute('data-meal');
  });
});

document.getElementById('order-btn').addEventListener('click', async () => {
  if (!selectedMeal) {
    alert('Please select a meal!');
    return;
  }
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    const userCoords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    const tgUser = Telegram.WebApp.initDataUnsafe.user;
    await fetch("https://tg-gamma-ten.vercel.app/api/order", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal: selectedMeal,
        user: tgUser,
        location: userCoords
      })
    });
    Telegram.WebApp.close();
  }, () => {
    alert('Unable to fetch location');
  });
});
