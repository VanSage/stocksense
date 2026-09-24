import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

const DONUT_COLORS = ['#F4A623', '#16BFA6', '#FF6B6B', '#8B7CD8', '#4EA8DE', '#E8A0BF', '#7A6F87'];

function currencyTick(v) {
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
}

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#241B2F', color: '#fff', padding: '8px 12px', borderRadius: 10, fontSize: 13 }}>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{label}</div>
      <div>₹{payload[0].value.toLocaleString('en-IN')}</div>
    </div>
  );
}

export function SalesTrendChart({ data }) {
  const chartData = (data || []).map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
    total: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4A623" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#F4A623" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#F1EBE0" />
        <XAxis dataKey="label" tick={{ fill: '#9C90AC', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9C90AC', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={currencyTick} />
        <Tooltip content={<SalesTooltip />} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#DB8B0E"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#F4A623', stroke: '#fff', strokeWidth: 2 }}
          fill="url(#salesFill)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data }) {
  const chartData = (data || []).map((d) => ({ name: d.category, value: d.stock }));
  if (chartData.length === 0) {
    return <div className="empty-state">No stock data yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#fff" strokeWidth={3} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={9}
          wrapperStyle={{ fontSize: 11.5, color: '#5A5065', fontFamily: 'Plus Jakarta Sans' }}
        />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MoversBarChart({ data }) {
  const chartData = (data || []).map((d) => ({
    name: d.name.split(' (')[0],
    value: d.predicted_demand_7d,
  }));
  if (chartData.length === 0) {
    return <div className="empty-state">No products yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="#F1EBE0" />
        <XAxis type="number" tick={{ fill: '#9C90AC', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: '#5A5065', fontSize: 12, fontWeight: 600, fontFamily: 'Plus Jakarta Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#241B2F', border: 'none', borderRadius: 10 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#fff' }}
        />
        <Bar dataKey="value" fill="#16BFA6" radius={[0, 8, 8, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
