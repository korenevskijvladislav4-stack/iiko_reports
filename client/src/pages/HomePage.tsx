import { Card, Typography, Row, Col } from 'antd';
import { BarChartOutlined, AppstoreOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 8 }}>
        Добро пожаловать
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 32 }}>
        Выберите отчёт в меню слева или перейдите по карточке ниже.
      </Paragraph>
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12}>
          <Link to="/reports/sales" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChartOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <div>
                  <Title level={5} style={{ marginBottom: 4 }}>
                    Отчёт по продажам
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Департаменты, количество блюд, чеков, сумма заказов и средний чек
                  </Paragraph>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12}>
          <Link to="/reports/dishes" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppstoreOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <div>
                  <Title level={5} style={{ marginBottom: 4 }}>
                    Отчёт по блюдам
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Топ блюд, выручка, себестоимость, маржа, фильтр по категориям
                  </Paragraph>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12}>
          <Link to="/reports/cashiers" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <div>
                  <Title level={5} style={{ marginBottom: 4 }}>
                    Отчёт по кассирам
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Выручка, чеки, гости и средний чек по кассирам
                  </Paragraph>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            hoverable
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              opacity: 0.85,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileTextOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />
              </div>
              <div>
                <Title level={5} style={{ marginBottom: 4, color: '#8c8c8c' }}>
                  Другие отчёты
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Скоро: проводки, доставки, склад
                </Paragraph>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
