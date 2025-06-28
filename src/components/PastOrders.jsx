import { Clock, MessageSquare, MapPin, Calendar, CheckCircle, AlertCircle, Package, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';

const getStatusConfig = (status) => {
  switch (status) {
    case 'pending':
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Laukiama',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      };
    case 'preparing':
      return {
        icon: <Package className="w-4 h-4" />,
        label: 'Ruošiama',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      };
    case 'on-the-way':
    case 'arriving':
      return {
        icon: <Truck className="w-4 h-4" />,
        label: 'Pakeliui',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200'
      };
    case 'delivered':
    case 'arrived':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Pristatyta',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      };
    case 'cancelled':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Atšaukta',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      };
    default:
      return {
        icon: <Clock className="w-4 h-4" />,
        label: status || 'Nežinoma',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      };
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
  
  if (isToday) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (isYesterday) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export function PastOrders({ orders = [], userId }) {
  const [hiddenOrders, setHiddenOrders] = useState([]);

  // Helper for live ETA countdown (timestamp version)
  function useLiveETA(etaTimestamp) {
    const [remaining, setRemaining] = useState(null);
    useEffect(() => {
      if (!etaTimestamp) return;
      const interval = setInterval(() => {
        const etaTime = new Date(etaTimestamp).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((etaTime - now) / 60000));
        setRemaining(diff);
      }, 10000);
      // Initial set
      const etaTime = new Date(etaTimestamp).getTime();
      const now = Date.now();
      setRemaining(Math.max(0, Math.ceil((etaTime - now) / 60000)));
      return () => clearInterval(interval);
    }, [etaTimestamp]);
    return remaining;
  }

  const handleDelete = async (orderId) => {
    try {
      const res = await fetch(`/api/orders?user_id=${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      });
      if (res.ok) {
        setHiddenOrders(prev => [...prev, orderId]);
      } else {
        alert('Failed to delete order');
      }
    } catch {
      alert('Failed to delete order');
    }
  };

  if (orders.length === 0) {
    return (
      <div className="p-4 pb-20 flex flex-col items-center justify-center min-h-96">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-gray-800 mb-2">Nėra užsakymų istorijos</h2>
        <p className="text-gray-600 text-center text-sm">
          Jūsų ankstesni užsakymai atsiras čia, kai pateiksite pirmą užsakymą!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-center text-gray-800 mb-2">📋 Užsakymų istorija</h1>
        <p className="text-center text-gray-600 text-sm">
          Stebėkite savo užsakymų būseną ir pristatymą
        </p>
      </div>

      <div className="space-y-4">
        {orders.filter(order => !hiddenOrders.includes(order.order_id)).map((order) => {
          const statusConfig = getStatusConfig(order.status);
          let items = '';
          try {
            const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            items = Array.isArray(parsed)
              ? parsed.map(i => `${i.emoji ? i.emoji + ' ' : ''}${i.name || i.meal || ''}${i.qty ? ' x' + i.qty : ''}`).join(', ')
              : order.items;
          } catch { 
            items = order.items; 
          }

          // Location logic
          let loc = order.location;
          let link = '';
          let isGoogleMaps = false;
          let lat = null, lng = null;
          try {
            if (typeof loc === 'string' && loc.startsWith('{')) loc = JSON.parse(loc);
          } catch {}
          link = loc?.manual || loc;
          isGoogleMaps = typeof link === 'string' && link.includes('google.com/maps');
          if (isGoogleMaps) {
            const match = link.match(/@([\d.\-]+),([\d.\-]+)/);
            if (match) {
              lat = match[1];
              lng = match[2];
            }
          }

          // ETA logic
          const liveETA = order.eta ? useLiveETA(order.eta) : null;

          return (
            <div key={order.order_id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative">
              {/* Delete button */}
              <button
                className="absolute top-3 right-3 bg-red-100 text-red-700 rounded-full px-3 py-1 text-xs font-semibold hover:bg-red-200"
                onClick={() => handleDelete(order.order_id)}
                title="Pašalinti šį užsakymą iš sąrašo"
              >
                Pašalinti
              </button>
              {/* ETA at top */}
              {!(order.status === 'arrived' || order.status === 'delivered' || order.status === 'cancelled') && (
                <div className="mb-3">
                  <div className="w-full p-3 rounded-lg text-center font-semibold text-blue-800 bg-blue-50 border border-blue-100">
                    <Clock className="w-4 h-4 inline-block mr-1 align-text-bottom text-blue-600" />
                    {order.eta
                      ? (liveETA > 0 ? `Atvykimo laikas: ${liveETA} min` : 'Netrukus atvyks')
                      : 'Skaičiuojamas atvykimo laikas...'}
                  </div>
                </div>
              )}

              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  {/* Status tag above order id */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border mb-1 ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                    {statusConfig.icon}
                    <span className="text-xs">{statusConfig.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-900">€{order.total || '0.00'}</div>
                  <div className="text-gray-500 text-sm">{items.split(',').length} prekės</div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2 mb-4">
                {(() => {
                  let parsed = [];
                  try {
                    parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                  } catch {}
                  if (!Array.isArray(parsed)) parsed = [];
                  return parsed.map((i, idx) => {
                    // Defensive: handle missing or malformed product/item
                    const hasImage = i && typeof i === 'object' && i.image_url;
                    const hasEmoji = i && typeof i === 'object' && i.emoji;
                    const name = i && typeof i === 'object' ? (i.name || i.meal || '') : '';
                    const qty = i && typeof i === 'object' && i.qty ? ` x${i.qty}` : '';
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <span className="text-lg w-8 h-8 flex items-center justify-center overflow-hidden rounded">
                          {hasImage ? (
                            <img
                              src={i.image_url}
                              alt={name}
                              className="w-full h-full object-cover rounded"
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : hasEmoji ? (
                            <span className="text-2xl">{i.emoji}</span>
                          ) : (
                            <span className="text-2xl" title="Product not available">❓</span>
                          )}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {name || <span className="italic text-gray-400">Product no longer available</span>}{qty}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Admin Comments */}
              {order.comment && (
                <div className="flex items-start gap-2 mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <MessageSquare className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 mb-1">Komentaras:</div>
                    <div className="text-sm text-green-800">{order.comment}</div>
                  </div>
                </div>
              )}

              {/* Delivery Info */}
              {link && (
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    {(() => {
                      // Try to extract lat/lng from any link
                      let lat = null, lng = null, found = false;
                      if (typeof link === 'string') {
                        let match = link.match(/@([\d.\-]+),([\d.\-]+)/);
                        if (!match) match = link.match(/q=([\d.\-]+),([\d.\-]+)/);
                        if (match) {
                          lat = match[1];
                          lng = match[2];
                          found = true;
                        }
                      }
                      if (found && lat && lng) {
                        return (
                          <>
                            <iframe
                              title="Google Map"
                              width="100%"
                              height="180"
                              className="rounded-lg border mt-2"
                              src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                              allowFullScreen
                            ></iframe>
                          </>
                        );
                      } else {
                        return <span>{typeof link === 'string' ? link : JSON.stringify(link)}</span>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 