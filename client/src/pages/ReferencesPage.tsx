import { useState, useEffect } from 'react';
import { Card, Button, List, Typography, message, Popconfirm, Space, Table, Modal } from 'antd';
import { DatabaseOutlined, SyncOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../context/AuthContext';
import { getPayTypes, syncPayTypes, deletePayType, getDeliveryFlagValues, syncDeliveryFlagValues, deleteDeliveryFlagValue } from '../api/client';

function getHostKey(serverUrl: string): string {
  return serverUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || serverUrl;
}

export default function ReferencesPage() {
  const { auth } = useAuth();
  const [payTypesList, setPayTypesList] = useState<string[]>([]);
  const [, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deliveryFlagList, setDeliveryFlagList] = useState<string[]>([]);
  const [, setDeliveryFlagLoading] = useState(false);
  const [deliveryFlagSyncLoading, setDeliveryFlagSyncLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<'payTypes' | 'delivery' | null>(null);
  const [deletingDelivery, setDeletingDelivery] = useState<string | null>(null);

  const host = auth ? getHostKey(auth.serverUrl) : '';

  type ReferenceRow = {
    key: 'payTypes' | 'delivery';
    name: string;
    description: string;
    count: number;
  };

  useEffect(() => {
    if (!host) return;
    setLoading(true);
    getPayTypes(host)
      .then(setPayTypesList)
      .catch(() => setPayTypesList([]))
      .finally(() => setLoading(false));
  }, [host]);

  useEffect(() => {
    if (!host) return;
    setDeliveryFlagLoading(true);
    getDeliveryFlagValues(host)
      .then(setDeliveryFlagList)
      .catch(() => setDeliveryFlagList([]))
      .finally(() => setDeliveryFlagLoading(false));
  }, [host]);

  const handleSyncPayTypes = async () => {
    if (!auth) return;
    setSyncLoading(true);
    try {
      const { count } = await syncPayTypes(auth.serverUrl, auth.token);
      await getPayTypes(host).then(setPayTypesList);
      message.success(`Справочник обновлён: ${count} типов оплат`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeletePayType = async (payType: string) => {
    if (!host) return;
    setDeleting(payType);
    try {
      await deletePayType(host, payType);
      setPayTypesList((prev) => prev.filter((p) => p !== payType));
      message.success('Значение удалено');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(null);
    }
  };

  const handleSyncDeliveryFlag = async () => {
    if (!auth) return;
    setDeliveryFlagSyncLoading(true);
    try {
      const { count } = await syncDeliveryFlagValues(auth.serverUrl, auth.token);
      await getDeliveryFlagValues(host).then(setDeliveryFlagList);
      message.success(`Справочник обновлён: ${count} значений «Доставка»`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    } finally {
      setDeliveryFlagSyncLoading(false);
    }
  };

  const handleDeleteDeliveryValue = async (value: string) => {
    if (!host) return;
    setDeletingDelivery(value);
    try {
      await deleteDeliveryFlagValue(host, value);
      setDeliveryFlagList((prev) => prev.filter((v) => v !== value));
      message.success('Значение удалено');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeletingDelivery(null);
    }
  };

  const data: ReferenceRow[] = [
    {
      key: 'payTypes',
      name: 'Типы оплат',
      description: 'Используются в фильтрах и отчётах по продажам и кассирам.',
      count: payTypesList.length,
    },
    {
      key: 'delivery',
      name: 'Доставка',
      description: 'Значения признака доставки для фильтра в отчёте по продажам.',
      count: deliveryFlagList.length,
    },
  ];

  const columns: ColumnsType<ReferenceRow> = [
    {
      title: 'Справочник',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 12 }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: 'Кол-во значений',
      dataIndex: 'count',
      key: 'count',
      width: 150,
      align: 'right',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      align: 'right',
      render: (_: unknown, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetailsType(record.key);
              setDetailsOpen(true);
            }}
          >
            Просмотр
          </Button>
          {record.key === 'payTypes' ? (
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={handleSyncPayTypes}
              loading={syncLoading}
            >
              Обновить
            </Button>
          ) : (
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={handleSyncDeliveryFlag}
              loading={deliveryFlagSyncLoading}
            >
              Обновить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '100%', width: '100%', margin: 0, padding: '0 0 24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          padding: '20px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--premium-border)',
          background: 'linear-gradient(145deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.4) 100%)',
          boxShadow: '0 0 0 1px rgba(148,163,184,0.1), 0 12px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
            boxShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DatabaseOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Справочники
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Локальные списки значений из iiko для фильтров и отчётов
          </Typography.Text>
        </div>
      </div>

      <Typography.Paragraph style={{ color: 'var(--premium-muted)', margin: '0 4px 16px' }}>
        Здесь собраны справочники, которые кэшируют значения из iiko (типы оплат, признак «Доставка» и др.), чтобы фильтры и
        отчёты работали быстро и единообразно. После изменения настроек в iiko обновите соответствующий справочник.
      </Typography.Paragraph>

      <Card className="report-dashboard-card">
        <Table<ReferenceRow>
          size="small"
          columns={columns}
          dataSource={data}
          pagination={false}
          rowKey="key"
        />
      </Card>

      <Modal
        title={
          detailsType === 'payTypes'
            ? 'Типы оплат'
            : detailsType === 'delivery'
              ? 'Значения фильтра «Доставка»'
              : ''
        }
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={null}
        width={640}
      >
        {detailsType === 'payTypes' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'var(--premium-muted)' }}>
              Справочник типов оплат из iiko. Используется в отчётах и фильтрах по продажам и кассирам. Вы можете удалить
              отдельные элементы, если они больше не нужны в отчётах.
            </Typography.Text>
            {payTypesList.length === 0 ? (
              <Typography.Text style={{ color: 'var(--premium-muted)' }}>
                Справочник пуст. Нажмите «Обновить» в таблице, чтобы загрузить типы оплат из iiko.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={payTypesList}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="del"
                        title="Удалить из справочника?"
                        description={item}
                        onConfirm={() => handleDeletePayType(item)}
                        okText="Удалить"
                        cancelText="Отмена"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={deleting === item}
                        >
                          Удалить
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    {item}
                  </List.Item>
                )}
              />
            )}
          </Space>
        )}

        {detailsType === 'delivery' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'var(--premium-muted)' }}>
              Уникальные значения поля Delivery.IsDelivery из iiko OLAP, которые используются в фильтре «Доставка» в отчёте по
              продажам. Вы можете убрать отдельные значения из отчётов, удалив их из справочника.
            </Typography.Text>
            {deliveryFlagList.length === 0 ? (
              <Typography.Text style={{ color: 'var(--premium-muted)' }}>
                Справочник пуст. Нажмите «Обновить» в таблице, чтобы загрузить значения из iiko.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={deliveryFlagList}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="del"
                        title="Удалить из справочника?"
                        description={item}
                        onConfirm={() => handleDeleteDeliveryValue(item)}
                        okText="Удалить"
                        cancelText="Отмена"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={deletingDelivery === item}
                        >
                          Удалить
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    {item}
                  </List.Item>
                )}
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
