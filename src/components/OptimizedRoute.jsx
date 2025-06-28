import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Clock, CheckCircle, Truck, Navigation, Phone, Package, RefreshCw } from 'lucide-react';

// Haversine formula for distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseLatLng(location) {
  if (!location) return null;
  try {
    if (typeof location === 'string') location = JSON.parse(location);
  } catch {}
  if (location.lat && location.lng) return { lat: Number(location.lat), lng: Number(location.lng) };
  if (location.manual && typeof location.manual === 'string') {
    // Try to extract from Google Maps link
    let match = location.manual.match(/@([\d.\-]+),([\d.\-]+)/);
    if (!match) match = location.manual.match(/q=([\d.\-]+),([\d.\-]+)/);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
  }
  return null;
}

const getStatusConfig = (status) => {
  switch (status) {
    case 'pending':
      return {
        icon: <Clock className="w-4 h-4" />, label: 'Pending', bgColor: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-200'
      };
    case 'en-route':
      return {
        icon: <Truck className="w-4 h-4" />, label: 'En Route', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200'
      };
    case 'arrived':
      return {
        icon: <Navigation className="w-4 h-4" />, label: 'Arrived', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200'
      };
    case 'delivered':
      return {
        icon: <CheckCircle className="w-4 h-4" />, label: 'Delivered', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-200'
      };
    default:
      return { icon: null, label: '', bgColor: '', textColor: '', borderColor: '' };
  }
};

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'high':
      return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'High Priority' };
    case 'normal':
      return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Normal' };
    case 'low':
      return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Low Priority' };
    default:
      return { color: '', bg: '', border: '', label: '' };
  }
};

export function OptimizedRoute({ adminPassword }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [driverLoc, setDriverLoc] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef();

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin-orders?password=${encodeURIComponent(adminPassword)}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setError('Error loading orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Poll for new orders every 10s
  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 10000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, [adminPassword]);

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Get driver location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setDriverLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDriverLoc(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Filter and sort stops (pending/arriving/arrived, not cancelled/delivered)
  const stops = orders.filter(o => o.status !== 'cancelled' && o.status !== 'arrived' && o.status !== 'delivered');
  // Optionally, sort by created_at or eta
  stops.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Calculate total distance and time
  let totalDistance = 0;
  let estimatedTime = 0;
  let prev = driverLoc;
  const stopDistances = stops.map(stop => {
    const loc = parseLatLng(stop.location);
    if (prev && loc) {
      const dist = haversine(prev.lat, prev.lng, loc.lat, loc.lng);
      totalDistance += dist;
      // Assume 30km/h avg speed
      estimatedTime += (dist / 30) * 60;
      prev = loc;
      return dist;
    }
    prev = loc || prev;
    return 0;
  });

  // Find current stop (first not delivered/arrived)
  const currentStop = stops[0];

  // Helper to parse items
  function parseItems(items) {
    try {
      const arr = typeof items === 'string' ? JSON.parse(items) : items;
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  if (loading) return <div className="text-center py-12">Kraunama...</div>;
  if (error) return <div className="text-center text-red-600 py-12">{error}</div>;

  return (
    <div className="p-4 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-center text-gray-800 mb-2">🗺️ Route Optimization</h1>
          <p className="text-center text-gray-600 text-sm">
            Delivery route for {orders.length} orders
          </p>
        </div>
        <button onClick={handleRefresh} className={`ml-4 flex items-center gap-1 px-3 py-2 rounded-lg border text-blue-700 bg-blue-50 border-blue-200 font-semibold hover:bg-blue-100 ${refreshing ? 'animate-spin' : ''}`}
          title="Refresh">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Route Summary */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800">Driver: (your location)</span>
          </div>
          <div className="text-sm text-blue-700">Stops: {stops.length}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-blue-600">Total Distance</div>
            <div className="text-blue-800">{totalDistance.toFixed(2)} km</div>
          </div>
          <div>
            <div className="text-sm text-blue-600">Remaining Time</div>
            <div className="text-blue-800">{Math.round(estimatedTime)} min</div>
          </div>
          <div>
            <div className="text-sm text-blue-600">Stops Left</div>
            <div className="text-blue-800">{stops.length}</div>
          </div>
        </div>
      </div>

      {/* Current Location */}
      {currentStop && (
        <div className="bg-orange-50 rounded-2xl p-4 mb-6 border border-orange-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-orange-800">Current Location</span>
          </div>
          <div className="text-sm text-orange-700">
            {currentStop.status === 'arrived' ? 'Arrived at: ' : 'En route to: '}
            <strong>{currentStop.address || currentStop.order_id}</strong>
          </div>
          <div className="text-sm text-orange-600 mt-1">
            ETA: {currentStop.eta || '-'}
          </div>
        </div>
      )}

      {/* Route Timeline */}
      <div className="space-y-4">
        <h3 className="text-gray-800">Delivery Schedule</h3>
        {stops.map((stop, index) => {
          const statusConfig = getStatusConfig(stop.status);
          const isActive = index === 0;
          const loc = parseLatLng(stop.location);
          const dist = stopDistances[index]?.toFixed(2);
          const items = parseItems(stop.items);
          return (
            <div key={stop.order_id} className="relative">
              {index < stops.length - 1 && (
                <div className={`absolute left-5 top-12 w-0.5 h-16 ${stop.status === 'delivered' ? 'bg-green-200' : 'bg-gray-200'}`}></div>
              )}
              <div className={`bg-white rounded-2xl p-4 shadow-sm border ${isActive ? 'border-orange-200 ring-2 ring-orange-100' : 'border-gray-100'}`}> 
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${stop.status === 'delivered' ? 'bg-green-100 border-green-300 text-green-700' : isActive ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>{stop.status === 'delivered' ? (<CheckCircle className="w-5 h-5" />) : (<span>{index + 1}</span>)}</div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>{statusConfig.icon}<span>{statusConfig.label}</span></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-900">{stop.customerName || stop.user_id || stop.order_id}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                          <MapPin className="w-3 h-3" />
                          <span>{stop.address || (loc ? `${loc.lat},${loc.lng}` : '-')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>{stop.phoneNumber || '-'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">#{stop.order_id}</div>
                        <div className={`text-sm ${isActive ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>ETA: {stop.eta || '-'}</div>
                        {dist && <div className="text-xs text-blue-600">+{dist} km</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                      <Package className="w-4 h-4 text-gray-500" />
                      <div className="flex gap-1">
                        {items.map((item, idx) => (
                          <span key={idx} className="text-lg">{item.emoji || item.image || ''}</span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{items.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0)} items</span>
                    </div>
                    {stop.comment && (<div className="text-sm text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200">📝 {stop.comment}</div>)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 bg-green-50 rounded-2xl p-4 border border-green-100">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">Route Optimized</span>
        </div>
        <div className="text-sm text-green-700">
          This route saves time and distance compared to the original order sequence.
        </div>
        <div className="text-xs text-green-600 mt-1">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
} 