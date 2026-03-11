import { Card, Spin, Typography } from 'antd';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { RiseOutlined } from '@ant-design/icons';
import type { WeekDayPoint } from './types';

const { Text } = Typography;

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн ₽`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} тыс. ₽`;
  return `${value} ₽`;
}

export interface HomeWeekChartProps {
  data: WeekDayPoint[];
  loading: boolean;
  error: string | null;
}

export function HomeWeekChart({ data, loading, error }: HomeWeekChartProps) {
  if (error) {
    return (
      <Card
        size="small"
        style={{
          borderRadius: 14,
          border: '1px solid var(--premium-border)',
          background: 'linear-gradient(160deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%)',
        }}
      >
        <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      style={{
        borderRadius: 14,
        border: '1px solid var(--premium-border)',
        background: 'linear-gradient(160deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%)',
        height: '100%',
      }}
      styles={{ body: { padding: 16, height: 220 } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <RiseOutlined style={{ color: '#67e8f9', fontSize: 18 }} />
        <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-text)' }}>
          Выручка за 7 дней
        </Text>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 160 }}>
          <Spin size="small" />
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>Нет данных за период</Text>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              stroke="rgba(148,163,184,0.4)"
              interval={0}
            />
            <YAxis
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              tick={{ fontSize: 11, fill: 'var(--premium-muted)' }}
              stroke="rgba(148,163,184,0.3)"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.98)',
                border: '1px solid var(--premium-border)',
                borderRadius: 8,
              }}
              labelStyle={{ color: 'var(--premium-muted)' }}
              formatter={(value: number) => [formatRevenue(value), 'Выручка']}
              labelFormatter={(label: string) => `Дата: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ fill: '#22d3ee', r: 3 }}
              activeDot={{ r: 5, fill: '#6366f1' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
