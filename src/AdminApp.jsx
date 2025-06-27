import { useState, useEffect } from 'react';
import { Clock, MessageSquare, MapPin, Calendar, CheckCircle, AlertCircle, Package, Truck, RefreshCw } from 'lucide-react';

const getStatusConfig = (status) => {
  switch (status) {
    case 'pending':
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Pending',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      };
    case 'preparing':
      return {
        icon: <Package className="w-4 h-4" />,
        label: 'Preparing',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      };
    case 'on-the-way':
    case 'arriving':
      return {
        icon: <Truck className="w-4 h-4" />,
        label: 'On the way',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200'
      };
    case 'delivered':
    case 'arrived':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Delivered',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      };
    case 'cancelled':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Cancelled',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      };
    default:
      return {
        icon: <Clock className="w-4 h-4" />,
        label: status || 'Unknown',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      };
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AdminApp() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [activeTab, setActiveTab] = useState('pending');
  const statusTabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'arriving', label: 'On the way' },
    { key: 'arrived', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-orders');
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status, comment = '', eta = '', driverLocation = '') => {
    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await fetch('/api/admin-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          status,
          comment,
          eta,
          driver_location: driverLocation
        })
      });

      if (response.ok) {
        // Reload orders to get updated data
        await loadOrders();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order status');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Orders</h1>
              <p className="text-gray-600">Manage and update order status</p>
            </div>
            <button
              onClick={loadOrders}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Tabs */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-2 min-w-max w-full">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium border transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                style={{ minWidth: 120 }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600">Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.filter(order => {
              if (activeTab === 'pending') return order.status === 'pending' || order.status === 'preparing';
              if (activeTab === 'arriving') return order.status === 'arriving' || order.status === 'on-the-way';
              if (activeTab === 'arrived') return order.status === 'arrived' || order.status === 'delivered';
              if (activeTab === 'cancelled') return order.status === 'cancelled';
              return true;
            }).map((order) => {
              const statusConfig = getStatusConfig(order.status);
              let items = '';
              try {
                const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                items = Array.isArray(parsed)
                  ? parsed.map(i => {
                      const name = i.name || i.meal || '';
                      const qty = i.qty ? ` x${i.qty}` : '';
                      // Avoid duplicate 'x' if already present
                      return `${i.emoji ? i.emoji + ' ' : ''}${name}${name.includes('x') ? '' : qty}`;
                    }).join('\n')
                  : order.items;
              } catch { 
                items = order.items; 
              }

              return (
                <div key={order.order_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border mb-1 ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                        {statusConfig.icon}
                        <span className="text-sm font-medium">{statusConfig.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-gray-900">#{order.order_id}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">User ID: {order.user_id}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Order Items:</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-700">{items}</p>
                    </div>
                  </div>

                  {order.comment && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Comment:</h3>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-blue-800">{order.comment}</p>
                      </div>
                    </div>
                  )}

                  {order.location && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Location:</h3>
                      {(() => {
                        let loc = order.location;
                        try {
                          if (typeof loc === 'string') loc = JSON.parse(loc);
                        } catch {}
                        const link = loc?.manual || loc;
                        // Try to extract lat/lng from any link
                        let lat = null, lng = null;
                        let found = false;
                        if (typeof link === 'string') {
                          // Google Maps @lat,lng or q=lat,lng
                          let match = link.match(/@([\d.\-]+),([\d.\-]+)/);
                          if (!match) match = link.match(/q=([\d.\-]+),([\d.\-]+)/);
                          if (match) {
                            lat = match[1];
                            lng = match[2];
                            found = true;
                          }
                        }
                        return found && lat && lng ? (
                          <div className="flex flex-col gap-2">
                            <iframe
                              title="Map"
                              width="100%"
                              height="200"
                              className="rounded-lg border"
                              src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                              allowFullScreen
                            ></iframe>
                            <div className="flex gap-2">
                              <a
                                href={`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-200"
                              >
                                Go with Waze
                              </a>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-gray-200"
                              >
                                Open in Maps
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4" />
                            <span>{typeof loc === 'string' ? loc : JSON.stringify(loc)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Update Status:
                      </label>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                        disabled={updating[order.order_id]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="arriving">On the way</option>
                        <option value="arrived">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ETA (minutes):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onBlur={(e) => updateOrderStatus(order.order_id, order.status, order.comment, e.target.value, order.driver_location)}
                      />
                    </div>
                  </div>

                  {updating[order.order_id] && (
                    <div className="mt-4 flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Updating...</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 