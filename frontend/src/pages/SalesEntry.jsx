import { useEffect, useState } from 'react';
import * as api from '../api';
import { ProductThumb, Toast } from '../components/Shared';

export default function SalesEntry() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isCredit, setIsCredit] = useState(false);
  const [customerId, setCustomerId] = useState('');

  async function loadAll() {
    try {
      const [p, s, c] = await Promise.all([api.getProducts(), api.getSales(20), api.getCustomers()]);
      setProducts(p);
      setSales(s);
      setCustomers(c);
    } catch (err) {
      setError('Could not load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const matches = query.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  async function handleLogSale() {
    if (!selected) return;
    if (isCredit && !customerId) {
      setToast('Select a customer to sell on credit.');
      setTimeout(() => setToast(''), 2600);
      return;
    }
    setSubmitting(true);
    try {
      await api.logSale({
        product_id: selected.id,
        quantity: qty,
        is_credit: isCredit,
        customer_id: isCredit ? Number(customerId) : null,
      });
      setToast(isCredit ? `Logged ${qty} × ${selected.name} on credit` : `Logged ${qty} × ${selected.name}`);
      setSelected(null);
      setQuery('');
      setQty(1);
      setIsCredit(false);
      setCustomerId('');
      await loadAll();
      setTimeout(() => setToast(''), 2600);
    } catch (err) {
      setToast(err?.response?.data?.detail || 'Could not log sale.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="empty-state">Loading…</div>;
  if (error) return <div className="empty-state text-danger">{error}</div>;

  return (
    <div className="fade-page">
      <div className="mb-4">
        <div className="section-eyebrow mb-1">Sales logging</div>
        <h2 className="section-title mb-0">Record today's sales</h2>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card-soft p-4">
            {products.length === 0 ? (
              <div className="empty-state">
                No products yet. Add products from the Stock page before logging sales.
              </div>
            ) : (
              <>
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: '13.5px' }}>Search product</label>
                <div className="position-relative">
                  <input
                    className="ss-input"
                    placeholder="Try “milk” or “oil”…"
                    value={selected ? selected.name : query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                  />
                  {matches.length > 0 && !selected && (
                    <div className="card-soft position-absolute w-100 mt-2 p-2" style={{ zIndex: 10, maxHeight: 260, overflowY: 'auto' }}>
                      {matches.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelected(p)}
                          className="d-flex align-items-center gap-2 p-2 rounded-3"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#FBF8F2')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <ProductThumb category={p.category} size={30} fontSize={14} />
                          <div style={{ fontSize: 13.5 }}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="fw-semibold mb-2 mt-3 d-block" style={{ fontSize: '13.5px' }}>Quantity sold</label>
                <div className="d-flex align-items-center gap-3">
                  <button className="btn-ss-outline" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <div className="font-mono fw-bold" style={{ fontSize: 20, minWidth: 32, textAlign: 'center' }}>{qty}</div>
                  <button className="btn-ss-outline" onClick={() => setQty(qty + 1)}>+</button>
                </div>

                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isCredit"
                    checked={isCredit}
                    onChange={(e) => setIsCredit(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isCredit" style={{ fontSize: 13.5 }}>
                    Sell on credit (udhaar)
                  </label>
                </div>

                {isCredit && (
                  <div className="mt-2">
                    <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Customer</label>
                    {customers.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        No customers yet — add one from the Customers page first.
                      </div>
                    ) : (
                      <select className="ss-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                        <option value="">Select a customer…</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <button
                  className="btn-ss-primary w-100 mt-4 d-flex align-items-center justify-content-center gap-2"
                  disabled={!selected || submitting}
                  onClick={handleLogSale}
                >
                  <i className="bi bi-check2-circle"></i> {submitting ? 'Logging…' : isCredit ? 'Log credit sale' : 'Log sale'}
                </button>
                <div className="text-center mt-2" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  No barcode? No problem — search and tap, that's it.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card-soft p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="section-title mb-0" style={{ fontSize: '18px' }}>Recent sales</h5>
              <span className="chip-filter">{sales.length} entries</span>
            </div>
            {sales.length === 0 ? (
              <div className="empty-state">No sales logged yet today.</div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="ss-table">
                  <thead>
                    <tr><th>Product</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-semibold">{s.product_name}</td>
                        <td className="font-mono">{s.quantity}</td>
                        <td className="font-mono">₹{s.amount}</td>
                        <td>
                          {s.is_credit ? (
                            <span className="status-chip watch"><span className="dot"></span>Credit — {s.customer_name}</span>
                          ) : (
                            <span className="status-chip healthy"><span className="dot"></span>Cash</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--ink-soft)' }}>
                          {new Date(s.sold_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}
