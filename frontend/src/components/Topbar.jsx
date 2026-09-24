import { useNavigate } from 'react-router-dom';

export default function Topbar({ setOpen, alertCount, onOpenSettings }) {
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <button className="icon-btn hamburger" onClick={() => setOpen((o) => !o)}>
        <i className="bi bi-list" style={{ fontSize: 20 }}></i>
      </button>
      <div className="search-pill d-none d-md-flex">
        <i className="bi bi-search"></i>
        <input placeholder="Search products, alerts…" disabled />
      </div>
      <div className="ms-auto d-flex align-items-center gap-2">
        <button className="icon-btn" title="View alerts" onClick={() => navigate('/alerts')}>
          <i className="bi bi-bell"></i>
          {alertCount > 0 && <span className="ping-dot"></span>}
        </button>
        <button className="icon-btn" title="Settings" onClick={onOpenSettings}>
          <i className="bi bi-gear"></i>
        </button>
      </div>
    </div>
  );
}
