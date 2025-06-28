import React from 'react';
import { MapPin, Clock, CheckCircle, Truck, Navigation, Phone, Package } from 'lucide-react';

const mockDeliveryStops = [
  {
    id: 'STOP-001',
    orderId: 'ORD-2025-005',
    customerName: 'John Smith',
    address: '123 Main Street, Downtown',
    phoneNumber: '+1 (555) 123-4567',
    items: [
      { name: 'Classic Burger', quantity: 2, image: '🍔' },
      { name: 'Caesar Salad', quantity: 1, image: '🥗' }
    ],
    estimatedArrival: '17:15',
    status: 'delivered',
    priority: 'normal',
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  {
    id: 'STOP-002',
    orderId: 'ORD-2025-006',
    customerName: 'Sarah Johnson',
    address: '456 Oak Avenue, Midtown',
    phoneNumber: '+1 (555) 987-6543',
    items: [
      { name: 'Pepperoni Pizza', quantity: 1, image: '🍕' }
    ],
    estimatedArrival: '17:25',
    status: 'arrived',
    priority: 'high',
    specialInstructions: 'Ring doorbell twice, apartment 4B',
    coordinates: { lat: 40.7589, lng: -73.9851 }
  },
  {
    id: 'STOP-003',
    orderId: 'ORD-2025-007',
    customerName: 'Mike Chen',
    address: '789 Pine Street, Uptown',
    phoneNumber: '+1 (555) 456-7890',
    items: [
      { name: 'Chicken Tacos', quantity: 3, image: '🌮' },
      { name: 'Classic Burger', quantity: 1, image: '🍔' }
    ],
    estimatedArrival: '17:40',
    status: 'en-route',
    priority: 'normal',
    coordinates: { lat: 40.7831, lng: -73.9712 }
  },
  {
    id: 'STOP-004',
    orderId: 'ORD-2025-008',
    customerName: 'Emma Davis',
    address: '321 Elm Drive, Westside',
    phoneNumber: '+1 (555) 234-5678',
    items: [
      { name: 'Caesar Salad', quantity: 2, image: '🥗' },
      { name: 'Pepperoni Pizza', quantity: 1, image: '🍕' }
    ],
    estimatedArrival: '17:55',
    status: 'pending',
    priority: 'normal',
    coordinates: { lat: 40.7505, lng: -74.0134 }
  },
  {
    id: 'STOP-005',
    orderId: 'ORD-2025-009',
    customerName: 'Alex Rodriguez',
    address: '654 Cedar Boulevard, Eastside',
    phoneNumber: '+1 (555) 345-6789',
    items: [
      { name: 'Chicken Tacos', quantity: 2, image: '🌮' }
    ],
    estimatedArrival: '18:10',
    status: 'pending',
    priority: 'low',
    coordinates: { lat: 40.7282, lng: -73.9942 }
  }
];

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

export function OptimizedRoute() {
  const currentTime = new Date();
  const activeStops = mockDeliveryStops.filter(stop => stop.status !== 'delivered');
  const completedStops = mockDeliveryStops.filter(stop => stop.status === 'delivered');
  const currentStop = mockDeliveryStops.find(stop => stop.status === 'arrived' || stop.status === 'en-route');

  const totalDistance = "12.5 km";
  const estimatedTimeRemaining = "45 min";

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-center text-gray-800 mb-2">🗺️ Route Optimization</h1>
        <p className="text-center text-gray-600 text-sm">
          Delivery route for {mockDeliveryStops.length} orders
        </p>
      </div>

      {/* Route Summary */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800">Driver: Alex Thompson</span>
          </div>
          <div className="text-sm text-blue-700">Route #RT-001</div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-blue-600">Total Distance</div>
            <div className="text-blue-800">{totalDistance}</div>
          </div>
          <div>
            <div className="text-sm text-blue-600">Remaining Time</div>
            <div className="text-blue-800">{estimatedTimeRemaining}</div>
          </div>
          <div>
            <div className="text-sm text-blue-600">Stops Left</div>
            <div className="text-blue-800">{activeStops.length}</div>
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
            <strong>{currentStop.address}</strong>
          </div>
          <div className="text-sm text-orange-600 mt-1">
            ETA: {currentStop.estimatedArrival}
          </div>
        </div>
      )}

      {/* Route Timeline */}
      <div className="space-y-4">
        <h3 className="text-gray-800">Delivery Schedule</h3>
        
        {mockDeliveryStops.map((stop, index) => {
          const statusConfig = getStatusConfig(stop.status);
          const priorityConfig = getPriorityConfig(stop.priority);
          const isActive = stop.status === 'arrived' || stop.status === 'en-route';
          
          return (
            <div key={stop.id} className="relative">
              {/* Timeline connector */}
              {index < mockDeliveryStops.length - 1 && (
                <div className={`absolute left-5 top-12 w-0.5 h-16 ${
                  stop.status === 'delivered' ? 'bg-green-200' : 'bg-gray-200'
                }`}></div>
              )}
              
              <div className={`bg-white rounded-2xl p-4 shadow-sm border ${
                isActive ? 'border-orange-200 ring-2 ring-orange-100' : 'border-gray-100'
              }`}>
                <div className="flex items-start gap-4">
                  {/* Stop number and status */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                      stop.status === 'delivered' 
                        ? 'bg-green-100 border-green-300 text-green-700' 
                        : isActive 
                        ? 'bg-orange-100 border-orange-300 text-orange-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700'
                    }`}>
                      {stop.status === 'delivered' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>

                  {/* Stop details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-900">{stop.customerName}</h4>
                          {stop.priority !== 'normal' && (
                            <div className={`px-2 py-0.5 rounded text-xs ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border} border`}>
                              {priorityConfig.label}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                          <MapPin className="w-3 h-3" />
                          <span>{stop.address}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span>{stop.phoneNumber}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">#{stop.orderId}</div>
                        <div className={`text-sm ${isActive ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                          ETA: {stop.estimatedArrival}
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                      <Package className="w-4 h-4 text-gray-500" />
                      <div className="flex gap-1">
                        {stop.items.map((item, idx) => (
                          <span key={idx} className="text-lg">{item.image}</span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {stop.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </span>
                    </div>

                    {/* Special instructions */}
                    {stop.specialInstructions && (
                      <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200">
                        📝 {stop.specialInstructions}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Route Optimization Info */}
      <div className="mt-6 bg-green-50 rounded-2xl p-4 border border-green-100">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">Route Optimized</span>
        </div>
        <div className="text-sm text-green-700">
          This route saves approximately <strong>15 minutes</strong> and <strong>3.2 km</strong> compared to the original order sequence.
        </div>
        <div className="text-xs text-green-600 mt-1">
          Last updated: {currentTime.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
} 