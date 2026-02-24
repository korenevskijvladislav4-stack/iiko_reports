import { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Tag, Space, Progress, Spin } from 'antd';
import {
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  RightOutlined,
  CalendarOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { fetchOlapReport } from '../api/client';

const { Title, Paragraph, Text } = Typography;

type TodaySummary = {
  revenue: number;
  checks: number;
  guests: number;
  avgCheck: number;
  revenuePerGuest: number;
  dishes: number;
} | null;

type SalesRow = Record<string, string | number>;

const DISH_KEYS = ['DishAmountInt', 'dishAmountInt', 'DishAmount.Int', 'DishAmount', 'Amount.Int', 'dishAmount'];
const SUM_KEYS = [
  'DishSumInt',
  'dishSumInt',
  'DishDiscountSumInt',
  'dishDiscountSumInt',
  'DishDiscountSumInt.withoutVAT',
  'OrderSum',
  'orderSum',
  'ResultSum',
  'resultSum',
  'TotalSum',
  'totalSum',
  'Sum',
  'sum',
];
const ORDER_KEYS = ['UniqOrderId', 'uniqOrderId', 'UniqOrderId.Int', 'VoucherNum', 'voucherNum'];
const AVG_CHECK_KEYS = [
  'DishDiscountSumInt.average',
  'dishDiscountSumInt.average',
  'DishSumInt.average',
  'dishSumInt.average',
];
const GUEST_KEYS = ['GuestNum', 'guestNum'];

/** Суммирует массив строк (объекты или массивы с колонками) в один TodaySummary. */
function sumRowsAsObjects(
  rowsArr: unknown[],
  columns: string[]
): TodaySummary {
  const asObjects: SalesRow[] = [];
  const first = rowsArr[0];
  let dataRows = rowsArr;
  let colNames = columns;
  if (Array.isArray(first) && first.length > 0 && first.every((c) => typeof c === 'string')) {
    colNames = first as unknown as string[];
    dataRows = rowsArr.slice(1);
  }
  for (const row of dataRows) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      asObjects.push(row as SalesRow);
    } else if (Array.isArray(row) && colNames.length > 0) {
      const o: SalesRow = {};
      row.forEach((val, i) => {
        o[colNames[i] ?? `col_${i}`] = val as string | number;
      });
      asObjects.push(o);
    }
  }
  if (asObjects.length === 0) return null;
  const revenue = asObjects.reduce((s, r) => s + getNum(r, SUM_KEYS), 0);
  const checks = asObjects.reduce((s, r) => s + getNum(r, ORDER_KEYS), 0);
  const guests = asObjects.reduce((s, r) => s + getNum(r, GUEST_KEYS), 0);
  const dishes = asObjects.reduce((s, r) => s + getNum(r, DISH_KEYS), 0);
  let avgCheckSum = 0;
  let avgCheckCount = 0;
  asObjects.forEach((r) => {
    const avg = getNum(r, AVG_CHECK_KEYS);
    const ord = getNum(r, ORDER_KEYS);
    if (avg > 0 && ord > 0) {
      avgCheckSum += avg * ord;
      avgCheckCount += ord;
    }
  });
  const avgCheck = avgCheckCount > 0 ? avgCheckSum / avgCheckCount : checks > 0 ? revenue / checks : 0;
  const revenuePerGuest = guests > 0 ? revenue / guests : 0;
  return {
    revenue,
    checks,
    guests,
    avgCheck: Math.round(avgCheck),
    revenuePerGuest: Math.round(revenuePerGuest),
    dishes,
  };
}

/** Ищет число по ключам: точное совпадение, без учёта регистра, во вложенных objects, в массивах measures. */
function getNum(r: SalesRow, keys: string[]): number {
  const keyLower = (s: string) => s.toLowerCase();
  const keysSet = new Set(keys.map(keyLower));
  const getFrom = (obj: Record<string, unknown>): number => {
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null) return Number(v) || 0;
    }
    for (const [objKey, val] of Object.entries(obj)) {
      if (keysSet.has(keyLower(objKey)) && val !== undefined && val !== null) return Number(val) || 0;
    }
    return NaN;
  };
  const top = r as unknown as Record<string, unknown>;
  let n = getFrom(top);
  if (!Number.isNaN(n)) return n;
  for (const nest of ['values', 'aggregates', 'data', 'measures', 'aggregate']) {
    const nested = top[nest];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      n = getFrom(nested as Record<string, unknown>);
      if (!Number.isNaN(n)) return n;
    }
    if (Array.isArray(nested)) {
      for (const item of nested) {
        if (item && typeof item === 'object') {
          const it = item as Record<string, unknown>;
          const id = (it.fieldId ?? it.name ?? it.key ?? it.id ?? '').toString();
          const val = it.value ?? it.amount;
          if (id && val !== undefined && val !== null && keysSet.has(keyLower(id))) return Number(val) || 0;
        }
      }
    }
  }
  return 0;
}

