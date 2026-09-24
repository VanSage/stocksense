import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import * as api from '../api';
import { ProductThumb, PulseBar, StatusChip, Toast } from '../components/Shared';

const EMPTY_FORM = { name: '', category: 'Groceries', unit: 'unit', perishable: false, current_stock: 0, price: 0 };

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  async function load() {
    try {
      const data = await api.getStock();
      setStock(data);
    } catch (err) {
      setError('Could not load stock. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categories = ['All', ...new Set(stock.map((p) => p.category))];
  const rows = stock.filter(
    (p) => (filter === 'All' || p.category === filter) && p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddProduct(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createProduct({
        ...form,
        current_stock: Number(form.current_stock),
        price: Number(form.price),
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setToast('Product added');
      await load();
      setTimeout(() => setToast(''), 2400);
    } catch (err) {
      setToast(err?.response?.data?.detail || 'Could not add product.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading stock…</div>;
  if (error) return <div className="empty-state text-danger">{error}</div>;

  return (
    <div className="fade-page">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <div className="section-eyebrow mb-1">Live inventory</div>
          <h2 className="section-title mb-0">Stock &amp; predicted demand</h2>
        </div>
        <div className="d-flex gap-2">
          <div className="search-pill" style={{ maxWidth: 260 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-ss-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg"></i> Add product
          </button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {categories.map((c) => (
          <button key={c} className={`chip-filter ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="card-soft p-4">
        {rows.length === 0 ? (
          <div className="empty-state">
            {stock.length === 0 ? 'No products yet — add your first one to get started.' : 'No products match your search.'}
          </div>
        ) : (
          <table className="ss-table">
            <thead>
              <tr>
                <th>Product</th><th>Category</th><th>Stock</th><th>7-day predicted</th>
                <th style={{ width: 160 }}>Stock health</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const ratio = p.predicted_demand_7d > 0 ? p.current_stock / p.predicted_demand_7d : 1;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <ProductThumb category={p.category} />
                        <span className="fw-semibold">{p.name}</span>
                        {p.perishable && (
                          <i className="bi bi-clock-history" title="Perishable" style={{ color: 'var(--ink-soft)', fontSize: 12 }}></i>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-soft)' }}>{p.category}</td>
                    <td className="font-mono fw-semibold">{p.current_stock}</td>
                    <td className="font-mono">{p.predicted_demand_7d}</td>
                    <td><PulseBar status={p.status} ratio={ratio} /></td>
                    <td><StatusChip status={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <form onSubmit={handleAddProduct}>
          <Modal.Header closeButton>
            <Modal.Title className="section-title" style={{ fontSize: 18 }}>Add a product</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Product name</label>
            <input className="ss-input mb-3" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Category</label>
                <select className="ss-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option>Groceries</option><option>Dairy</option><option>Bakery</option>
                  <option>Pharmacy</option><option>Stationery</option><option>Beverages</option>
                  <option>Household</option><option>Personal Care</option>
                </select>
              </div>
              <div className="col-6">
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Unit</label>
                <input className="ss-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Current stock</label>
                <input className="ss-input" type="number" min="0" value={form.current_stock}
                  onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Price (₹/unit)</label>
                <input className="ss-input" type="number" min="0" step="0.01" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="perishable" checked={form.perishable}
                onChange={(e) => setForm({ ...form, perishable: e.target.checked })} />
              <label className="form-check-label" htmlFor="perishable" style={{ fontSize: 13.5 }}>
                This product is perishable
              </label>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn-ss-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-ss-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add product'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
