import { useState } from 'react';
import { Card, Table, Button, Space, Alert, Typography, Form, Input, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getToken, fetchOlapReport } from '../api/client';

type TableRow = Record<string, unknown>;

const REPORT_TYPES = [
  { value: 'SALES', label: 'По продажам' },
  { value: 'TRANSACTIONS', label: 'По проводкам' },
  { value: 'DELIVERIES', label: 'По доставкам' },
  { value: 'STOCK', label: 'Контроль хранения' },
];

function formatToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function ReportsPage() {
  const [auth, setAuth] = useState<{ serverUrl: string; token: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<ColumnsType<TableRow>>([]);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [authForm] = Form.useForm();
  const [reportForm] = Form.useForm();

  const onLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { serverUrl, login, password } = await authForm.validateFields();
      const { token } = await getToken({ serverUrl, login, password });
      setAuth({ serverUrl, token });
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setAuthLoading(false);
    }
  };

  const runReport = async () => {
    if (!auth) {
      setError('Сначала выполните вход');
      return;
    }
    setError(null);
    setRawResponse(null);
    setLoading(true);
    try {
      const values = await reportForm.validateFields();
      const from = formatToDDMMYYYY(values.dateFrom);
      const to = formatToDDMMYYYY(values.dateTo);
      const result = await fetchOlapReport({
        serverUrl: auth.serverUrl,
        token: auth.token,
        report: values.reportType,
        from,
        to,
      });

      if (result.raw) {
        setRawResponse(result.raw);
        setData([]);
        setColumns([]);
        return;
      }

      const parsed = result.data;
      if (Array.isArray(parsed)) {
        setData(parsed);
        setColumns(
          parsed.length
            ? Object.keys(parsed[0] as object).map((key) => ({ key, dataIndex: key, title: key }))
            : []
        );
      } else if (parsed && typeof parsed === 'object' && 'rows' in parsed && Array.isArray((parsed as { rows: unknown }).rows)) {
        const rows = (parsed as { rows: TableRow[] }).rows;
        setData(rows);
        const cols = (parsed as { columns?: { key: string; title: string }[] }).columns;
        setColumns(
          (cols ?? (rows[0] ? Object.keys(rows[0]).map((k) => ({ key: k, title: k })) : [])).map(
            (c) => ({ key: c.key, dataIndex: c.key, title: c.title ?? c.key })
          )
        );
      } else {
        setData([]);
        setColumns([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
      setData([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={5}>OLAP отчёты iiko (Server API)</Typography.Title>

      {!auth ? (
        <Card title="Вход" size="small">
          <Form form={authForm} layout="vertical" style={{ maxWidth: 480 }}>
            <Form.Item name="serverUrl" label="Адрес сервера iiko" rules={[{ required: true }]}>
              <Input placeholder="https://xxx-co.iiko.it" />
            </Form.Item>
            <Form.Item name="login" label="Логин" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            {authError && <Alert type="error" message={authError} style={{ marginBottom: 16 }} />}
            <Button type="primary" onClick={onLogin} loading={authLoading}>
              Войти
            </Button>
          </Form>
        </Card>
      ) : (
        <>
          <Card size="small">
            <Space>
              <Typography.Text type="secondary">Подключено к серверу. </Typography.Text>
              <Button size="small" onClick={() => { setAuth(null); authForm.resetFields(); }}>
                Выйти
              </Button>
            </Space>
          </Card>

          <Card size="small">
            <Form form={reportForm} layout="inline" onFinish={runReport} style={{ marginBottom: 16 }}>
              <Form.Item name="reportType" label="Тип отчёта" initialValue="SALES" rules={[{ required: true }]}>
                <Select options={REPORT_TYPES} style={{ minWidth: 180 }} />
              </Form.Item>
              <Form.Item name="dateFrom" label="Дата с" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
              <Form.Item name="dateTo" label="По" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Загрузить отчёт
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}

          {rawResponse && (
            <Card title="Ответ (XML/текст)">
              <pre style={{ maxHeight: 400, overflow: 'auto', fontSize: 12 }}>{rawResponse}</pre>
            </Card>
          )}

          <Card title="Данные отчёта">
            <Table
              size="small"
              loading={loading}
              columns={columns}
              dataSource={data.map((row, i) => ({ ...row, key: i }))}
              pagination={{ pageSize: 50 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </>
      )}
    </Space>
  );
}
