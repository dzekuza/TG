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
  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin-orders?password=${encodeURIComponent(adminPassword)}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setError('Error loading orders');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // Poll for new orders every 10s (no loading spinner)
  useEffect(() => {
    fetchOrders(true); // initial load with spinner
    intervalRef.current = setInterval(() => fetchOrders(false), 10000);
    return () => clearInterval(intervalRef.current);
  }, [adminPassword]);

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
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

  // Quick ETA/status handlers
  const handleQuickEta = (order, min) => {
    // If pending, auto-change to arriving
    const origStatus = order.status === 'pending' ? 'pending' : order.status;
    updateOrderStatus(order.order_id, order.status, order.comment, String(min), order.driver_location, order.admin_note, order.user_id, origStatus);
  };
  const handleCustomEta = (order) => {
    const min = prompt('Enter ETA in minutes:');
    if (min && !isNaN(Number(min))) {
      const origStatus = order.status === 'pending' ? 'pending' : order.status;
      updateOrderStatus(order.order_id, order.status, order.comment, String(Number(min)), order.driver_location, order.admin_note, order.user_id, origStatus);
    }
  };
  // Pakeliui button should always set status to arriving
  const handleArriving = (order) => {
    updateOrderStatus(order.order_id, 'arriving', order.comment, order.eta, order.driver_location, order.admin_note, order.user_id, order.status);
  };

  if (loading) return <div className="text-center py-12">Kraunama...</div>;
  if (error) return <div className="text-center text-red-600 py-12">{error}</div>;

  return (
    <div className="p-2 pb-16">
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
          {/* Waze embed for current stop */}
          {driverLoc && parseLatLng(currentStop.location) && (
            <div className="mt-4">
              <iframe
                title="Waze Route Preview"
                width="100%"
                height="200"
                className="rounded-lg border"
                src={`https://embed.waze.com/iframe?zoom=15&lat=${driverLoc.lat}&lon=${driverLoc.lng}&pin=1&navigate=yes&to=${parseLatLng(currentStop.location).lat},${parseLatLng(currentStop.location).lng}`}
                allowFullScreen
              ></iframe>
              <div className="text-xs text-gray-500 mt-1">Waze route: driver → next stop</div>
            </div>
          )}
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
          // ETA in minutes (if ISO or timestamp, convert)
          let etaMinutes = null;
          if (stop.eta && !isNaN(Number(stop.eta))) {
            etaMinutes = Number(stop.eta);
          } else if (stop.eta && !isNaN(Date.parse(stop.eta))) {
            const etaDate = new Date(stop.eta);
            const now = new Date();
            etaMinutes = Math.max(0, Math.round((etaDate - now) / 60000));
          }
          return (
            <div key={stop.order_id} className="relative">
              {/* Timeline connector removed */}
              <div className={`bg-white rounded-2xl p-2 shadow-sm border ${isActive ? 'border-orange-200 ring-2 ring-orange-100' : 'border-gray-100'} w-full max-w-full`}> 
                <div className="flex items-start gap-4 flex-nowrap">
                  <div className="flex flex-col items-center gap-2 min-w-[48px]">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${stop.status === 'delivered' ? 'bg-green-100 border-green-300 text-green-700' : isActive ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>{stop.status === 'delivered' ? (<CheckCircle className="w-5 h-5" />) : (<span>{index + 1}</span>)}</div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>{statusConfig.icon}<span>{statusConfig.label}</span></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-gray-900 text-base truncate max-w-[180px]">{stop.customerName || stop.user_id || stop.order_id}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1 flex-wrap break-all">
                          <MapPin className="w-3 h-3" />
                          {stop.address ? (
                            <span className="truncate max-w-[180px]">{stop.address}</span>
                          ) : loc ? (
                            <span className="font-mono select-all" title="Copy coordinates">{loc.lat},{loc.lng}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right min-w-[60px]">
                        {/* Add your right-side content here if needed */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}