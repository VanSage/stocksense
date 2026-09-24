import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import * as api from '../api';
import { Toast } from '../components/Shared';

function money(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function BalanceChip({ balance }) {
  if (balance <= 0) {
    return <span className="status-chip healthy"><span className="dot"></span>Settled</span>;
  }
  const cls = balance > 1000 ? 'critical' : 'watch';
  return <span className={`status-chip ${cls}`}><span className="dot"></span>Owes {money(balance)}</span>;
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txnForm, setTxnForm] = useState({ kind: 'payment', amount: '', note: '' });
  const [txnSaving, setTxnSaving] = useState(false);
  const [txnError, setTxnError] = useState('');

  async function load() {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Could not load customers. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);

  async function handleAddCustomer(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createCustomer(addForm);
      setShowAddModal(false);
      setAddForm({ name: '', phone: '', address: '' });
      setToast('Customer added');
      await load();
      setTimeout(() => setToast(''), 2400);
    } catch (err) {
      setToast(err?.response?.data?.detail || 'Could not add customer.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function openLedger(customer) {
    setLedgerCustomer(customer);
    setTxnForm({ kind: 'payment', amount: '', note: '' });
    setTxnError('');
    try {
      const txns = await api.getCustomerTransactions(customer.id);
      setTransactions(txns);
    } catch (err) {
      setTransactions([]);
    }
  }

  async function handleAddTransaction(e) {
    e.preventDefault();
    setTxnError('');
    const amount = Number(txnForm.amount);
    if (!amount || amount <= 0) {
      setTxnError('Enter an amount greater than zero.');
      return;
    }
    setTxnSaving(true);
    try {
      await api.addCustomerTransaction(ledgerCustomer.id, { kind: txnForm.kind, amount, note: txnForm.note });
      const [txns, updatedCustomer] = await Promise.all([
        api.getCustomerTransactions(ledgerCustomer.id),
        api.getCustomer(ledgerCustomer.id),
      ]);
      setTransactions(txns);
      setLedgerCustomer(updatedCustomer);
      setTxnForm({ kind: 'payment', amount: '', note: '' });
      await load();
    } catch (err) {
      setTxnError(err?.response?.data?.detail || 'Could not record transaction.');
    } finally {
      setTxnSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading customers…</div>;
  if (error) return <div className="empty-state text-danger">{error}</div>;

  return (
    <div className="fade-page">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <div className="section-eyebrow mb-1">Udhaar ledger</div>
          <h2 className="section-title mb-0">Customers &amp; credit</h2>
        </div>
        <div className="d-flex gap-2">
          <div className="search-pill" style={{ maxWidth: 260 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-ss-primary d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
            <i className="bi bi-person-plus-fill"></i> Add customer
          </button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card-soft p-4" style={{ background: 'linear-gradient(135deg, var(--ink-plum), #2E2239)', color: '#fff' }}>
            <div style={{ fontSize: 12.5, color: '#B9AFC9', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Total outstanding (udhaar)
            </div>
            <div className="font-display fw-bold" style={{ fontSize: 34, marginTop: 6 }}>{money(totalOutstanding)}</div>
            <div style={{ fontSize: 13, color: '#C9C0D8', marginTop: 6 }}>Across {customers.length} customer{customers.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      </div>

      <div className="card-soft p-4">
        {rows.length === 0 ? (
          <div className="empty-state">
            {customers.length === 0 ? 'No customers yet — add your first one to start tracking udhaar.' : 'No customers match your search.'}
          </div>
        ) : (
          <table className="ss-table">
            <thead>
              <tr><th>Customer</th><th>Phone</th><th>Address</th><th>Balance</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="fw-semibold">{c.name}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{c.phone || '—'}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{c.address || '—'}</td>
                  <td><BalanceChip balance={c.balance} /></td>
                  <td>
                    <button className="btn-ss-outline" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => openLedger(c)}>
                      <i className="bi bi-journal-text"></i> Ledger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add customer modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <form onSubmit={handleAddCustomer}>
          <Modal.Header closeButton>
            <Modal.Title className="section-title" style={{ fontSize: 18 }}>Add a customer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Name</label>
            <input className="ss-input mb-3" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Phone</label>
            <input className="ss-input mb-3" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Address</label>
            <input className="ss-input" value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} />
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn-ss-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn-ss-primary" disabled={saving}>{saving ? 'Saving…' : 'Add customer'}</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Ledger modal */}
      <Modal show={!!ledgerCustomer} onHide={() => setLedgerCustomer(null)} centered size="lg">
        {ledgerCustomer && (
          <>
            <Modal.Header closeButton>
              <div>
                <Modal.Title className="section-title" style={{ fontSize: 18 }}>{ledgerCustomer.name}</Modal.Title>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{ledgerCustomer.phone || 'No phone on file'}</div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <div className="stat-label">Current balance</div>
                  <div className="stat-value font-mono" style={{ fontSize: 26 }}>{money(Math.max(0, ledgerCustomer.balance))}</div>
                </div>
                <BalanceChip balance={ledgerCustomer.balance} />
              </div>

              <form onSubmit={handleAddTransaction} className="card-soft p-3 mb-4" style={{ background: '#FBF8F2' }}>
                {txnError && (
                  <div className="mb-2" style={{ background: '#FCEAEA', color: '#E85555', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
                    {txnError}
                  </div>
                )}
                <div className="row g-2 align-items-end">
                  <div className="col-4">
                    <label className="fw-semibold mb-1 d-block" style={{ fontSize: 12.5 }}>Type</label>
                    <select className="ss-input" value={txnForm.kind} onChange={(e) => setTxnForm({ ...txnForm, kind: e.target.value })}>
                      <option value="payment">Payment received</option>
                      <option value="credit">Add credit (manual)</option>
                    </select>
                  </div>
                  <div className="col-3">
                    <label className="fw-semibold mb-1 d-block" style={{ fontSize: 12.5 }}>Amount (₹)</label>
                    <input className="ss-input" type="number" min="0" step="0.01" value={txnForm.amount}
                      onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} required />
                  </div>
                  <div className="col-3">
                    <label className="fw-semibold mb-1 d-block" style={{ fontSize: 12.5 }}>Note (optional)</label>
                    <input className="ss-input" value={txnForm.note} onChange={(e) => setTxnForm({ ...txnForm, note: e.target.value })} />
                  </div>
                  <div className="col-2">
                    <button className="btn-ss-primary w-100" disabled={txnSaving}>{txnSaving ? '…' : 'Add'}</button>
                  </div>
                </div>
              </form>

              <h6 className="fw-bold mb-2" style={{ fontSize: 14 }}>Transaction history</h6>
              {transactions.length === 0 ? (
                <div className="empty-state">No transactions yet.</div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table className="ss-table">
                    <thead><tr><th>Type</th><th>Amount</th><th>Note</th><th>Date</th></tr></thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <span className={`status-chip ${t.kind === 'credit' ? 'watch' : 'healthy'}`}>
                              <span className="dot"></span>{t.kind === 'credit' ? 'Credit given' : 'Payment received'}
                            </span>
                          </td>
                          <td className="font-mono fw-semibold">{money(t.amount)}</td>
                          <td style={{ color: 'var(--ink-soft)' }}>{t.note || '—'}</td>
                          <td style={{ color: 'var(--ink-soft)' }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal.Body>
          </>
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
