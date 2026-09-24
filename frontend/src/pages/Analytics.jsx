import { useEffect, useState } from 'react';
import * as api from '../api';
import { SalesTrendChart, CategoryDonut, MoversBarChart } from '../components/Charts';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [movers, setMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, t, b, m] = await Promise.all([
          api.getSummary(),
          api.getSalesTrend(14),
          api.getCategoryBreakdown(),
          api.getTopMovers(6),
        ]);
        if (cancelled) return;
        setSummary(s); setTrend(t); setBreakdown(b); setMovers(m);
      } catch (err) {
        if (!cancelled) setError('Could not load analytics. Is the backend running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="empty-state">Loading analytics…</div>;
  if (error) return <div className="empty-state text-danger">{error}</div>;

  return (
    <div className="fade-page">
      <div className="mb-4">
        <div className="section-eyebrow mb-1">The bigger picture</div>
        <h2 className="section-title mb-0">Analytics</h2>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card-soft p-4" style={{ background: 'linear-gradient(135deg, var(--ink-plum), #2E2239)', color: '#fff' }}>
            <div style={{ fontSize: 12.5, color: '#B9AFC9', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Estimated savings (30 days)
            </div>
            <div className="font-display fw-bold" style={{ fontSize: 38, marginTop: 6 }}>
              ₹{Math.round(summary.estimated_savings).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 13, color: '#C9C0D8', marginTop: 6 }}>
              From stockouts and wastage avoided by acting on alerts early.
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card-soft p-4 h-100">
            <div className="d-flex justify-content-between">
              <div>
                <div className="stat-label">Today's sales</div>
                <div className="stat-value font-mono" style={{ fontSize: 28 }}>₹{Math.round(summary.today_sales)}</div>
              </div>
              <div>
                <div className="stat-label">Active alerts</div>
                <div className="stat-value font-mono" style={{ fontSize: 28 }}>{summary.active_alerts}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card-soft p-4 h-100">
            <h5 className="section-title mb-3" style={{ fontSize: '17px' }}>Revenue trend</h5>
            {trend.length === 0 ? <div className="empty-state">No sales data yet.</div> : <SalesTrendChart data={trend} />}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card-soft p-4 h-100">
            <h5 className="section-title mb-3" style={{ fontSize: '17px' }}>Stock by category</h5>
            <CategoryDonut data={breakdown} />
          </div>
        </div>
      </div>

      <div className="card-soft p-4 mt-3">
        <h5 className="section-title mb-3" style={{ fontSize: '17px' }}>Highest predicted demand</h5>
        <MoversBarChart data={movers} />
      </div>
    </div>
  );
}
