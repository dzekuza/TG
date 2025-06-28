import { Trash2, MapPin } from 'lucide-react';
import { useState } from 'react';

// Helper to get price for a given quantity from price_ranges
function getPriceForQuantity(price_ranges, quantity) {
  if (!Array.isArray(price_ranges)) return 0;
  const found = price_ranges.find(r => quantity >= r.min && quantity <= r.max);
  return found ? found.price : 0;
}

export function OrderProcessing({ products, cart, onQuantityChange, onClearCart, onSubmitOrder }) {
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [loadingPay, setLoadingPay] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const cartItems = products.filter(product => cart[product.id] > 0);
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const totalQty = totalItems;

  // Calculate total using admin-set price ranges
  const getProductTotal = (product, qty) => {
    const price = getPriceForQuantity(product.price_ranges, qty);
    return price * qty;
  };
  const baseTotal = cartItems.reduce((sum, product) => sum + getProductTotal(product, cart[product.id]), 0);

  // Discount logic: 10% off for 1 more, 20% for 2 more, etc. (max 30%)
  let discount = 0;
  let nextDiscount = 0;
  let nextQty = 0;
  if (totalQty >= 2) {
    discount = Math.min(0.1 * (totalQty - 1), 0.3);
  }
  if (totalQty >= 1 && totalQty < 4) {
    nextDiscount = 0.1 * totalQty;
    nextQty = 1;
  } else if (totalQty < 6) {
    nextDiscount = 0.1 * (totalQty + 1 - 1);
    nextQty = 6 - totalQty;
  }
  const discountAmount = baseTotal * discount;
  const total = baseTotal - discountAmount;

  // Helper to check if address is a valid Google Maps link
  function isValidAddress(addr) {
    return typeof addr === 'string' && addr.trim().startsWith('https://www.google.com/maps?q=');
  }

  if (cartItems.length === 0) {
    return (
      <div className="p-4 pb-20 flex flex-col items-center justify-center min-h-96">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-gray-800 mb-2">Jūsų krepšelis tuščias</h2>
        <p className="text-gray-600 text-center text-sm">
          Pridėkite patiekalų iš meniu, kad pradėtumėte užsakymą!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-center text-gray-800 mb-2">🧾 Jūsų užsakymas</h1>
        <p className="text-center text-gray-600 text-sm">
          {totalItems} prekė{totalItems !== 1 ? 's' : ''} krepšelyje
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {cartItems.map((product) => {
          const qty = cart[product.id];
          const total = getProductTotal(product, qty);
          return (
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-2xl">{product.emoji}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{qty} vnt × €{(total/qty).toFixed(2)} = €{total.toFixed(2)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Kiekis: {qty}
                    </span>
                    <button
                      onClick={() => onQuantityChange(product.id, 0)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upsell/discount message */}
      {totalQty > 0 && discount < 0.3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 text-yellow-800 text-center text-sm">
          Pridėkite dar {nextQty} prekę (-es), kad gautumėte {Math.round((nextDiscount) * 100)}% nuolaidą!
        </div>
      )}
      {discount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-green-800 text-center text-sm">
          Nuolaida pritaikyta: -{Math.round(discount * 100)}%
        </div>
      )}

      {/* Only show total */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
        <div className="flex justify-between items-center">
          <span className="text-lg text-gray-800">Iš viso:</span>
          <span className="text-xl text-blue-600">€{baseTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* User instruction after price */}
      <div className="mb-6 text-center text-gray-700 text-sm">
        Paruoškite grynųjų pinigų ir nevėluokite į susitikimo vietą.
      </div>

      {/* Address field with Google Maps and paste */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Pristatymo adresas</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-800"
            placeholder="Įveskite adresą arba įklijuokite Google Maps nuorodą"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors whitespace-nowrap"
            onClick={async () => {
              setLocating(true);
              setLocationError('');
              if (!navigator.geolocation) {
                setLocationError('Jūsų naršyklė nepalaiko geolokacijos');
                setLocating(false);
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  setAddress(`https://www.google.com/maps?q=${lat},${lng}`);
                  setLocating(false);
                },
                (err) => {
                  setLocationError('Nepavyko gauti lokacijos');
                  setLocating(false);
                }
              );
            }}
            disabled={locating}
          >
            {locating ? 'Gaunama...' : 'Gauti mano lokaciją'}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap"
            onClick={() => window.open('https://maps.google.com', '_blank')}
          >
            Atidaryti Google žemėlapius
          </button>
        </div>
        {locationError && <div className="text-red-600 text-xs mt-1">{locationError}</div>}
        {/* Show warning if pasted address is a short Google Maps URL */}
        {address.startsWith('https://goo.gl/maps') && (
          <div className="text-yellow-700 text-xs mt-1">
            Įklijuotas Google Maps nuoroda yra sutrumpinta. Prašome nukopijuoti pilną nuorodą su koordinatėmis (pvz., ilgai paspauskite ant žemėlapio ir pasirinkite "Kopijuoti nuorodą su koordinatėmis").
          </div>
        )}
      </div>

      {/* Comments area */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Komentarai</label>
        <textarea
          className="w-full rounded-xl border border-gray-300 p-3 text-gray-800"
          placeholder="Pastabos kurjeriui? (nebūtina)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-3">
        <button 
          onClick={onClearCart}
          className="flex-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl p-4 text-gray-700"
        >
          Išvalyti krepšelį
        </button>
        <button 
          onClick={() => {
            if (!isValidAddress(address)) {
              alert('Įveskite galiojantį Google Maps adresą prieš pateikdami užsakymą.');
              return;
            }
            onSubmitOrder({ address, comment });
          }}
          className="flex-1 bg-green-500 hover:bg-green-600 transition-colors rounded-xl p-4 text-white"
        >
          Patvirtinti užsakymą
        </button>
      </div>
    </div>
  );
} 