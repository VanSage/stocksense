import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { doSignup, authError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shop_name: '', category: 'Kirana', location: '', full_name: '', email: '', password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await doSignup(form);
    setSubmitting(false);
    if (ok) navigate('/');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-orb" style={{ width: 420, height: 420, background: 'var(--teal)', top: -140, right: -100 }}></div>
      <div className="auth-orb" style={{ width: 340, height: 340, background: 'var(--saffron)', bottom: -120, left: 60 }}></div>

      <div className="auth-left">
        <div className="d-flex align-items-center gap-2 mb-5">
          <div className="brand-mark">S</div>
          <div className="brand-word" style={{ fontSize: 22 }}>StockSense</div>
        </div>
        <h1 className="font-display fw-bold" style={{ fontSize: 40, lineHeight: 1.15, maxWidth: 500 }}>
          Set up your shop in under a minute.
        </h1>
        <p style={{ color: '#C9C0D8', fontSize: 16, maxWidth: 440, marginTop: 14 }}>
          No credit card, no hardware, no IT setup. Just tell us about your shop and start logging sales.
        </p>
      </div>

      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h3 className="font-display fw-bold mb-1">Create your shop</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }} className="mb-4">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--saffron-deep)', fontWeight: 600, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>

          {authError && (
            <div className="mb-3" style={{ background: '#FCEAEA', color: '#E85555', padding: '10px 14px', borderRadius: 10, fontSize: 13.5 }}>
              {authError}
            </div>
          )}

          <div className="row g-2 mb-3">
            <div className="col-8">
              <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Shop name</label>
              <input className="ss-input" value={form.shop_name} onChange={(e) => update('shop_name', e.target.value)} required />
            </div>
            <div className="col-4">
              <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Category</label>
              <select className="ss-input" value={form.category} onChange={(e) => update('category', e.target.value)}>
                <option>Kirana</option>
                <option>Pharmacy</option>
                <option>Stationery</option>
                <option>Hardware</option>
              </select>
            </div>
          </div>

          <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Location</label>
          <input className="ss-input mb-3" placeholder="City, State" value={form.location} onChange={(e) => update('location', e.target.value)} />

          <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Your name</label>
          <input className="ss-input mb-3" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />

          <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Email</label>
          <input className="ss-input mb-3" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />

          <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Password</label>
          <input className="ss-input mb-4" type="password" minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} required />

          <button className="btn-ss-primary w-100 d-flex align-items-center justify-content-center gap-2" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create shop & enter'} <i className="bi bi-arrow-right"></i>
          </button>
        </form>
      </div>
    </div>
  );
}
