import { useEffect, useState } from 'react';
import * as api from '../api';
import { StatusChip, productIcon, productTint } from '../components/Shared';

function Group({ title, icon, items, tint, color, onResolve }) {
  return (
    <div className="mb-4">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="alert-icon" style={{ background: tint, color, width: 34, height: 34, fontSize: 15 }}>
          <i className={`bi ${icon}`}></i>
        </div>
        <h5 className="section-title mb-0" style={{ fontSize: '17px' }}>{title}</h5>
        <span className="chip-filter">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="card-soft empty-state">Nothing here — you're all caught up.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {items.map((a) => (
            <div className="alert-card justify-content-between align-items-center flex-wrap" key={a.id}>
              <div className="d-flex gap-3 align-items-center">
                <div className="prod-thumb" style={{ background: productTint(a.category) }}>
                  <i className={`bi ${productIcon(a.category)}`}></i>
                </div>
                <div>
                  <div className="fw-semibold" style={{ fontSize: '14px' }}>{a.product_name}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>{a.message}</div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                <StatusChip status={a.severity} />
                <button className="btn-ss-outline" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => onResolve(a.id)}>
                  <i className="bi bi-check2"></i> Mark handled
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      setError('Could not load alerts. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolve(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id)); // optimistic
    try {
      await api.resolveAlert(id);
    } catch (err) {
      load(); // roll back to server truth on failure
    }
  }

  if (loading) return <div className="empty-state">Loading alerts…</div>;
  if (error) return <div className="empty-state text-danger">{error}</div>;

  const reorder = alerts.filter((a) => a.kind === 'reorder');
  const wastage = alerts.filter((a) => a.kind === 'wastage');

  return (
    <div className="fade-page">
      <div className="mb-4">
        <div className="section-eyebrow mb-1">Stay ahead of the shelf</div>
        <h2 className="section-title mb-0">Alerts</h2>
      </div>
      <Group title="Reorder alerts" icon="bi-box-seam-fill" items={reorder} tint="#FCEAEA" color="#E85555" onResolve={handleResolve} />
      <Group title="Wastage warnings" icon="bi-hourglass-split" items={wastage} tint="#FDF1DD" color="#DB8B0E" onResolve={handleResolve} />
    </div>
  );
}
