import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders, updateOrderStatus } from '../api/orders';
import { Package, ClipboardList, ShoppingBag, TrendingUp, Check, X, Mail } from 'lucide-react';

const STATUS_COLORS = {
  pending:   'badge-yellow',
  completed: 'badge-green',
  cancelled: 'badge-red',
};

export default function OrdersPage() {
  const [tab, setTab] = useState('buyer');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = (role) => {
    setLoading(true);
    getMyOrders(role).then(({ data }) => setOrders(data.orders)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders(tab);
  }, [tab]);

  const handleStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status);
      fetchOrders(tab);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update order');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Orders</h1>

        <div className="flex gap-2 mb-6">
          {[
            { role: 'buyer',  label: 'Purchases', Icon: ShoppingBag },
            { role: 'seller', label: 'Sales',     Icon: TrendingUp },
          ].map(({ role, label, Icon }) => (
            <button
              key={role}
              onClick={() => setTab(role)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tab === role
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList size={48} className="mx-auto mb-3 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">
              No {tab === 'buyer' ? 'purchases' : 'sales'} yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex gap-4">
                  <Link to={`/listings/${order.listing_id}`} className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                      {order.images?.[0] ? (
                        <img src={order.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : <Package size={24} className="text-slate-300" />}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/listings/${order.listing_id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 truncate transition-colors"
                      >
                        {order.title}
                      </Link>
                      <span className={`badge flex-shrink-0 ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-blue-600 font-semibold text-sm mt-0.5">
                      ${parseFloat(order.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {tab === 'buyer' ? `Seller: ${order.seller_name}` : `Buyer: ${order.buyer_name}`}
                      {' · '}
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>

                    {order.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        {tab === 'seller' && (
                          <button
                            onClick={() => handleStatus(order.id, 'completed')}
                            className="flex items-center gap-1 btn-primary text-xs py-1 px-2.5"
                          >
                            <Check size={12} />
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleStatus(order.id, 'cancelled')}
                          className="flex items-center gap-1 btn-secondary text-xs py-1 px-2.5"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      </div>
                    )}

                    {order.status === 'completed' && tab === 'seller' && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Mail size={11} />
                        Buyer: {order.buyer_email}
                      </div>
                    )}
                    {order.status === 'pending' && tab === 'buyer' && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Mail size={11} />
                        Contact seller: {order.seller_email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
