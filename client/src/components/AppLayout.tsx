import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space, Tag } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  LineChartOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const allMenuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Главная' },
  { key: '/reports/sales', icon: <BarChartOutlined />, label: 'Отчёт по продажам' },
  { key: '/reports/dishes', icon: <AppstoreOutlined />, label: 'Отчёт по блюдам' },
  { key: '/reports/cashiers', icon: <UserOutlined />, label: 'Отчёт по кассирам' },
  { key: '/reports/product-cost', icon: <CalculatorOutlined />, label: 'Стоимость товара' },
  { key: '/reports/department-salary', icon: <TeamOutlined />, label: 'Зарплата подразделений' },
  { key: '/reports/store-balance', icon: <DatabaseOutlined />, label: 'Остатки по складам' },
  { key: '/references', icon: <DatabaseOutlined />, label: 'Справочники' },
  { key: '/hr/departments', icon: <ApartmentOutlined />, label: 'Подразделения и должности' },
  { key: '/hr/employees', icon: <TeamOutlined />, label: 'Сотрудники' },
  { key: '/hr/schedule', icon: <CalendarOutlined />, label: 'График смен' },
];

/** Пути для обычных сотрудников (staff, не менеджеры) */
const STAFF_PATHS = ['/hr/employees', '/hr/schedule'];
/** Дополнительные пути для менеджеров (staff + scheduleAccessRole manager) */
const MANAGER_EXTRA_PATHS = ['/hr/departments'];

const sectionTitles: Record<string, string> = {
  '/': 'Панель управления',
  '/reports/sales': 'Отчёт по продажам',
  '/reports/dishes': 'Отчёт по блюдам',
  '/reports/cashiers': 'Отчёт по кассирам',
  '/reports/product-cost': 'Формирование стоимости товара',
  '/reports/department-salary': 'Зарплата подразделений',
  '/reports/store-balance': 'Остатки по складам',
  '/references': 'Справочники',
  '/hr/departments': 'Подразделения и должности',
  '/hr/employees': 'Сотрудники',
  '/hr/schedule': 'График смен',
};

export default function AppLayout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const isStaff = auth.user.role === 'staff';
  const isManager = isStaff && auth.user.scheduleAccessRole === 'manager';
  const isOwner = auth.user.role === 'owner';
  const menuItems = isStaff
    ? allMenuItems.filter((item) => STAFF_PATHS.includes(item.key) || (isManager && MANAGER_EXTRA_PATHS.includes(item.key)))
    : allMenuItems.filter((item) => item.key !== '/references' || isOwner);
  const staffDefaultPath = '/hr/employees';

  const siderWidth = collapsed ? 80 : 248;
  const currentTitle = sectionTitles[location.pathname] ?? 'iiko Отчёты';
  const companyLabel = auth.user.companyName ?? `Компания ${auth.user.companyId.slice(0, 6)}`;

  return (
    <Layout style={{ minHeight: '100vh' }} className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={248}
        collapsedWidth={80}
        className="app-layout-sider"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          overflow: 'auto',
          zIndex: 100,
          background:
            'linear-gradient(180deg, #0f172a 0%, #0b1220 50%, #020617 100%), radial-gradient(ellipse 80% 40% at 0% 0%, rgba(34,211,238,0.06) 0, transparent 60%)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.25)',
          borderRight: '1px solid rgba(148,163,184,0.12)',
        }}
      >
        <div className="app-layout-logo">
          <Link to={isStaff ? staffDefaultPath : '/'} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 12,
                background:
                  'linear-gradient(135deg, rgba(34,211,238,0.25) 0%, rgba(99,102,241,0.25) 100%), rgba(15,23,42,0.9)',
                border: '1px solid rgba(34,211,238,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22d3ee',
              }}
            >
              <LineChartOutlined style={{ fontSize: 22 }} />
            </div>
            {!collapsed && (
              <span className="app-layout-logo-text">iiko Отчёты</span>
            )}
          </Link>
        </div>
        <div className="app-layout-nav-label">
          {!collapsed && <Text style={{ color: 'var(--premium-muted)', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Навигация</Text>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="app-layout-menu"
          style={{
            marginTop: 8,
            padding: collapsed ? '0 0 16px' : '0 12px 16px',
            background: 'transparent',
            border: 'none',
          }}
        />
      </Sider>
      <Layout style={{ marginLeft: siderWidth, minHeight: '100vh' }}>
        <Header className="app-layout-header">
          <Space size={16} align="center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="app-layout-trigger"
            />
            <div style={{ height: 20, width: 1, background: 'rgba(148,163,184,0.3)', borderRadius: 1 }} />
            <Text strong style={{ fontSize: 16, color: 'var(--premium-text)', letterSpacing: -0.3, fontWeight: 700 }}>
              {currentTitle}
            </Text>
          </Space>
          <Space size={12} align="center">
            <Tag className="app-layout-server-tag">
              {companyLabel}
            </Tag>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              className="app-layout-logout"
            >
              Выйти
            </Button>
          </Space>
        </Header>
        <Content className="app-layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
