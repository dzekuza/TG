import { useState, useEffect } from 'react';
import { ProductCatalog } from './components/ProductCatalog';
import { OrderProcessing } from './components/OrderProcessing';
import { PastOrders } from './components/PastOrders';
import { ShoppingBag, Package, History } from 'lucide-react';

// Product data - you can move this to a separate file or fetch from API
const products = [
  {
    id: 1,
    name: 'Classic Burger',
    price: 12.99,
    emoji: '🍔',
    description: 'Juicy beef patty with lettuce, tomato, and cheese'
  },
  {
    id: 2,
    name: 'Pepperoni Pizza',
    price: 18.99,
    emoji: '🍕',
    description: 'Classic pizza with pepperoni and mozzarella'
  },
  {
    id: 3,
    name: 'Caesar Salad',
    price: 9.99,
    emoji: '🥗',
    description: 'Fresh romaine lettuce with Caesar dressing'
  },
  {
    id: 4,
    name: 'Chicken Tacos',
    price: 14.99,
    emoji: '🌮',
    description: 'Grilled chicken with fresh vegetables and salsa'
  },
  {
    id: 5,
    name: 'French Fries',
    price: 4.99,
    emoji: '🍟',
    description: 'Crispy golden fries with sea salt'
  },
  {
    id: 6,
    name: 'Chocolate Cake',
    price: 8.99,
    emoji: '🍰',
    description: 'Rich chocolate cake with cream filling'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('products');
  const [cart, setCart] = useState({});
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Initialize Telegram WebApp
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
      if (tgUser) {
        setUser(tgUser);
        // Load past orders
        loadPastOrders(tgUser.id);
      }
    }
  }, []);

  const loadPastOrders = async (userId) => {
    try {
      const response = await fetch(`/api/orders?user_id=${userId}`);
      const data = await response.json();
      if (data.orders) {
        setPastOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading past orders:', error);
    }
  };

  const handleQuantityChange = (id, quantity) => {
    setCart(prev => ({
      ...prev,
      [id]: quantity
    }));
  };

  const handleClearCart = () => {
    setCart({});
  };

  const handleSubmitOrder = async ({ address, comment } = {}) => {
    if (!user) {
      alert('Please log in to place an order');
      return;
    }

    const cartItems = products.filter(product => cart[product.id] > 0);
    if (cartItems.length === 0) {
      alert('Please add at least one item to your cart');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        meal: cartItems.map(product => `${product.name} x${cart[product.id]}`).join(', '),
        user: user,
        location: address ? { manual: address } : { lat: 0, lng: 0 },
        comment: comment || ''
      };

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Order placed successfully!');
        setCart({});
        // Reload past orders
        loadPastOrders(user.id);
        setActiveTab('history');
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCart = () => setActiveTab('orders');

  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <ProductCatalog
            products={products}
            cart={cart}
            onQuantityChange={handleQuantityChange}
            onGoToCart={handleGoToCart}
          />
        );
      case 'orders':
        return (
          <OrderProcessing
            products={products}
            cart={cart}
            onQuantityChange={handleQuantityChange}
            onClearCart={handleClearCart}
            onSubmitOrder={handleSubmitOrder}
          />
        );
      case 'history':
        return <PastOrders orders={pastOrders} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="pb-16">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
              activeTab === 'products'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">Products</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors relative ${
              activeTab === 'orders'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </div>
              )}
            </div>
            <span className="text-xs">Cart</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-xs">History</span>
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Placing your order...</p>
          </div>
        </div>
      )}
    </div>
  );
} 