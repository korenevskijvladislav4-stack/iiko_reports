import { useState } from 'react';
import { Card, Typography, Row, Col, Statistic, Tag, Space, Progress, Spin, Button, Modal } from 'antd';
import { useHomePreviews } from './hooks/useHomePreviews';
import { HomeWeekChart } from './HomeWeekChart';
import { HomeTopDishes } from './HomeTopDishes';
import { REPORT_LINKS, VISIBLE_REPORTS_COUNT } from './reportLinks';
import type { ReportLinkItem } from './reportLinks';
import {
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  RightOutlined,
  CalendarOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  InboxOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Paragraph, Text } = Typography;

const REPORT_ICONS = [
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  CalculatorOutlined,
  InboxOutlined,
  TeamOutlined,
] as const;

function ReportCard({
  item,
  icon: Icon,
}: {
  item: ReportLinkItem;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
}) {
  return (
    <Link to={item.path} style={{ textDecoration: 'none' }}>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              ...item.iconStyle,
            }}
          >
            <Icon style={{ fontSize: 24 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Title level={5} style={{ marginBottom: 4, color: 'var(--premium-text)' }}>
              {item.title}
            </Title>
            <Paragraph
              style={{
                marginBottom: 8,
                color: 'var(--premium-muted)',
                fontSize: 13,
                flexGrow: 1,
              }}
            >
              {item.description}
            </Paragraph>
            <Tag
              style={{
                borderRadius: 999,
                fontSize: 11,
                background: 'rgba(148,163,184,0.15)',
                borderColor: 'rgba(148,163,184,0.4)',
                color: 'var(--premium-muted)',
              }}
            >
              {item.tag}
            </Tag>
          </div>
        </Space>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const { auth } = useAuth();
  const [allReportsModalOpen, setAllReportsModalOpen] = useState(false);
  const { weekData, topDishes, todaySummary, loading: previewsLoading, error: previewsError } = useHomePreviews(!!auth);

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
                {previewsLoading ? (
                  <Spin size="small" />
                ) : (
                  <Statistic
                    value={todaySummary?.revenue ?? 0}
                    precision={0}
                    suffix="₽"
                    valueStyle={{ color: '#e5e7eb', fontSize: 24, fontWeight: 700 }}
                  />
                )}
                {!previewsLoading && todaySummary != null && (
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
                {previewsLoading ? (
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
              {previewsLoading ? (
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
            {previewsError && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {previewsError}
              </Text>
            )}
            {!previewsError && (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#9ca3af' }}>Чеки</span>}
                      value={previewsLoading ? '—' : (todaySummary?.checks ?? 0)}
                      valueStyle={{ color: '#e5e7eb', fontSize: 20, fontWeight: 600 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ color: '#9ca3af' }}>Гости</span>}
                      value={previewsLoading ? '—' : (todaySummary?.guests ?? 0)}
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

      <Row gutter={[24, 24]} style={{ marginBottom: 8 }} className="saas-fade-in saas-fade-in-delay-2">
        <Col xs={24} md={14}>
          <HomeWeekChart data={weekData} loading={previewsLoading} error={previewsError} />
        </Col>
        <Col xs={24} md={10}>
          <HomeTopDishes items={topDishes} loading={previewsLoading} error={previewsError} />
        </Col>
      </Row>

      <Row gutter={[24, 24]} align="stretch">
        {REPORT_LINKS.slice(0, VISIBLE_REPORTS_COUNT).map((item, index) => (
          <Col
            key={item.path}
            xs={24}
            md={8}
            className={`saas-fade-in saas-fade-in-delay-${3 + index}`}
          >
            <ReportCard item={item} icon={REPORT_ICONS[index]} />
          </Col>
        ))}
        <Col xs={24} md={8} className="saas-fade-in saas-fade-in-delay-6">
          <Button
            type="default"
            size="large"
            icon={<UnorderedListOutlined />}
            onClick={() => setAllReportsModalOpen(true)}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 140,
              borderRadius: 'var(--radius-xl)',
              border: '1px dashed var(--premium-border)',
              color: 'var(--premium-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--premium-text)' }}>
              Все отчёты
            </span>
            <span style={{ fontSize: 12 }}>Открыть полный список</span>
          </Button>
        </Col>
      </Row>

      <Modal
        title="Все отчёты"
        open={allReportsModalOpen}
        onCancel={() => setAllReportsModalOpen(false)}
        footer={null}
        width={520}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {REPORT_LINKS.map((item, index) => {
            const Icon = REPORT_ICONS[index];
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ textDecoration: 'none' }}
                onClick={() => setAllReportsModalOpen(false)}
              >
                <Card
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--premium-border)',
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Space align="center" size={16} style={{ width: '100%' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                        ...item.iconStyle,
                      }}
                    >
                      <Icon style={{ fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ display: 'block', color: 'var(--premium-text)' }}>
                        {item.title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.description}
                      </Text>
                    </div>
                    <RightOutlined style={{ color: 'var(--premium-muted)' }} />
                  </Space>
                </Card>
              </Link>
            );
          })}
        </Space>
      </Modal>

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
          {auth?.user?.role === 'owner' && (
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
          )}
        </Row>
      </div>
    </div>
  );
}
