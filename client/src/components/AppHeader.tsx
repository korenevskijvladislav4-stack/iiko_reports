import { Layout, Typography } from 'antd';

const { Header } = Layout;
const { Title } = Typography;

export default function AppHeader() {
  return (
    <Header style={{ display: 'flex', alignItems: 'center', background: '#001529', padding: '0 24px' }}>
      <Title level={4} style={{ margin: 0, color: '#fff' }}>
        iiko OLAP — отчёты
      </Title>
    </Header>
  );
}