function extractTodaySummary(data: unknown): TodaySummary {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data)) {
    const fromArr = sumRowsAsObjects(data as unknown[], [
      'OpenDate.Typed',
      'DishSumInt',
      'GuestNum',
      'DishAmountInt',
      'UniqOrderId',
      'DishDiscountSumInt.average',
      'DishAmountInt.PerOrder',
    ]);
    return fromArr;
  }
  const obj = data as Record<string, unknown>;
  const report = (obj.report ?? obj) as Record<string, unknown>;
  const summaryRaw = (obj.summary ?? report?.summary) as Record<string, unknown> | undefined;
  let rows: unknown[] = [];
  if (Array.isArray(obj.rows)) rows = obj.rows;
  else if (Array.isArray(obj.row)) rows = obj.row;
  else if (Array.isArray(report?.rows)) rows = report.rows as unknown[];
  else if (Array.isArray(report?.row)) rows = report.row as unknown[];
  else if (Array.isArray(obj.data)) rows = obj.data;
  else if (Array.isArray(report?.data)) rows = report.data as unknown[];
  else if (report && typeof report.table === 'object' && report.table !== null) {
    const table = report.table as Record<string, unknown>;
    if (Array.isArray(table.rows)) rows = table.rows;
    else if (Array.isArray(table.row)) rows = table.row;
    else if (Array.isArray(table.data)) rows = table.data;
  }
  if (rows.length === 0 && Array.isArray(obj.report)) rows = obj.report as unknown[];

  const rowFields = (report?.rowFields ?? report?.groupByRowFields) as string[] | undefined;
  const aggFields = (report?.aggregateFields ?? report?.measures) as string[] | undefined;
  const fallbackCols = ['OpenDate.Typed', 'DishSumInt', 'GuestNum', 'DishAmountInt', 'UniqOrderId', 'DishDiscountSumInt.average', 'DishAmountInt.PerOrder'];
  const columns = (Array.isArray(rowFields) && Array.isArray(aggFields) ? [...rowFields, ...aggFields] : fallbackCols) as string[];

  let revenue = 0;
  let checks = 0;
  let guests = 0;
  let dishes = 0;
  let avgCheckSum = 0;
  let avgCheckCount = 0;

  const summary = summaryRaw && typeof summaryRaw === 'object' ? (summaryRaw as SalesRow) : undefined;

  let fromSummary = { revenue: 0, checks: 0, guests: 0, dishes: 0, avgCheckSum: 0, avgCheckCount: 0 };
  if (summary) {
    fromSummary = {
      revenue: getNum(summary, SUM_KEYS),
      checks: getNum(summary, ORDER_KEYS),
      guests: getNum(summary, GUEST_KEYS),
      dishes: getNum(summary, DISH_KEYS),
      avgCheckSum: 0,
      avgCheckCount: 0,
    };
    const avg = getNum(summary, AVG_CHECK_KEYS);
    if (avg > 0) {
      fromSummary.avgCheckSum = avg * (fromSummary.checks || 1);
      fromSummary.avgCheckCount = fromSummary.checks || 1;
    }
  }

  let fromRows = { revenue: 0, checks: 0, guests: 0, dishes: 0, avgCheckSum: 0, avgCheckCount: 0 };
  if (rows.length > 0) {
    const asObjects: SalesRow[] = [];
    const firstRow = rows[0];
    let dataRows = rows;
    let colNames = columns;
    if (Array.isArray(firstRow) && firstRow.length > 0 && firstRow.every((c) => typeof c === 'string')) {
      colNames = firstRow as unknown as string[];
      dataRows = rows.slice(1);
    }
    for (const row of dataRows) {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        asObjects.push(row as SalesRow);
      } else if (Array.isArray(row) && colNames.length > 0) {
        const o: SalesRow = {};
        row.forEach((val, i) => {
          o[colNames![i] ?? `col_${i}`] = val as string | number;
        });
        asObjects.push(o);
      }
    }
    if (asObjects.length > 0) {
      fromRows = {
        revenue: asObjects.reduce((s, r) => s + getNum(r, SUM_KEYS), 0),
        checks: asObjects.reduce((s, r) => s + getNum(r, ORDER_KEYS), 0),
        guests: asObjects.reduce((s, r) => s + getNum(r, GUEST_KEYS), 0),
        dishes: asObjects.reduce((s, r) => s + getNum(r, DISH_KEYS), 0),
        avgCheckSum: 0,
        avgCheckCount: 0,
      };
      asObjects.forEach((r) => {
        const avg = getNum(r, AVG_CHECK_KEYS);
        const ord = getNum(r, ORDER_KEYS);
        if (avg > 0 && ord > 0) {
          fromRows.avgCheckSum += avg * ord;
          fromRows.avgCheckCount += ord;
        }
      });
    }
  }

  const useRows =
    fromRows.revenue > 0 ||
    fromRows.checks > 0 ||
    fromRows.guests > 0 ||
    fromRows.dishes > 0;
  if (useRows) {
    revenue = fromRows.revenue;
    checks = fromRows.checks;
    guests = fromRows.guests;
    dishes = fromRows.dishes;
    avgCheckSum = fromRows.avgCheckSum;
    avgCheckCount = fromRows.avgCheckCount;
  } else {
    revenue = fromSummary.revenue;
    checks = fromSummary.checks;
    guests = fromSummary.guests;
    dishes = fromSummary.dishes;
    avgCheckSum = fromSummary.avgCheckSum;
    avgCheckCount = fromSummary.avgCheckCount;
  }

  const avgCheck = avgCheckCount > 0 ? avgCheckSum / avgCheckCount : (checks > 0 ? revenue / checks : 0);
  const revenuePerGuest = guests > 0 ? revenue / guests : 0;

  return {
    revenue,
    checks,
    guests,
    avgCheck: Math.round(avgCheck),
    revenuePerGuest: Math.round(revenuePerGuest),
    dishes,
  };
}

