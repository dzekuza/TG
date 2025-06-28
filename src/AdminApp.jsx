import { useState, useEffect, useRef } from 'react';
import { Clock, MessageSquare, MapPin, Calendar, CheckCircle, AlertCircle, Package, Truck, RefreshCw, Users, Inbox } from 'lucide-react';
import { DataTable } from './components/ui/data-table';
import { ProductCard } from './components/ProductCard';

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
  const [userNotes, setUserNotes] = useState({});
  const [userOrderCounts, setUserOrderCounts] = useState({});
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [activeNav, setActiveNav] = useState('orders');
  const [noteInput, setNoteInput] = useState({});
  const statusTabs = [
    { key: 'pending', label: 'Laukiama' },
    { key: 'arriving', label: 'Pakeliui' },
    { key: 'arrived', label: 'Pristatyta' },
    { key: 'cancelled', label: 'Atšaukta' }
  ];
  const statusOptions = [
    { value: 'pending', label: 'Laukiama' },
    { value: 'arriving', label: 'Pakeliui' },
    { value: 'arrived', label: 'Pristatyta' },
    { value: 'cancelled', label: 'Atšaukta' }
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async (password = adminPassword) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-orders?password=${encodeURIComponent(password)}`);
      if (response.status === 401) {
        setPasswordError('Incorrect password');
        setPasswordEntered(false);
        setLoading(false);
        return;
      }
      setPasswordError('');
      setPasswordEntered(true);
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders);
        // Build user notes and order counts
        const notes = {};
        const counts = {};
        data.orders.forEach(o => {
          notes[o.user_id] = o.admin_note || '';
          counts[o.user_id] = (counts[o.user_id] || 0) + 1;
        });
        setUserNotes(notes);
        setUserOrderCounts(counts);
      }
    } catch (error) {
      setPasswordError('Error loading orders');
      setPasswordEntered(false);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status, comment = '', eta = '', driverLocation = '', adminNote = '', userId = '') => {
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
          driver_location: driverLocation,
          admin_note: adminNote,
          user_id: userId,
          password: adminPassword
        })
      });
      if (response.ok) {
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

  const handleStatusChange = async (order, newStatus) => {
    await updateOrderStatus(order.order_id, newStatus, order.comment, order.eta, order.driver_location, userNotes[order.user_id], order.user_id);
  };

  const handleNoteChange = (userId, value) => {
    setUserNotes(prev => ({ ...prev, [userId]: value }));
  };

  const handleNoteBlur = async (order) => {
    const prevNote = userNotes[order.user_id] || '';
    const newNote = noteInput[order.user_id] || '';
    if (!newNote.trim()) return;
    const timestamp = new Date().toLocaleString('lt-LT');
    const appended = prevNote ? `${prevNote}\n[${timestamp}] ${newNote}` : `[${timestamp}] ${newNote}`;
    setUserNotes(prev => ({ ...prev, [order.user_id]: appended }));
    setNoteInput(prev => ({ ...prev, [order.user_id]: '' }));
    await updateOrderStatus(order.order_id, order.status, order.comment, order.eta, order.driver_location, appended, order.user_id);
  };

  const handleEtaHotkey = async (order, minutes) => {
    await updateOrderStatus(order.order_id, order.status, order.comment, String(minutes), order.driver_location, userNotes[order.user_id], order.user_id);
  };

  const removeOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to remove this order?')) return;
    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await fetch('/api/admin-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, password: adminPassword })
      });
      if (response.ok) {
        setOrders(prev => prev.filter(o => o.order_id !== orderId));
      } else {
        alert('Failed to remove order');
      }
    } catch (error) {
      alert('Error removing order');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Top navigation bar
  const renderNav = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto flex gap-2 px-4 py-2">
        <button
          onClick={() => setActiveNav('orders')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${activeNav === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Package className="w-5 h-5" />
          <span className="text-xs font-semibold">Užsakymai</span>
        </button>
        <button
          onClick={() => setActiveNav('messages')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${activeNav === 'messages' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Inbox className="w-5 h-5" />
          <span className="text-xs font-semibold">Žinutės</span>
        </button>
        <button
          onClick={() => setActiveNav('route')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${activeNav === 'route' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Truck className="w-5 h-5" />
          <span className="text-xs font-semibold">Maršrutas</span>
        </button>
        <button
          onClick={() => setActiveNav('admin')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${activeNav === 'admin' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-semibold">admin</span>
        </button>
      </div>
    </div>
  );

  if (!passwordEntered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-xs flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">Administratoriaus prisijungimas</h2>
          <input
            type="password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter admin password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') loadOrders(); }}
            autoFocus
          />
          {passwordError && <div className="text-red-600 text-sm text-center">{passwordError}</div>}
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
            onClick={() => loadOrders()}
          >
            Prisijungti
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Kraunama užsakymai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNav()}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeNav === 'orders' && (
          <>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Užsakymų dar nėra</h2>
                <p className="text-gray-600">Užsakymai atsiras čia, kai klientai juos pateiks</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.filter(order => {
                  if (activeTab === 'pending') return order.status === 'pending';
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
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="font-medium text-gray-900 mb-2">Užsakymo prekės:</h3>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-700 whitespace-pre-line">{items}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="font-medium text-gray-900 mb-2">Iš viso:</h3>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <span className="text-blue-800 font-semibold">€{order.total || '0.00'}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="font-medium text-gray-900 mb-2">Vartotojas:</h3>
                        <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1">
                          <span className="text-gray-700">ID: {order.user_id}</span>
                          <span className="text-gray-700">Užsakymų skaičius: {userOrderCounts[order.user_id] || 1}</span>
                        </div>
                      </div>

                      {order.comment && (
                        <div className="mb-4">
                          <h3 className="font-medium text-gray-900 mb-2">Komentaras:</h3>
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <p className="text-blue-800">{order.comment}</p>
                          </div>
                        </div>
                      )}

                      {order.location && (
                        <div className="mb-4">
                          <h3 className="font-medium text-gray-900 mb-2">Pristatymo vieta:</h3>
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
                                    Atidaryti su Waze
                                  </a>
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-gray-200"
                                  >
                                    Atidaryti žemėlapyje
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

                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Atnaujinti būseną:
                          </label>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order, e.target.value)}
                            disabled={updating[order.order_id]}
                            className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-semibold shadow-sm transition-all"
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Atvykimo laikas (min):
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., 15"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            defaultValue={order.eta || ''}
                            onBlur={(e) => updateOrderStatus(order.order_id, order.status, order.comment, e.target.value, order.driver_location, userNotes[order.user_id], order.user_id)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                        {[10, 5, 2].map(min => (
                          <button
                            key={min}
                            onClick={() => handleEtaHotkey(order, min)}
                            className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 border border-blue-200 transition-colors"
                            disabled={updating[order.order_id]}
                          >
                            {min} min
                          </button>
                        ))}
                      </div>

                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Administratoriaus pastaba (privatu):</label>
                        <textarea
                          className="w-full rounded-lg border border-gray-300 p-2 text-gray-800 bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                          rows={2}
                          value={noteInput[order.user_id] || ''}
                          onChange={e => setNoteInput(prev => ({ ...prev, [order.user_id]: e.target.value }))}
                          onBlur={() => handleNoteBlur(order)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteBlur(order); } }}
                          placeholder="Pridėkite pastabą apie šį vartotoją..."
                        />
                      </div>

                      {/* Show all previous notes below */}
                      {userNotes[order.user_id] && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-line border border-gray-200">
                          {userNotes[order.user_id]}
                        </div>
                      )}

                      <div className="flex justify-end mt-2">
                        <button
                          className="px-3 py-1 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 border border-red-200 transition-colors text-sm"
                          onClick={() => removeOrder(order.order_id)}
                          disabled={updating[order.order_id]}
                        >
                          Pašalinti užsakymą
                        </button>
                      </div>

                      {updating[order.order_id] && (
                        <div className="mt-4 flex items-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm">Atnaujinama...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {activeNav === 'messages' && (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-gray-700">
            <div className="bg-white rounded-xl shadow p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Administratoriaus pokalbis</h3>
              <AdminChatPanel adminPassword={adminPassword} />
            </div>
          </div>
        )}
        {activeNav === 'route' && (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-gray-700">
            <div className="bg-white rounded-xl shadow p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Maršruto optimizavimas</h3>
              <RouteOptimizerPanel orders={orders} />
            </div>
          </div>
        )}
        {activeNav === 'admin' && (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-gray-700">
            <h2 className="text-2xl font-bold mb-4">Vairuotojo statistika</h2>
            <div className="bg-white rounded-xl shadow p-6 w-full max-w-4xl text-center mb-8">
              <DriverStatsPanel />
            </div>
            {/* Product management */}
            <div className="bg-white rounded-xl shadow p-6 w-full max-w-4xl mb-8">
              <h2 className="text-xl font-semibold mb-4">Produktų valdymas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {products.map(product => (
                  <div key={product.id} className="relative group">
                    <ProductCard product={product} quantity={0} onQuantityChange={() => {}} />
                    <button
                      className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs opacity-90 group-hover:opacity-100"
                      onClick={() => { setEditing(product.id); setShowModal(true); handleEdit(product); }}
                    >Redaguoti</button>
                    <button
                      className="absolute bottom-2 right-2 bg-gray-700 text-white px-2 py-1 rounded text-xs opacity-80 group-hover:opacity-100"
                      onClick={() => setShowStats(product)}
                    >Statistika</button>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mb-8">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold" onClick={() => { setEditing(null); setForm({ name: '', price_ranges: [{ price: '', min: '', max: '' }], image_url: '', available: true }); setImagePreview(''); setShowModal(true); }}>
                  + Pridėti naują
                </button>
              </div>
              {/* Slide-in modal for add/edit */}
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => { setShowModal(false); handleCancel(); }}>
                  <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-lg p-6 w-full max-w-md mx-auto animate-slide-in-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-4">{editing ? 'Redaguoti produktą' : 'Pridėti naują produktą'}</h3>
                    <div className="mb-4 flex flex-col gap-3">
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        name="name"
                        placeholder="Product name"
                        value={form.name}
                        onChange={handleFormChange}
                      />
                      <div className="flex flex-col gap-2">
                        {form.price_ranges.map((range, idx) => (
                          <div className="flex gap-2 items-center" key={idx}>
                            <input
                              className="w-1/3 px-2 py-2 border border-gray-300 rounded-lg"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Price (€)"
                              value={range.price}
                              onChange={e => handlePriceRangeChange(idx, 'price', e.target.value)}
                            />
                            <input
                              className="w-1/4 px-2 py-2 border border-gray-300 rounded-lg"
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Min q."
                              value={range.min}
                              onChange={e => handlePriceRangeChange(idx, 'min', e.target.value)}
                            />
                            <input
                              className="w-1/4 px-2 py-2 border border-gray-300 rounded-lg"
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Max q."
                              value={range.max}
                              onChange={e => handlePriceRangeChange(idx, 'max', e.target.value)}
                            />
                            <button
                              type="button"
                              className="text-red-500 text-lg px-2"
                              onClick={() => handleRemovePriceRange(idx)}
                              disabled={form.price_ranges.length === 1}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-blue-600 text-sm mt-1 self-start"
                          onClick={handleAddPriceRange}
                        >
                          + Add more
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="block"
                          onChange={handleImageChange}
                        />
                        {imagePreview && <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />}
                      </div>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="available" checked={form.available} onChange={handleFormChange} /> Available
                      </label>
                      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
                    </div>
                    <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold" onClick={handleSave} disabled={loading}>{editing ? 'Išsaugoti pakeitimus' : 'Išsaugoti'}</button>
                    <button className="mt-2 w-full text-gray-500 hover:underline" onClick={() => { setShowModal(false); handleCancel(); }}>Atšaukti</button>
                  </div>
                </div>
              )}
              {/* Modal for product stats */}
              {showStats && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setShowStats(null)}>
                  <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-lg p-6 w-full max-w-md mx-auto animate-slide-in-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-4">Statistika: {showStats.name}</h3>
                    <div>Produktas parduotas: <span className="font-bold">{stats.find(s => s.name === showStats.name)?.count || 0}</span> vnt.</div>
                    <button className="mt-4 w-full text-gray-500 hover:underline" onClick={() => setShowStats(null)}>Uždaryti</button>
                  </div>
                </div>
              )}
            </div>
            {/* Admin user management */}
            <div className="bg-white rounded-xl shadow p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-2">Administratoriai</h3>
              <AdminUsersPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminUsersPanel() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setError('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    if (!userId) return setError('User ID required');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, nickname })
      });
      if (!res.ok) throw new Error('Failed to add user');
      setUserId(''); setNickname('');
      fetchUsers();
    } catch (e) {
      setError('Error adding user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (uid) => {
    if (!window.confirm('Remove this admin user?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid })
      });
      if (!res.ok) throw new Error('Failed to remove user');
      fetchUsers();
    } catch (e) {
      setError('Error removing user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-2 mb-4 max-w-xl">
        <input
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg max-w-xs"
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <input
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg max-w-xs"
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap"
          onClick={handleAdd}
          disabled={loading}
        >Pridėti</button>
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <ul className="divide-y divide-gray-200">
        {users.map(u => (
          <li key={u.user_id} className="flex items-center justify-between py-2">
            <div className="flex flex-col text-left">
              <span className="font-mono text-sm">{u.user_id}</span>
              {u.nickname && <span className="text-xs text-gray-500">{u.nickname}</span>}
            </div>
            <button
              className="text-red-600 hover:underline text-xs"
              onClick={() => handleRemove(u.user_id)}
              disabled={loading}
            >Pašalinti</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DriverStatsPanel() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/admin-users?stats=1')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error loading stats');
        setLoading(false);
      });
  }, []);

  // Aggregate totals per user
  const userTotals = {};
  stats.forEach(s => {
    if (!userTotals[s.user_id]) userTotals[s.user_id] = { orders: 0, profit: 0, hours: 0, km: 0, nickname: s.nickname };
    userTotals[s.user_id].orders += Number(s.orders_delivered || 0);
    userTotals[s.user_id].profit += Number(s.profit || 0);
    userTotals[s.user_id].hours += Number(s.hours_worked || 0);
    userTotals[s.user_id].km += Number(s.km_driven || 0);
  });

  // Columns for per-day stats
  const statsColumns = [
    { accessorKey: 'user_id', header: 'User ID', cell: info => <span className="font-mono">{info.getValue()}</span> },
    { accessorKey: 'nickname', header: 'Nickname', cell: info => info.getValue() || '-' },
    { accessorKey: 'date', header: 'Date', cell: info => info.getValue() },
    { accessorKey: 'orders_delivered', header: 'Orders', cell: info => info.getValue() },
    { accessorKey: 'profit', header: 'Profit (€)', cell: info => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'hours_worked', header: 'Hours', cell: info => info.getValue() },
    { accessorKey: 'km_driven', header: 'KM', cell: info => info.getValue() },
  ];
  // Columns for totals per driver
  const totalsColumns = [
    { accessorKey: 'user_id', header: 'User ID', cell: info => <span className="font-mono">{info.getValue()}</span> },
    { accessorKey: 'nickname', header: 'Nickname', cell: info => info.getValue() || '-' },
    { accessorKey: 'orders', header: 'Orders', cell: info => info.getValue() },
    { accessorKey: 'profit', header: 'Profit (€)', cell: info => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'hours', header: 'Hours', cell: info => info.getValue() },
    { accessorKey: 'km', header: 'KM', cell: info => info.getValue() },
  ];
  // Prepare totals data as array
  const totalsData = Object.entries(userTotals).map(([user_id, t]) => ({ user_id, ...t }));
  return (
    <div className="overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4">All Drivers - Stats</h3>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <DataTable columns={statsColumns} data={stats} className="min-w-full text-xs md:text-sm border shadow rounded-lg overflow-x-auto" />
          </div>
          <h4 className="mt-6 mb-2 text-left font-semibold">Totals per Driver</h4>
          <div className="overflow-x-auto">
            <DataTable columns={totalsColumns} data={totalsData} className="min-w-full text-xs md:text-sm border shadow rounded-lg overflow-x-auto" />
          </div>
        </>
      )}
    </div>
  );
}

function AdminChatPanel({ adminPassword }) {
  // For demo, use adminPassword as user_id; in real app, use Telegram user info
  const user_id = adminPassword || 'admin';
  const nickname = 'Admin';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin-messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setError('Error loading messages');
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, nickname, message: input })
      });
      if (!res.ok) throw new Error('Failed to send');
      setInput('');
      fetchMessages();
    } catch {
      setError('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto border rounded-lg p-2 bg-gray-50 mb-2">
        {messages.map(m => (
          <div key={m.id} className="mb-2">
            <span className="font-mono text-xs text-gray-500">{m.nickname || m.user_id}</span>
            <span className="ml-2 text-xs text-gray-400">{new Date(m.created_at).toLocaleTimeString()}</span>
            <div className="text-sm text-gray-800 bg-white rounded p-2 shadow-sm inline-block mt-1">{m.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >Send</button>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
}

function ProductManagementPanel() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price_ranges: [{ price: '', min: '', max: '' }], image_url: '', available: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState([]);
  const [statsPeriod, setStatsPeriod] = useState('month');
  const [imagePreview, setImagePreview] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(null); // product for stats

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setError('Error loading products');
    } finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/products-stats?period=${statsPeriod}`);
      const data = await res.json();
      setStats(data.stats || []);
    } catch {}
  };
  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { fetchStats(); }, [statsPeriod]);

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const handlePriceRangeChange = (idx, field, value) => {
    setForm(f => {
      const ranges = f.price_ranges.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      return { ...f, price_ranges: ranges };
    });
  };
  const handleAddPriceRange = () => {
    setForm(f => ({ ...f, price_ranges: [...f.price_ranges, { price: '', min: '', max: '' }] }));
  };
  const handleRemovePriceRange = idx => {
    setForm(f => ({ ...f, price_ranges: f.price_ranges.filter((_, i) => i !== idx) }));
  };
  const handleEdit = p => {
    setEditing(p.id);
    setForm({
      name: p.name,
      price_ranges: Array.isArray(p.price_ranges) ? p.price_ranges : [],
      image_url: p.image_url || '',
      available: p.available
    });
    setImagePreview(p.image_url || '');
  };
  const handleCancel = () => {
    setEditing(null);
    setForm({ name: '', price_ranges: [{ price: '', min: '', max: '' }], image_url: '', available: true });
    setImagePreview('');
  };
  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const { name, price_ranges, image_url, available } = form;
      // Validate price_ranges
      const validRanges = price_ranges.filter(r => r.price && r.min && r.max);
      if (!name || validRanges.length === 0) throw new Error('Name and at least one valid price range required');
      const body = {
        name,
        price_ranges: validRanges.map(r => ({ price: Number(r.price), min: Number(r.min), max: Number(r.max) })),
        image_url,
        available,
      };
      if (editing) body.id = editing;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to save');
      fetchProducts();
      handleCancel();
    } catch (err) {
      setError(err.message || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };
  const handleRemove = async id => {
    if (!window.confirm('Remove this product?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to remove');
      fetchProducts();
    } catch {
      setError('Error removing product');
    } finally {
      setLoading(false);
    }
  };
  // Image picker/upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setError('');
    setLoading(true);
    try {
      // Use Vercel Blob upload
      const formData = new FormData();
      formData.append('file', file);
      // POST to /api/upload (see below for backend handler)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setForm(f => ({ ...f, image_url: data.url }));
      } else {
        setError('Image upload failed');
      }
    } catch {
      setError('Image upload failed');
    } finally {
      setLoading(false);
    }
  };
  // Define columns for DataTable
  const columns = [
    { accessorKey: 'id', header: 'ID', cell: info => info.getValue() },
    { accessorKey: 'name', header: 'Name', cell: info => info.getValue() },
    { accessorKey: 'price_1', header: 'Price 1pc (€)', cell: info => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'price_2', header: 'Price 2pcs (€)', cell: info => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'price_3', header: 'Price 3pcs (€)', cell: info => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'image_url', header: 'Image', cell: info => info.getValue() ? <img src={info.getValue()} alt="" className="w-10 h-10 object-cover rounded" /> : null },
    { accessorKey: 'available', header: 'Available', cell: info => info.getValue() ? 'Yes' : 'No' },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-2">
        <button className="text-blue-600 hover:underline text-xs mr-2" onClick={() => handleEdit(row.original)}>Edit</button>
        <button className="text-red-600 hover:underline text-xs" onClick={() => handleRemove(row.original.id)}>Remove</button>
      </div>
    ) },
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Produktų valdymas</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold" onClick={() => setShowModal(true)}>+ Pridėti naują</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {products.map(product => (
          <div key={product.id} className="relative group">
            <ProductCard product={product} quantity={0} onQuantityChange={() => {}} />
            <button
              className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs opacity-90 group-hover:opacity-100"
              onClick={() => { setEditing(product.id); setShowModal(true); handleEdit(product); }}
            >Redaguoti</button>
            <button
              className="absolute bottom-2 right-2 bg-gray-700 text-white px-2 py-1 rounded text-xs opacity-80 group-hover:opacity-100"
              onClick={() => setShowStats(product)}
            >Statistika</button>
          </div>
        ))}
      </div>
      <div className="flex justify-center mb-8">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold" onClick={() => { setEditing(null); setForm({ name: '', price_ranges: [{ price: '', min: '', max: '' }], image_url: '', available: true }); setImagePreview(''); setShowModal(true); }}>
          + Pridėti naują
        </button>
      </div>
      {/* Slide-in modal for add/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => { setShowModal(false); handleCancel(); }}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-lg p-6 w-full max-w-md mx-auto animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Redaguoti produktą' : 'Pridėti naują produktą'}</h3>
            <div className="mb-4 flex flex-col gap-3">
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                name="name"
                placeholder="Product name"
                value={form.name}
                onChange={handleFormChange}
              />
              <div className="flex flex-col gap-2">
                {form.price_ranges.map((range, idx) => (
                  <div className="flex gap-2 items-center" key={idx}>
                    <input
                      className="w-1/3 px-2 py-2 border border-gray-300 rounded-lg"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price (€)"
                      value={range.price}
                      onChange={e => handlePriceRangeChange(idx, 'price', e.target.value)}
                    />
                    <input
                      className="w-1/4 px-2 py-2 border border-gray-300 rounded-lg"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Min q."
                      value={range.min}
                      onChange={e => handlePriceRangeChange(idx, 'min', e.target.value)}
                    />
                    <input
                      className="w-1/4 px-2 py-2 border border-gray-300 rounded-lg"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Max q."
                      value={range.max}
                      onChange={e => handlePriceRangeChange(idx, 'max', e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-red-500 text-lg px-2"
                      onClick={() => handleRemovePriceRange(idx)}
                      disabled={form.price_ranges.length === 1}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-blue-600 text-sm mt-1 self-start"
                  onClick={handleAddPriceRange}
                >
                  + Add more
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*"
                  className="block"
                  onChange={handleImageChange}
                />
                {imagePreview && <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />}
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="available" checked={form.available} onChange={handleFormChange} /> Available
              </label>
              {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
            </div>
            <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold" onClick={handleSave} disabled={loading}>{editing ? 'Išsaugoti pakeitimus' : 'Išsaugoti'}</button>
            <button className="mt-2 w-full text-gray-500 hover:underline" onClick={() => { setShowModal(false); handleCancel(); }}>Atšaukti</button>
          </div>
        </div>
      )}
      {/* Modal for product stats */}
      {showStats && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setShowStats(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-lg p-6 w-full max-w-md mx-auto animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Statistika: {showStats.name}</h3>
            <div>Produktas parduotas: <span className="font-bold">{stats.find(s => s.name === showStats.name)?.count || 0}</span> vnt.</div>
            <button className="mt-4 w-full text-gray-500 hover:underline" onClick={() => setShowStats(null)}>Uždaryti</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductStatsGraph({ stats, period }) {
  // Group by product name, then by period
  const grouped = {};
  stats.forEach(s => {
    if (!grouped[s.name]) grouped[s.name] = [];
    grouped[s.name].push({ period: s.period, count: Number(s.count) });
  });
  const periods = Array.from(new Set(stats.map(s => s.period))).sort();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs md:text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1 border">Product</th>
            {periods.map(p => <th key={p} className="px-2 py-1 border">{String(p).slice(0, 10)}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([name, arr]) => (
            <tr key={name}>
              <td className="px-2 py-1 border font-semibold">{name}</td>
              {periods.map(p => {
                const found = arr.find(a => a.period === p);
                return <td key={p} className="px-2 py-1 border text-center">{found ? found.count : 0}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RouteOptimizerPanel({ orders }) {
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [etaMap, setEtaMap] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  // Helper: filter active orders
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'arriving');

  // Helper: parse lat/lng from order location
  function parseLatLng(location) {
    try {
      if (typeof location === 'string') location = JSON.parse(location);
    } catch {}
    if (location.lat && location.lng) return [Number(location.lat), Number(location.lng)];
    if (location.manual && typeof location.manual === 'string') {
      const match = location.manual.match(/@([\d.\-]+),([\d.\-]+)/) || location.manual.match(/q=([\d.\-]+),([\d.\-]+)/);
      if (match) return [Number(match[1]), Number(match[2])];
    }
    return null;
  }

  const handleFetchLocation = () => {
    setLocating(true); setError('');
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError('Failed to get driver location');
        setLocating(false);
      }
    );
  };

  const handleOptimize = async () => {
    setLoading(true); setError(''); setRoute([]); setEtaMap({});
    if (!driverLocation) {
      setError('Pirma gaukite savo lokaciją');
      setLoading(false);
      return;
    }
    const order_ids = activeOrders.map(o => o.order_id);
    if (!order_ids.length) {
      setError('No active orders to optimize');
      setLoading(false);
      return;
    }
    try {
      // 2. Call backend to get optimal route and ETAs
      const res = await fetch('/api/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids,
          driver_location: driverLocation
        })
      });
      const data = await res.json();
      if (!data.route) {
        setError('No route found');
        setLoading(false);
        return;
      }
      setRoute(data.route);
      // 3. Use Google-provided ETAs
      const etaMapNew = {};
      data.route.forEach((order_id, idx) => {
        etaMapNew[order_id] = data.etas && data.etas[idx] ? data.etas[idx] : '';
      });
      setEtaMap(etaMapNew);
      // 4. Update each order's ETA in backend
      for (const [idx, order_id] of data.route.entries()) {
        const etaVal = etaMapNew[order_id];
        const order = activeOrders.find(o => o.order_id === order_id);
        if (!order) continue;
        await fetch('/api/admin-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id,
            status: order.status,
            comment: order.comment,
            eta: String(etaVal),
            driver_location: JSON.stringify(parseLatLng(order.location)),
            admin_note: order.admin_note,
            user_id: order.user_id
          })
        });
      }
    } catch (e) {
      setError('Failed to optimize route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2">
        <button
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold mb-2"
          onClick={handleFetchLocation}
          disabled={locating}
        >{locating ? 'Gaunama lokacija...' : (driverLocation ? 'Lokacija gauta' : 'Gauti mano lokaciją')}</button>
        <button
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          onClick={handleOptimize}
          disabled={loading || !activeOrders.length || !driverLocation}
        >Optimize Route</button>
      </div>
      {driverLocation && <div className="text-xs text-green-700 mb-2">Lokacija: {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}</div>}
      {loading && <div className="text-blue-600">Calculating...</div>}
      {error && <div className="text-red-600 mb-2 font-semibold">{error}</div>}
      {route.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Recommended Delivery Order:</h4>
          <ol className="list-decimal ml-6">
            {route.map((order_id, idx) => {
              const o = activeOrders.find(x => x.order_id === order_id);
              return <li key={order_id} className="mb-2"><span className="font-mono text-xs">{order_id}</span> {o && o.location && <span className="text-xs text-gray-700">{typeof o.location === 'string' ? o.location.slice(0, 30) : JSON.stringify(o.location).slice(0, 30)}</span>} {etaMap[order_id] && <span className="ml-2 text-green-700">ETA: {etaMap[order_id]} min</span>}</li>;
            })}
          </ol>
        </div>
      )}
    </div>
  );
} 