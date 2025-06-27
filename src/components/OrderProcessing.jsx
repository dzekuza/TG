import { Trash2, MapPin } from 'lucide-react';
import { useState } from 'react';

export function OrderProcessing({ products, cart, onQuantityChange, onClearCart, onSubmitOrder }) {
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const cartItems = products.filter(product => cart[product.id] > 0);
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const totalQty = totalItems;
  const baseTotal = cartItems.reduce((sum, product) => sum + (product.price * cart[product.id]), 0);

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

  if (cartItems.length === 0) {
    return (
      <div className="p-4 pb-20 flex flex-col items-center justify-center min-h-96">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 text-center text-sm">
          Add some delicious items from our menu to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-center text-gray-800 mb-2">🧾 Your Order</h1>
        <p className="text-center text-gray-600 text-sm">
          {totalItems} item{totalItems !== 1 ? 's' : ''} in your cart
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {cartItems.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{product.emoji}</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2">${product.price.toFixed(2)} each</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Qty: {cart[product.id]} × ${product.price.toFixed(2)} = ${(product.price * cart[product.id]).toFixed(2)}
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
        ))}
      </div>

      {/* Upsell/discount message */}
      {totalQty > 0 && discount < 0.3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 text-yellow-800 text-center text-sm">
          Add 1 more item for {Math.round((nextDiscount) * 100)}% off your total!
        </div>
      )}
      {discount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-green-800 text-center text-sm">
          Discount applied: -{Math.round(discount * 100)}%
        </div>
      )}

      {/* Only show total */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
        <div className="flex justify-between items-center">
          <span className="text-lg text-gray-800">Total:</span>
          <span className="text-xl text-blue-600">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* User instruction after price */}
      <div className="mb-6 text-center text-gray-700 text-sm">
        Prepare cash and don&apos;t be late in agreed location.
      </div>

      {/* Address field with Google Maps and paste */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Delivery Address</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-800"
            placeholder="Enter address or paste Google Maps link"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <button
            type="button"
            className="bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-200"
            onClick={() => window.open('https://maps.google.com', '_blank')}
          >
            Get my address
          </button>
          <button
            type="button"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-gray-200"
            onClick={async () => {
              const text = await navigator.clipboard.readText();
              setAddress(text);
            }}
          >
            Paste location
          </button>
        </div>
        <button
          type="button"
          className="mt-2 w-full bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-200"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  setAddress(`https://www.google.com/maps?q=${latitude},${longitude}`);
                },
                (err) => {
                  alert('Could not fetch location. Please allow location access.');
                }
              );
            } else {
              alert('Geolocation is not supported by your browser.');
            }
          }}
        >
          Fetch my location
        </button>
      </div>

      {/* Comments area */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Comments</label>
        <textarea
          className="w-full rounded-xl border border-gray-300 p-3 text-gray-800"
          placeholder="Any notes for the courier? (optional)"
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
          Clear Cart
        </button>
        <button 
          onClick={() => onSubmitOrder({ address, comment })}
          className="flex-1 bg-green-500 hover:bg-green-600 transition-colors rounded-xl p-4 text-white"
        >
          Place Order
        </button>
      </div>
    </div>
  );
} 