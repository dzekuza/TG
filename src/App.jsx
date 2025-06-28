import { useState, useEffect } from 'react';
import { ProductCatalog } from './components/ProductCatalog';
import { OrderProcessing } from './components/OrderProcessing';
import { PastOrders } from './components/PastOrders';
import { ShoppingBag, Package, History } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('products');
  const [cart, setCart] = useState({});
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.products) {
          setProducts(data.products.filter(p => p.available));
        }
      } catch (e) {
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

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
        comment: comment || '',
        items: cartItems.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          qty: cart[product.id],
          emoji: product.emoji || ''
        }))
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
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs">Cart</span>
            {totalItems > 0 && (
              <span className="absolute top-1 right-3 bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">{totalItems}</span>
            )}
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