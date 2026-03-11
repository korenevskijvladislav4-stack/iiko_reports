import { Card, Spin, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { AppstoreOutlined, RightOutlined } from '@ant-design/icons';
import type { TopDishItem } from './types';

const { Text } = Typography;

function formatRevenue(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export interface HomeTopDishesProps {
  items: TopDishItem[];
  loading: boolean;
  error: string | null;
}

export function HomeTopDishes({ items, loading, error }: HomeTopDishesProps) {
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
      styles={{ body: { padding: 16 } }}
    >
      <Link to="/reports/dishes" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: '#86efac', fontSize: 18 }} />
            <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-text)' }}>
              Топ-5 блюд за неделю
            </Text>
          </div>
          <RightOutlined style={{ fontSize: 12, color: 'var(--premium-muted)' }} />
        </div>
      </Link>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : items.length === 0 ? (
        <Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>Нет данных за период</Text>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {items.map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: i < items.length - 1 ? '1px solid rgba(148,163,184,0.15)' : 'none',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: 'var(--premium-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%',
                }}
                title={item.name}
              >
                {item.name}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: 600, color: '#86efac', flexShrink: 0 }}>
                {formatRevenue(item.revenue)}
              </Text>
            </li>
          ))}
        </ul>
      )}
      {!loading && items.length > 0 && (
        <Link
          to="/reports/dishes"
          style={{
            display: 'block',
            marginTop: 12,
            fontSize: 12,
            color: '#22c55e',
            fontWeight: 500,
          }}
        >
          Открыть отчёт по блюдам →
        </Link>
      )}
    </Card>
  );
}
