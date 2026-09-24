import { useState, useEffect } from 'react';

export function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function statusMeta(status) {
  if (status === 'critical') return { label: 'Reorder now', cls: 'critical' };
  if (status === 'watch') return { label: 'Reorder soon', cls: 'watch' };
  if (status === 'overstock') return { label: 'Wastage risk', cls: 'watch' };
  return { label: 'Healthy', cls: 'healthy' };
}

export function StatusChip({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={`status-chip ${meta.cls}`}>
      <span className="dot"></span>
      {meta.label}
    </span>
  );
}

export function PulseBar({ status, ratio }) {
  const pct = Math.max(6, Math.min(100, Math.round((ratio || 0) * 100)));
  const cls = status === 'overstock' ? 'watch' : status;
  return (
    <div className="pulse-track">
      <div className={`pulse-fill ${cls}`} style={{ width: pct + '%' }}></div>
    </div>
  );
}

export function StatCard({ icon, iconBg, iconColor, label, value, prefix = '', suffix = '', delta, deltaGood, delay = 0 }) {
  const count = useCountUp(value);
  return (
    <div className="card-soft stat-card" style={{ animationDelay: delay + 'ms' }}>
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value font-mono">
        {prefix}
        {count.toLocaleString('en-IN')}
        {suffix}
      </div>
      {delta && (
        <div className="stat-delta" style={{ color: deltaGood ? '#0FA28C' : '#E85555' }}>
          <i className={`bi ${deltaGood ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}></i>
          {delta}
        </div>
      )}
    </div>
  );
}

const CATEGORY_ICONS = {
  Groceries: 'bi-basket2-fill',
  Dairy: 'bi-cup-straw',
  Bakery: 'bi-egg-fried',
  Pharmacy: 'bi-capsule',
  Stationery: 'bi-journal-bookmark',
  Beverages: 'bi-cup-fill',
  Household: 'bi-droplet-half',
  'Personal Care': 'bi-droplet',
};
const CATEGORY_TINTS = {
  Groceries: '#FDF1DD',
  Dairy: '#E9F7F4',
  Bakery: '#FBEAE3',
  Pharmacy: '#EFEAFB',
  Stationery: '#E7F1FC',
  Beverages: '#FCEAF0',
  Household: '#EAF3FD',
  'Personal Care': '#F6EAF9',
};

export function productIcon(category) {
  return CATEGORY_ICONS[category] || 'bi-box-seam-fill';
}
export function productTint(category) {
  return CATEGORY_TINTS[category] || '#F1EBE0';
}

export function ProductThumb({ category, size = 36, fontSize = 16 }) {
  return (
    <div
      className="prod-thumb"
      style={{ background: productTint(category), width: size, height: size, fontSize }}
    >
      <i className={`bi ${productIcon(category)}`}></i>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast-ss">
      <i className="bi bi-check-circle-fill" style={{ color: '#16BFA6' }}></i> {message}
    </div>
  );
}
