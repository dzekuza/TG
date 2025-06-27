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

document.getElementById('submit-order').addEventListener('click', async () => {
  const meal = document.getElementById('meal').value;
  const tgUser = Telegram.WebApp.initDataUnsafe.user;

  if (!userCoords) {
    alert('Please share your location first.');
    return;
  }

  await fetch("https://tg-gamma-ten.vercel.app/api/order", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meal,
      user: tgUser,
      location: userCoords
    })
  });

  Telegram.WebApp.close(); // Optional: auto-close after ordering
});