import React, { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { createSalesRecord, fetchSalesOrders, updateSalesOrderStatus } from '../api/orders';

function formatDate(value) {
  if (!value) return 'N/A';

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function normalizeOrder(order, index) {
  return {
    ...order,
    _rowKey: order._rowKey || `${order.salesorderid ?? index}-${order.orderdate ?? 'order'}`
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [completionOrder, setCompletionOrder] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    totalamount: '',
    receivedamount: '',
    balanceamount: ''
  });
  const [completionError, setCompletionError] = useState('');
  const [savingCompletion, setSavingCompletion] = useState(false);

  const refreshOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSalesOrders();
      setOrders(Array.isArray(data) ? data.map(normalizeOrder) : []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
      try {
        const data = await fetchSalesOrders();
        if (!mounted) return;
        setOrders(Array.isArray(data) ? data.map(normalizeOrder) : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load orders');
        setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const openCompletionDialog = (order) => {
    setCompletionOrder(order);
    setCompletionError('');
    setCompletionForm({
      totalamount: '',
      receivedamount: '',
      balanceamount: ''
    });
  };

  const closeCompletionDialog = () => {
    setCompletionOrder(null);
    setCompletionError('');
    setSavingCompletion(false);
  };

  const handleCompletionFieldChange = (field) => (event) => {
    const value = event.target.value;

    setCompletionForm((current) => {
      const nextForm = {
        ...current,
        [field]: value
      };

      if (field === 'totalamount' || field === 'receivedamount') {
        const total = Number(nextForm.totalamount || 0);
        const received = Number(nextForm.receivedamount || 0);
        nextForm.balanceamount = (total - received).toFixed(2);
      }

      return nextForm;
    });
  };

  const handleCompleteSave = async () => {
    if (!completionOrder) {
      return;
    }

    const totalAmount = Number(completionForm.totalamount);
    const receivedAmount = Number(completionForm.receivedamount);
    const balanceAmount = Number(completionForm.balanceamount);

    if ([completionForm.totalamount, completionForm.receivedamount, completionForm.balanceamount].some((value) => value === '' || value === null || value === undefined)) {
      setCompletionError('All fields are mandatory.');
      return;
    }

    if ([totalAmount, receivedAmount, balanceAmount].some((value) => Number.isNaN(value))) {
      setCompletionError('Enter valid numeric values for all amount fields.');
      return;
    }

    setSavingCompletion(true);
    setCompletionError('');

    try {
      const orderId = completionOrder.orderid ?? completionOrder.salesorderid;
      const itemList = Array.isArray(completionOrder.salesOrderItems) ? completionOrder.salesOrderItems : [];

      await updateSalesOrderStatus(orderId, {
        deliverystatus: 'DELIVERED'
      });

      const saveTimestamp = new Date();
      const salesPayload = {
        billdate: saveTimestamp.toISOString(),
        billtime: saveTimestamp.toISOString(),
        customermobile: completionOrder.mobileno ?? null,
        totalamount: totalAmount,
        amountreceived: receivedAmount,
        balance: balanceAmount,
        items: itemList.map((item, index) => ({
          itemid: item.itemid ?? null,
          itemname: item.itemname || `Item ${index + 1}`,
          qty: Number(item.quantity ?? item.qty ?? item.orderqty ?? 0)
        }))
      };

      await createSalesRecord(salesPayload);

      setOrders((current) =>
        current.map((order) => {
          const isTarget = (order.orderid ?? order.salesorderid) === orderId;
          if (!isTarget) {
            return order;
          }

          return {
            ...order,
            deliverystatus: 'DELIVERED',
            orderstatus: 'DELIVERED'
          };
        })
      );

      closeCompletionDialog();
    } catch (err) {
      setCompletionError(err.message || 'Failed to complete order.');
    } finally {
      setSavingCompletion(false);
    }
  };

  const visibleOrders = useMemo(() => {
    if (!normalizedSearch) {
      return orders;
    }

    return orders.filter((order) => {
      const searchableText = [
        order.salesorderid,
        order.mobileno,
        order.orderstatus,
        order.orderdate
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [normalizedSearch, orders]);

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="stock-page-shell">
      <div className="stock-page-header">
        <div className="stock-page-title">
          <h1>Orders</h1>
        </div>
        <button type="button" className="refresh-btn" onClick={refreshOrders} disabled={loading} aria-label="Refresh orders">
          <FiRefreshCw />
        </button>
      </div>

      <div className="stock-toolbar">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by order or mobile"
        />
      </div>

      {visibleOrders.length === 0 ? (
        <div className="empty-card">No orders found.</div>
      ) : (
        <div className="stock-list">
          {visibleOrders.map((order) => {
            const orderId = order.orderid ?? order.salesorderid ?? order._rowKey;
            const isExpanded = expandedOrderId === orderId;
            const itemList = Array.isArray(order.salesOrderItems) ? order.salesOrderItems : [];
            const isDelivered = String(order.deliverystatus || '').toUpperCase() === 'DELIVERED';

            return (
              <div
                key={order._rowKey}
                className={`stock-card order-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedOrderId((current) => (current === orderId ? null : orderId))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setExpandedOrderId((current) => (current === orderId ? null : orderId));
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="stock-card-top order-header-row">
                  <div className="order-id-value">Order #{order.orderid || 'N/A'}</div>
                  <span className={`status-badge ${String(order.deliverystatus || '').toLowerCase() === 'order_placed' ? 'out-stock' : 'in-stock'}`}>
                    {order.deliverystatus || 'Pending'}
                  </span>
                  <div className="order-date-value">{formatDate(order.createdat)}</div>
                  <button
                    type="button"
                    className="complete-order-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isDelivered) {
                        openCompletionDialog(order);
                      }
                    }}
                    aria-label="Complete order"
                    disabled={isDelivered}
                  >
                    <FiCheckCircle />
                  </button>
                </div>

                <div className="stock-card-body">
                  <div className={`order-details ${isExpanded ? 'expanded' : ''}`}>
                    <div className="order-details-inner">
                      <div className="order-meta-grid">
                        <div className="stock-field-row">
                          <span className="stock-field-label">Mobile</span>
                          <span className="stock-field-value">{order.mobileno || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="order-items-panel">
                        <div className="order-items-header">Items</div>
                        {itemList.length === 0 ? (
                          <div className="muted">No item details available.</div>
                        ) : (
                          itemList.map((item, index) => (
                            <div key={`${orderId}-${item.itemid ?? index}`} className="order-item-row">
                              <div>
                                <div className="order-item-name">{item.itemname || `Item ${index + 1}`}</div>
                                <div className="muted">{item.itemcode || item.itemid ? `Code ${item.itemcode ?? item.itemid}` : 'Item details'}</div>
                              </div>
                              <div className="order-item-qty">Qty: {item.quantity ?? item.qty ?? item.orderqty ?? '—'}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completionOrder && (
        <div className="modal-backdrop" onClick={closeCompletionDialog}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Complete Order</h3>
            </div>

            <label>
              <span>Total Amount</span>
              <input type="number" min="0" step="0.01" value={completionForm.totalamount} onChange={handleCompletionFieldChange('totalamount')} />
            </label>

            <label>
              <span>Received Amount</span>
              <input type="number" min="0" step="0.01" value={completionForm.receivedamount} onChange={handleCompletionFieldChange('receivedamount')} />
            </label>

            <label>
              <span>Balance Amount</span>
              <input type="number" min="0" step="0.01" value={completionForm.balanceamount} readOnly aria-readonly="true" />
            </label>

            {completionError && <p className="error-text">{completionError}</p>}

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={closeCompletionDialog} disabled={savingCompletion}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCompleteSave} disabled={savingCompletion}>
                {savingCompletion ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
