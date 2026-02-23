import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  DatabaseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Главная' },
  { key: '/reports/sales', icon: <BarChartOutlined />, label: 'Отчёт по продажам' },
  { key: '/reports/dishes', icon: <AppstoreOutlined />, label: 'Отчёт по блюдам' },
  { key: '/reports/cashiers', icon: <UserOutlined />, label: 'Отчёт по кассирам' },
  { key: '/references', icon: <DatabaseOutlined />, label: 'Справочники' },
];

export default function AppLayout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const siderWidth = collapsed ? 80 : 240;

  return (
    <Layout style={{ minHeight: '100vh' }} className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          overflow: 'auto',
          zIndex: 100,
          background: 'linear-gradient(180deg, #1a2332 0%, #0f1419 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: collapsed ? 16 : 24,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {!collapsed && (
            <Text strong style={{ color: '#e8e8e8', fontSize: 18 }}>
              iiko Отчёты
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            marginTop: 16,
            background: 'transparent',
            border: 'none',
          }}
        />
      </Sider>
      <Layout style={{ marginLeft: siderWidth, minHeight: '100vh' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {auth.serverUrl.replace(/^https?:\/\//, '').split('/')[0]}
            </Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
              Выйти
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: 0,
            minHeight: 280,
            background: '#f0f2f5',
            padding: 24,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
