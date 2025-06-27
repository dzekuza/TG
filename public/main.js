// main.js
let userCoords = null;

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
const menuCards = document.querySelectorAll('.menu-card');
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
