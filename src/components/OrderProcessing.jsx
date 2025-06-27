import { Trash2, MapPin, Phone } from 'lucide-react';

export function OrderProcessing({ products, cart, onQuantityChange, onClearCart, onSubmitOrder }) {
  const cartItems = products.filter(product => cart[product.id] > 0);
  const totalAmount = cartItems.reduce((sum, product) => sum + (product.price * cart[product.id]), 0);
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

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

      <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-700">Subtotal:</span>
          <span className="text-gray-900">${totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-700">Delivery Fee:</span>
          <span className="text-gray-900">$2.99</span>
        </div>
        <div className="border-t border-blue-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg text-gray-800">Total:</span>
            <span className="text-xl text-blue-600">${(totalAmount + 2.99).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <button className="w-full bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-gray-600" />
          <span className="text-gray-700">Add delivery address</span>
        </button>
        
        <button className="w-full bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl p-4 flex items-center gap-3">
          <Phone className="w-5 h-5 text-gray-600" />
          <span className="text-gray-700">Add phone number</span>
        </button>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={onClearCart}
          className="flex-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl p-4 text-gray-700"
        >
          Clear Cart
        </button>
        <button 
          onClick={onSubmitOrder}
          className="flex-1 bg-green-500 hover:bg-green-600 transition-colors rounded-xl p-4 text-white"
        >
          Place Order
        </button>
      </div>
    </div>
  );
} 