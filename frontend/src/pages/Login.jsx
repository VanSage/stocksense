import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { doLogin, authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@sharmastore.in');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await doLogin(email, password);
    setSubmitting(false);
    if (ok) navigate('/');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-orb" style={{ width: 420, height: 420, background: 'var(--saffron)', top: -140, right: -100 }}></div>
      <div className="auth-orb" style={{ width: 340, height: 340, background: 'var(--teal)', bottom: -120, left: 60 }}></div>

      <div className="auth-left">
        <div className="d-flex align-items-center gap-2 mb-5">
          <div className="brand-mark">S</div>
          <div className="brand-word" style={{ fontSize: 22 }}>StockSense</div>
        </div>
        <h1 className="font-display fw-bold" style={{ fontSize: 44, lineHeight: 1.15, maxWidth: 520 }}>
          Know what to restock, before the shelf goes empty.
        </h1>
        <p style={{ color: '#C9C0D8', fontSize: 16, maxWidth: 460, marginTop: 14 }}>
          Demand prediction and smart reorder alerts, built for shops that never had a barcode scanner — and never
          needed one.
        </p>

        <div className="mt-5">
          <div className="feature-row">
            <i className="bi bi-graph-up-arrow"></i>
            <div>
              <div className="fw-semibold">Predicts demand per product</div>
              <div style={{ fontSize: 13.5, color: '#B9AFC9' }}>Moving-average forecasting, explained simply.</div>
            </div>
          </div>
          <div className="feature-row">
            <i className="bi bi-bell-fill"></i>
            <div>
              <div className="fw-semibold">Alerts before you run out</div>
              <div style={{ fontSize: 13.5, color: '#B9AFC9' }}>Reorder and wastage warnings, automatically.</div>
            </div>
          </div>
          <div className="feature-row">
            <i className="bi bi-upc-scan"></i>
            <div>
              <div className="fw-semibold">No hardware required</div>
              <div style={{ fontSize: 13.5, color: '#B9AFC9' }}>Just a browser — barcode scanner optional.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h3 className="font-display fw-bold mb-1">Welcome back</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }} className="mb-4">
            Log in to your shop dashboard
          </p>

          {authError && (
            <div className="mb-3" style={{ background: '#FCEAEA', color: '#E85555', padding: '10px 14px', borderRadius: 10, fontSize: 13.5 }}>
              {authError}
            </div>
          )}

          <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13.5 }}>Shop email</label>
          <input className="ss-input mb-3" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13.5 }}>Password</label>
          <input className="ss-input mb-4" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

          <button className="btn-ss-primary w-100 d-flex align-items-center justify-content-center gap-2" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Enter dashboard'} <i className="bi bi-arrow-right"></i>
          </button>

          <div className="text-center mt-4" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Demo login is pre-filled — or{' '}
            <Link to="/signup" style={{ color: 'var(--saffron-deep)', fontWeight: 600, textDecoration: 'none' }}>
              create a new shop account
            </Link>
            .
          </div>
        </form>
      </div>
    </div>
  );
}
