import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, LineChartOutlined, TeamOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useRegisterMutation } from '../../api/rtkApi';

const { Title, Text, Paragraph } = Typography;

export default function RegisterPage() {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (auth) navigate('/', { replace: true });
  }, [auth, navigate]);

  const onFinish = async (values: { companyName: string; name: string; email: string; password: string }) => {
    setError(null);
    try {
      const result = await register({
        companyName: values.companyName,
        email: values.email,
        password: values.password,
        name: values.name,
      }).unwrap();
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
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
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
              Создайте аккаунт
              <br />
              для своей сети iiko
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
              Укажите данные компании и администратора. Подключение к iiko вы настроите после входа в панель.
            </Paragraph>
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
                Регистрация
              </Title>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                Создайте организацию и аккаунт администратора. Остальных пользователей вы добавите позже.
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
                name="companyName"
                label={<Text style={{ color: '#e5e7eb' }}>Название компании</Text>}
                rules={[{ required: true, message: 'Введите название компании' }]}
              >
                <Input
                  prefix={<TeamOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="ООО «Ресторан Группа»"
                />
              </Form.Item>
              <Form.Item
                name="name"
                label={<Text style={{ color: '#e5e7eb' }}>Ваше имя</Text>}
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                  placeholder="Администратор"
                />
              </Form.Item>
              <Form.Item
                name="email"
                label={<Text style={{ color: '#e5e7eb' }}>Email</Text>}
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
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
                  placeholder="Надёжный пароль"
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
                  Создать аккаунт
                </Button>
              </Form.Item>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  Уже есть аккаунт?{' '}
                  <Link to="/login" style={{ color: '#22d3ee', fontWeight: 600 }}>
                    Войти
                  </Link>
                </Text>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
