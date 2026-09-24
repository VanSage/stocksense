import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import { StatCard, ProductThumb } from '../components/Shared';
import { SalesTrendChart } from '../components/Charts';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [movers, setMovers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, t, m, a] = await Promise.all([
          api.getSummary(),
          api.getSalesTrend(14),
          api.getTopMovers(5),
          api.getAlerts(),
        ]);
        if (cancelled) return;
        setSummary(s);
        setTrend(t);
        setMovers(m);
        setAlerts(a);
      } catch (err) {
        if (!cancelled) setError('Could not load dashboard data. Is the backend running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="empty-state">Loading dashboard…</div>;
  }
  if (error) {
    return <div className="empty-state text-danger">{error}</div>;
  }

  return (
    <div className="fade-page">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <div className="section-eyebrow mb-1">Good to see you</div>
          <h2 className="section-title mb-0">Here's how {user?.shop?.name || 'your shop'} is doing today</h2>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-cash-coin" iconBg="#FDF1DD" iconColor="#DB8B0E" label="Today's Sales"
            value={Math.round(summary.today_sales)} prefix="₹" delay={0} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-exclamation-triangle-fill" iconBg="#FCEAEA" iconColor="#E85555" label="Items Low on Stock"
            value={summary.low_stock_count} delay={60} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-bell-fill" iconBg="#FDF1DD" iconColor="#DB8B0E" label="Active Alerts"
            value={summary.active_alerts} delay={120} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-piggy-bank-fill" iconBg="#E9F7F4" iconColor="#0FA28C" label="Est. Savings (30 days)"
            value={Math.round(summary.estimated_savings)} prefix="₹" delay={180} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-people-fill" iconBg="#F6EAF9" iconColor="#8B5FA8" label="Udhaar Outstanding"
            value={Math.round(summary.total_credit_outstanding || 0)} prefix="₹" delay={240} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card-soft p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="section-eyebrow mb-1">Last 14 days</div>
                <h5 className="section-title mb-0" style={{ fontSize: '18px' }}>Sales trend</h5>
              </div>
              <span className="chip-filter active">Revenue</span>
            </div>
            {trend.length === 0 ? (
              <div className="empty-state">No sales logged yet — log your first sale to see a trend here.</div>
            ) : (
              <SalesTrendChart data={trend} />
            )}
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card-soft p-4 h-100">
            <div className="section-eyebrow mb-1">Predicted demand</div>
            <h5 className="section-title mb-3" style={{ fontSize: '18px' }}>Top movers this week</h5>
            {movers.length === 0 ? (
              <div className="empty-state">Add products to see predictions.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {movers.map((p, i) => (
                  <div key={p.product_id} className="d-flex align-items-center gap-3">
                    <ProductThumb category="Groceries" />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold text-truncate" style={{ fontSize: '13.5px' }}>{p.name}</div>
                      <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                        ~{p.predicted_demand_7d} units / week
                      </div>
                    </div>
                    <div className="font-display fw-bold" style={{ color: 'var(--saffron-deep)' }}>#{i + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-soft p-4 mt-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div className="section-eyebrow mb-1">Needs action</div>
            <h5 className="section-title mb-0" style={{ fontSize: '18px' }}>Recent alerts</h5>
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="empty-state">Nothing needs your attention right now.</div>
        ) : (
          <div className="row g-3">
            {alerts.slice(0, 3).map((a) => (
              <div className="col-md-4" key={a.id}>
                <div className="alert-card h-100">
                  <div className="alert-icon" style={{
                    background: a.severity === 'critical' ? '#FCEAEA' : '#FDF1DD',
                    color: a.severity === 'critical' ? '#E85555' : '#DB8B0E',
                  }}>
                    <i className={`bi ${a.kind === 'wastage' ? 'bi-hourglass-split' : 'bi-box-seam-fill'}`}></i>
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: '13.5px' }}>{a.product_name}</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>{a.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