export default function HomePage() {
  const { auth } = useAuth();
  const [todaySummary, setTodaySummary] = useState<TodaySummary>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setTodayLoading(false);
      return;
    }
    const today = dayjs().format('DD.MM.YYYY');
    setTodayLoading(true);
    setTodayError(null);
    fetchOlapReport({
      serverUrl: auth.serverUrl,
      token: auth.token,
      report: 'SALES',
      from: today,
      to: today,
      groupByRowFields: ['OpenDate.Typed'],
      aggregateFields: ['DishSumInt', 'GuestNum', 'DishAmountInt', 'UniqOrderId', 'DishDiscountSumInt.average', 'DishAmountInt.PerOrder'],
    })
      .then((result) => {
        if (result.raw) {
          setTodayError('Ответ сервера не в формате JSON');
          setTodaySummary(null);
          return;
        }
        const summary = extractTodaySummary(result.data);
        setTodaySummary(summary);
      })
      .catch((e) => {
        setTodayError(e instanceof Error ? e.message : 'Ошибка загрузки');
        setTodaySummary(null);
      })
      .finally(() => setTodayLoading(false));
  }, [auth]);

  return (
    <div
      style={{
        maxWidth: '100%',
        width: '100%',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <div
        className="home-hero-card saas-fade-in saas-fade-in-delay-1"
        style={{
          borderRadius: 'var(--radius-2xl)',
          padding: 28,
          background:
            'linear-gradient(145deg, #0f172a 0%, #0b1220 50%, #020617 100%), radial-gradient(ellipse 100% 80% at 0% 0%, rgba(34,211,238,0.18) 0, transparent 50%), radial-gradient(ellipse 80% 60% at 100% 0%, rgba(99,102,241,0.2) 0, transparent 50%)',
          color: 'var(--premium-text)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 28,
          boxShadow: '0 24px 80px rgba(15,23,42,0.5), 0 0 0 1px rgba(148,163,184,0.2)',
          border: '1px solid var(--premium-border)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Tag
            color="cyan"
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              paddingInline: 14,
              background: 'rgba(8,47,73,0.95)',
              borderColor: 'rgba(34,211,238,0.6)',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            Живые OLAP‑отчёты по вашей сети iiko
          </Tag>
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                color: 'var(--premium-text)',
                letterSpacing: -0.6,
                fontWeight: 700,
              }}
            >
              Панель управления выручкой
            </Title>
            <Paragraph
              style={{
                marginTop: 10,
                maxWidth: 520,
                color: 'var(--premium-muted)',
                fontSize: 15,
              }}
            >
              Здесь собраны ключевые отчёты по продажам, блюдам и кассирам. Переключайтесь между ними в один
              клик и получайте прозрачную картину по каждой точке.
            </Paragraph>
          </div>
          <Space
            size={24}
            wrap
            style={{
              marginTop: 4,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Сегодняшняя выручка</Text>
              <Space size={8} align="baseline">
                {todayLoading ? (
                  <Spin size="small" />
                ) : (
                  <Statistic
                    value={todaySummary?.revenue ?? 0}
                    precision={0}
                    suffix="₽"
                    valueStyle={{ color: '#e5e7eb', fontSize: 24, fontWeight: 700 }}
                  />
                )}
                {!todayLoading && todaySummary != null && (
                  <Tag
                    style={{
                      borderRadius: 999,
                      paddingInline: 10,
                      background: 'rgba(34,211,238,0.15)',
                      borderColor: 'rgba(34,211,238,0.5)',
                      color: '#67e8f9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Данные iiko
                  </Tag>
                )}
              </Space>
            </Space>
            <Space direction="vertical" size={4}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Средний чек</Text>
              <Space size={8} align="baseline">
                {todayLoading ? (
                  <Spin size="small" />
                ) : (
                  <Text style={{ fontSize: 20, fontWeight: 600, color: '#e5e7eb' }}>
                    {todaySummary != null ? `${Math.round(todaySummary.avgCheck).toLocaleString('ru-RU')} ₽` : '—'}
                  </Text>
                )}
              </Space>
            </Space>
          </Space>
        </div>

        <div className="saas-fade-in saas-fade-in-delay-2">
          <Card
            variant="borderless"
            style={{
              height: '100%',
              borderRadius: 18,
              background:
                'linear-gradient(160deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%), radial-gradient(ellipse 80% 60% at 0% 0%, rgba(34,211,238,0.12) 0, transparent 60%)',
              border: '1px solid var(--premium-border)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.4)',
            }}
            styles={{
              body: {
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              },
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#cbd5f5', fontSize: 13 }}>Сводка за сегодня</Text>
              {todayLoading ? (
                <Spin size="small" />
              ) : (
                <Tag
                  color="processing"
                  style={{
                    borderRadius: 999,
                    fontSize: 11,
                  }}
                >
                  Онлайн‑данные iiko
                </Tag>
              )}
            </div>
            {todayError && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {todayError}
              </Text>
            )}
            {!todayError && (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#9ca3af' }}>Чеки</span>}
                      value={todayLoading ? '—' : (todaySummary?.checks ?? 0)}
                      valueStyle={{ color: '#e5e7eb', fontSize: 20, fontWeight: 600 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#9ca3af' }}>Гости</span>}
                      value={todayLoading ? '—' : (todaySummary?.guests ?? 0)}
                      valueStyle={{ color: '#e5e7eb', fontSize: 20, fontWeight: 600 }}
                    />
                  </Col>
                </Row>
                <div>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                    Выручка за сегодня · {todaySummary != null ? `${(todaySummary.revenue / 1000).toFixed(0)} тыс. ₽` : '—'}
                  </Text>
                  <Progress
                    percent={
                      todaySummary != null && todaySummary.revenue > 0
                        ? Math.min(100, Math.round((todaySummary.revenue / 500000) * 100))
                        : 0
                    }
                    showInfo={false}
                    strokeColor={{
                      from: '#22d3ee',
                      to: '#6366f1',
                    }}
                    trailColor="rgba(15,23,42,0.9)"
                    style={{ marginTop: 6 }}
                  />
                  <Text style={{ fontSize: 11, color: '#64748b' }}>
                    Шкала до 500 тыс. ₽ (условно)
                  </Text>
                </div>
                <div
                  style={{
                    borderRadius: 10,
                    padding: 10,
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(51,65,85,0.8)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  <div>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Выручка / гость</Text>
                    <Text style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>
                      {todaySummary != null ? `${todaySummary.revenuePerGuest.toLocaleString('ru-RU')} ₽` : '—'}
                    </Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Блюд</Text>
                    <Text style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#bbf7d0' }}>
                      {todaySummary != null ? todaySummary.dishes.toLocaleString('ru-RU') : '—'}
                    </Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Средний чек</Text>
                    <Text style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>
                      {todaySummary != null ? `${todaySummary.avgCheck.toLocaleString('ru-RU')} ₽` : '—'}
                    </Text>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} md={8} className="saas-fade-in saas-fade-in-delay-3">
          <Link to="/reports/sales" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              className="report-dashboard-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                height: '100%',
              }}
              styles={{ body: { padding: 20, height: '100%', display: 'flex' } }}
            >
              <Space align="start" size={18} style={{ width: '100%' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
                  }}
                >
                  <BarChartOutlined style={{ fontSize: 24 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Title level={5} style={{ marginBottom: 4, color: 'var(--premium-text)' }}>
                    Отчёт по продажам
                  </Title>
                  <Paragraph
                    style={{
                      marginBottom: 8,
                      color: 'var(--premium-muted)',
                      fontSize: 13,
                      flexGrow: 1,
                    }}
                  >
                    Полная выручка по департаментам, точкам и типам заказов.
                  </Paragraph>
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontSize: 11,
                      background: 'rgba(34, 211, 238, 0.15)',
                      borderColor: 'rgba(34, 211, 238, 0.5)',
                      color: '#67e8f9',
                    }}
                  >
                    Для владельцев и директоров
                  </Tag>
                </div>
              </Space>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={8} className="saas-fade-in saas-fade-in-delay-4">
          <Link to="/reports/dishes" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              className="report-dashboard-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                height: '100%',
              }}
              styles={{ body: { padding: 20, height: '100%', display: 'flex' } }}
            >
              <Space align="start" size={18} style={{ width: '100%' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.35)',
                  }}
                >
                  <AppstoreOutlined style={{ fontSize: 24 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Title level={5} style={{ marginBottom: 4, color: 'var(--premium-text)' }}>
                    Отчёт по блюдам
                  </Title>
                  <Paragraph
                    style={{
                      marginBottom: 8,
                      color: 'var(--premium-muted)',
                      fontSize: 13,
                      flexGrow: 1,
                    }}
                  >
                    Топ‑блюда, маржа, себестоимость и фильтры по категориям.
                  </Paragraph>
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontSize: 11,
                      background: 'rgba(34, 197, 94, 0.15)',
                      borderColor: 'rgba(34, 197, 94, 0.5)',
                      color: '#86efac',
                    }}
                  >
                    Для шефов и закупки
                  </Tag>
                </div>
              </Space>
            </Card>
          </Link>
        </Col>
        <Col xs={24} md={8} className="saas-fade-in saas-fade-in-delay-5">
          <Link to="/reports/cashiers" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              className="report-dashboard-card"
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                height: '100%',
              }}
              styles={{ body: { padding: 20, height: '100%', display: 'flex' } }}
            >
              <Space align="start" size={18} style={{ width: '100%' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
                  }}
                >
                  <UserOutlined style={{ fontSize: 24 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Title level={5} style={{ marginBottom: 4, color: 'var(--premium-text)' }}>
                    Отчёт по кассирам
                  </Title>
                  <Paragraph
                    style={{
                      marginBottom: 8,
                      color: 'var(--premium-muted)',
                      fontSize: 13,
                      flexGrow: 1,
                    }}
                  >
                    Эффективность каждой кассовой смены: выручка, гости, средний чек.
                  </Paragraph>
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontSize: 11,
                      background: 'rgba(139, 92, 246, 0.2)',
                      borderColor: 'rgba(139, 92, 246, 0.5)',
                      color: '#c4b5fd',
                    }}
                  >
                    Для операционного контроля
                  </Tag>
                </div>
              </Space>
            </Card>
          </Link>
        </Col>
      </Row>

      <div
        className="saas-fade-in saas-fade-in-delay-4"
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--premium-border)',
          background: 'linear-gradient(160deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.75) 100%)',
          boxShadow: '0 0 0 1px rgba(148,163,184,0.1), 0 20px 50px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--premium-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space align="center" size={12}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(99,102,241,0.2) 100%)',
                border: '1px solid rgba(34,211,238,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThunderboltOutlined style={{ fontSize: 20, color: '#67e8f9' }} />
            </div>
            <div>
              <Text style={{ fontSize: 16, fontWeight: 700, color: 'var(--premium-text)', display: 'block' }}>
                Что дальше?
              </Text>
              <Text style={{ fontSize: 13, color: 'var(--premium-muted)' }}>
                Краткий гид по работе с отчётами
              </Text>
            </div>
          </Space>
          <Space size={8} wrap>
            <Tag style={{ borderRadius: 999, margin: 0, background: 'rgba(34, 211, 238, 0.15)', borderColor: 'rgba(34, 211, 238, 0.4)', color: '#67e8f9' }}>
              <SafetyCertificateOutlined style={{ marginRight: 4 }} />
              Официальный API iiko
            </Tag>
            <Tag style={{ borderRadius: 999, margin: 0, background: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#86efac' }}>
              Данные остаются у вас
            </Tag>
          </Space>
        </div>
        <Row
          gutter={[0, 0]}
          style={{
            padding: 20,
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          <Col xs={24} sm={12} md={6} style={{ marginBottom: 16 }}>
            <Link to="/reports/sales" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  height: '100%',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(15,23,42,0.5)',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="home-what-next-item"
              >
                <CalendarOutlined style={{ fontSize: 22, color: '#67e8f9', marginBottom: 10 }} />
                <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-text)', display: 'block', marginBottom: 4 }}>
                  Выберите период
                </Text>
                <Text style={{ fontSize: 12, color: 'var(--premium-muted)', lineHeight: 1.4, marginBottom: 8, flexGrow: 1 }}>
                  В отчёте по продажам укажите даты — данные подгрузятся с вашего сервера iiko за выбранный интервал.
                </Text>
                <Text style={{ fontSize: 11, color: '#22d3ee', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Отчёт по продажам <RightOutlined />
                </Text>
              </div>
            </Link>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: 16 }}>
            <Link to="/reports/dishes" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  height: '100%',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(15,23,42,0.5)',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="home-what-next-item"
              >
                <AppstoreOutlined style={{ fontSize: 22, color: '#86efac', marginBottom: 10 }} />
                <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-text)', display: 'block', marginBottom: 4 }}>
                  Анализ по блюдам
                </Text>
                <Text style={{ fontSize: 12, color: 'var(--premium-muted)', lineHeight: 1.4, marginBottom: 8, flexGrow: 1 }}>
                  Топ позиций, выручка и маржа по категориям. Фильтруйте по типам и смотрите себестоимость.
                </Text>
                <Text style={{ fontSize: 11, color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Отчёт по блюдам <RightOutlined />
                </Text>
              </div>
            </Link>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: 16 }}>
            <Link to="/reports/cashiers" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  height: '100%',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(15,23,42,0.5)',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="home-what-next-item"
              >
                <UserOutlined style={{ fontSize: 22, color: '#c4b5fd', marginBottom: 10 }} />
                <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-text)', display: 'block', marginBottom: 4 }}>
                  Эффективность касс
                </Text>
                <Text style={{ fontSize: 12, color: 'var(--premium-muted)', lineHeight: 1.4, marginBottom: 8, flexGrow: 1 }}>
                  Выручка, число гостей и средний чек по кассирам. Оцените нагрузку смен и качество обслуживания.
                </Text>
                <Text style={{ fontSize: 11, color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Отчёт по кассирам <RightOutlined />
                </Text>
              </div>
            </Link>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: 16 }}>
            <Link to="/references" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  height: '100%',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(15,23,42,0.5)',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="home-what-next-item"
              >
                <SyncOutlined style={{ fontSize: 22, color: '#fbbf24', marginBottom: 10 }} />
                <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-text)', display: 'block', marginBottom: 4 }}>
                  Справочники
                </Text>
                <Text style={{ fontSize: 12, color: 'var(--premium-muted)', lineHeight: 1.4, marginBottom: 8, flexGrow: 1 }}>
                  Синхронизируйте типы оплат и значения доставки из iiko — они появятся в фильтрах отчётов.
                </Text>
                <Text style={{ fontSize: 11, color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Справочники <RightOutlined />
                </Text>
              </div>
            </Link>
          </Col>
        </Row>
      </div>
    </div>
  );
}
