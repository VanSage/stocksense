import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'bi-grid-1x2-fill', end: true },
  { to: '/sales', label: 'Sales Entry', icon: 'bi-cash-coin' },
  { to: '/stock', label: 'Stock', icon: 'bi-box-seam-fill' },
  { to: '/customers', label: 'Customers', icon: 'bi-people-fill' },
  { to: '/alerts', label: 'Alerts', icon: 'bi-bell-fill' },
  { to: '/analytics', label: 'Analytics', icon: 'bi-bar-chart-line-fill' },
];

export default function Sidebar({ open, setOpen, alertCount }) {
  const { user, logout } = useAuth();

  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">S</div>
        <div>
          <div className="brand-word">StockSense</div>
          <div className="brand-sub">Demand Prediction</div>
        </div>
      </div>

      <div className="nav-section-label">Menu</div>
      <div className="side-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`}></i>
            {item.label}
            {item.to === '/alerts' && alertCount > 0 && <span className="badge-count">{alertCount}</span>}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="shop-avatar">{user?.shop?.name?.[0] || 'S'}</div>
        <div>
          <div className="shop-name-sm">{user?.shop?.name || 'Your Shop'}</div>
          <div className="shop-plan-sm">{user?.shop?.category || 'Kirana'} · {user?.shop?.location || ''}</div>
        </div>
        <button className="logout-btn" title="Log out" onClick={logout}>
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}
