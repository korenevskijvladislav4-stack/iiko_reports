import { useState, useEffect } from 'react';
import { Card, Button, List, Typography, message, Popconfirm } from 'antd';
import { DatabaseOutlined, SyncOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getPayTypes, syncPayTypes, deletePayType } from '../api/client';

function getHostKey(serverUrl: string): string {
  return serverUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || serverUrl;
}

export default function ReferencesPage() {
  const { auth } = useAuth();
  const [payTypesList, setPayTypesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const host = auth ? getHostKey(auth.serverUrl) : '';

  useEffect(() => {
    if (!host) return;
    setLoading(true);
    getPayTypes(host)
      .then(setPayTypesList)
      .catch(() => setPayTypesList([]))
      .finally(() => setLoading(false));
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card
        style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DatabaseOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Справочники
            </Typography.Title>
            <Typography.Text type="secondary">
              Данные из iiko для фильтров и отчётов
            </Typography.Text>
          </div>
        </div>
      </Card>

      <Card
        title="Типы оплат"
        extra={
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={syncLoading}
            onClick={handleSyncPayTypes}
          >
            Обновить
          </Button>
        }
        loading={loading}
      >
        {payTypesList.length === 0 && !loading ? (
          <Typography.Text type="secondary">
            Справочник пуст. Нажмите «Обновить», чтобы загрузить типы оплат из iiko.
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
      </Card>
    </div>
  );
}
