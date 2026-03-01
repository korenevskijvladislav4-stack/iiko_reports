import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Typography, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined, LineChartOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useLoginMutation } from '../api/rtkApi';

const { Title, Text, Paragraph } = Typography;

export default function LoginPage() {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (auth) navigate(auth.user.role === 'staff' ? '/hr/employees' : '/', { replace: true });
  }, [auth, navigate]);

  const onFinish = async (values: { email: string; password: string }) => {
    setError(null);
    try {
      const result = await login({ email: values.email, password: values.password }).unwrap();
      setAuth({
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          companyId: result.company.id,
          companyName: result.company.name,
          scheduleAccessRole: result.user.scheduleAccessRole ?? undefined,
          includeInSchedule: result.user.includeInSchedule ?? undefined,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    }
  };

  return (
    <div
      className="saas-fade-in"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        background:
          'linear-gradient(165deg, #020617 0%, #0b1220 40%, #0f172a 100%), radial-gradient(ellipse 120% 80% at 0% 0%, rgba(34, 211, 238, 0.14) 0, transparent 50%), radial-gradient(ellipse 100% 70% at 100% 0%, rgba(99, 102, 241, 0.18) 0, transparent 50%), radial-gradient(ellipse 80% 60% at 0% 100%, rgba(236, 72, 153, 0.1) 0, transparent 50%)',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1120,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div
          className="saas-fade-in saas-fade-in-delay-1"
          style={{
            color: 'white',
            paddingRight: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 36,
          }}
        >
          <Space size={14} align="center">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background:
                  'conic-gradient(from 180deg at 50% 50%, #22d3ee 0deg, #6366f1 90deg, #f97316 180deg, #22c55e 270deg, #22d3ee 360deg)',
                padding: 2,
                boxShadow: '0 0 24px rgba(34, 211, 238, 0.3)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '999px',
                  background: 'rgba(15,23,42,0.96)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e5e7eb',
                }}
              >
                <LineChartOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
            <Text style={{ color: '#94a3b8', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>
              iiko Отчёты · SaaS Analytics
            </Text>
          </Space>

          <div>
            <Title
              level={1}
              style={{
                margin: 0,
                fontSize: 38,
                lineHeight: 1.1,
                color: '#f8fafc',
                letterSpacing: -0.6,
                fontWeight: 800,
              }}
            >
              Премиальная аналитика выручки
              <br />
              для ресторанов на iiko
            </Title>
            <Paragraph
              style={{
                marginTop: 18,
                marginBottom: 0,
                maxWidth: 520,
                fontSize: 16,
                color: '#9ca3af',
              }}
            >
              Готовые отчёты по продажам, блюдам и кассирам в одном интерфейсе. Подключите свой iiko сервер и
              начните видеть цифры так, как их видит владелец сети.
            </Paragraph>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
              maxWidth: 520,
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid rgba(148, 163, 184, 0.4)',
                background:
                  'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6)) border-box, linear-gradient(120deg, rgba(56,189,248,0.4), rgba(96,165,250,0.4)) border-box',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Text style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>Владельцам и директорам</Text>
              <Text style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#e5e7eb' }}>
                KPI в одном дашборде
              </Text>
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background:
                  'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.7)) border-box, linear-gradient(120deg, rgba(45,212,191,0.4), rgba(34,197,94,0.4)) border-box',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Text style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>Финансовому контролю</Text>
              <Text style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#e5e7eb' }}>
                Глубокие OLAP‑разрезы
              </Text>
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background:
                  'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6)) border-box, linear-gradient(120deg, rgba(251,113,133,0.4), rgba(244,114,182,0.4)) border-box',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Text style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>Операторам и менеджерам</Text>
              <Text style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#e5e7eb' }}>
                Детализация до позиции
              </Text>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>5 минут</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>чтобы подключить свой сервер iiko</Text>
            </div>
            <Divider
              type="vertical"
              style={{ height: 32, borderInlineColor: 'rgba(148,163,184,0.5)', marginInline: 0 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#e5e7eb' }}>24/7</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>доступ к ключевым показателям сети</Text>
            </div>
          </div>
        </div>

        <div
          className="saas-fade-in saas-fade-in-delay-2"
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 0 0 1px rgba(148,163,184,0.2), 0 32px 80px rgba(0,0,0,0.5), 0 0 80px rgba(34,211,238,0.08)',
              borderRadius: 'var(--radius-2xl)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background:
                'linear-gradient(165deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.92) 100%), radial-gradient(ellipse 100% 60% at 0% 0%, rgba(34,211,238,0.1) 0, transparent 55%), radial-gradient(ellipse 80% 50% at 100% 0%, rgba(99,102,241,0.12) 0, transparent 55%)',
              backdropFilter: 'blur(20px)',
            }}
            headStyle={{
              borderBottom: 'none',
              padding: '20px 24px 0',
            }}
            bodyStyle={{
              padding: '12px 24px 24px',
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <Title level={3} style={{ marginBottom: 4, color: '#e5e7eb' }}>
                Вход в панель
              </Title>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                Войдите по email и паролю. Подключение к iiko настраивается администратором компании в панели.
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={<Text style={{ color: '#e5e7eb' }}>Email</Text>}
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="you@company.com"
                />
              </Form.Item>
              <Form.Item
                name="password"
                label={<Text style={{ color: '#e5e7eb' }}>Пароль</Text>}
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="Пароль от iiko"
                />
              </Form.Item>
              {error && (
                <Alert
                  type="error"
                  message={error}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  block
                  size="large"
                  style={{
                    fontWeight: 600,
                    boxShadow: '0 16px 40px rgba(56,189,248,0.45)',
                    background:
                      'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 35%, #6366f1 100%)',
                    border: 'none',
                  }}
                >
                  Войти в отчёты
                </Button>
              </Form.Item>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  Нет аккаунта?{' '}
                  <Link to="/register" style={{ color: '#22d3ee', fontWeight: 600 }}>
                    Зарегистрироваться
                  </Link>
                </Text>
              </div>
              <Text style={{ fontSize: 11, color: '#64748b' }}>
                Требуется доступ к модулю OLAP в вашем iiko. При первом входе загрузка справочников может занять
                пару минут.
              </Text>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
