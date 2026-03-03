import { useState, useEffect } from 'react';
import { Card, Button, List, Typography, message, Popconfirm, Space, Table, Modal, Form, Input } from 'antd';
import { DatabaseOutlined, SyncOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../context/AuthContext';
import {
  useGetPayTypesQuery,
  useSyncPayTypesMutation,
  useDeletePayTypeMutation,
  useGetDeliveryFlagValuesQuery,
  useSyncDeliveryFlagValuesMutation,
  useDeleteDeliveryFlagValueMutation,
  useGetProductGroupValuesQuery,
  useSyncProductGroupValuesMutation,
  useDeleteProductGroupValueMutation,
  useGetPointsQuery,
  useSyncPointsMutation,
  useDeletePointMutation,
  useGetProductsQuery,
  useSyncProductsMutation,
  useDeleteProductMutation,
  useGetIikoCredentialsQuery,
  useSaveIikoCredentialsMutation,
} from '../api/rtkApi';

export default function ReferencesPage() {
  const { auth } = useAuth();
  const canManageRefs = auth?.user?.role === 'owner' || auth?.user?.role === 'admin';
  const { data: payTypesData } = useGetPayTypesQuery(undefined, { skip: !auth });
  const [syncPayTypes, { isLoading: syncLoading }] = useSyncPayTypesMutation();
  const [deletePayTypeMutation] = useDeletePayTypeMutation();
  const { data: deliveryData } = useGetDeliveryFlagValuesQuery(undefined, { skip: !auth });
  const [syncDeliveryFlags, { isLoading: deliveryFlagSyncLoading }] = useSyncDeliveryFlagValuesMutation();
  const [deleteDeliveryFlagMutation] = useDeleteDeliveryFlagValueMutation();
  const { data: productGroupsData } = useGetProductGroupValuesQuery(undefined, { skip: !auth });
  const [syncProductGroups, { isLoading: productGroupsSyncLoading }] = useSyncProductGroupValuesMutation();
  const [deleteProductGroupMutation] = useDeleteProductGroupValueMutation();
  const { data: iikoPointsData = [] } = useGetPointsQuery(undefined, { skip: !auth });
  const [syncPoints, { isLoading: syncPointsLoading }] = useSyncPointsMutation();
  const [deletePointMutation] = useDeletePointMutation();
  const { data: productsData = [] } = useGetProductsQuery(undefined, { skip: !auth });
  const [syncProducts, { isLoading: productsSyncLoading }] = useSyncProductsMutation();
  const [deleteProductMutation] = useDeleteProductMutation();
  const { data: iikoCreds, isLoading: iikoLoading } = useGetIikoCredentialsQuery(undefined, { skip: !auth });
  const [saveIikoCreds, { isLoading: iikoSaving }] = useSaveIikoCredentialsMutation();

  const [deleting, setDeleting] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<'payTypes' | 'delivery' | 'productGroups' | 'iikoPoints' | 'products' | null>(null);
  const [deletingDelivery, setDeletingDelivery] = useState<string | null>(null);
  const [deletingProductGroup, setDeletingProductGroup] = useState<string | null>(null);
  const [deletingPoint, setDeletingPoint] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [iikoForm] = Form.useForm();

  type ReferenceRow = {
    key: 'payTypes' | 'delivery' | 'productGroups' | 'iikoPoints' | 'products';
    name: string;
    description: string;
    count: number;
  };

  const iikoPointsList = Array.isArray(iikoPointsData) ? iikoPointsData : [];
  const productsList = Array.isArray(productsData) ? (productsData as { productId: string; name: string }[]) : [];

  useEffect(() => {
    if (iikoCreds) {
      iikoForm.setFieldsValue({
        serverUrl: iikoCreds.serverUrl,
        login: iikoCreds.login,
        password: '',
      });
    }
  }, [auth, iikoForm]);

  const payTypesList = Array.isArray(payTypesData) ? (payTypesData as string[]) : [];
  const deliveryFlagList = Array.isArray(deliveryData) ? (deliveryData as string[]) : [];
  const productGroupsList = Array.isArray(productGroupsData) ? (productGroupsData as string[]) : [];

  const handleSyncPayTypes = async () => {
    if (!auth) return;
    try {
      const { count } = await syncPayTypes().unwrap();
      message.success(`Справочник обновлён: ${count} типов оплат`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    }
  };

  const handleDeletePayType = async (payType: string) => {
    if (!auth) return;
    setDeleting(payType);
    try {
      await deletePayTypeMutation(payType).unwrap();
      message.success('Значение удалено');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(null);
    }
  };

  const handleSyncDeliveryFlag = async () => {
    if (!auth) return;
    try {
      const { count } = await syncDeliveryFlags().unwrap();
      message.success(`Справочник обновлён: ${count} значений «Доставка»`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    }
  };

  const handleDeleteDeliveryValue = async (value: string) => {
    if (!auth) return;
    setDeletingDelivery(value);
    try {
      await deleteDeliveryFlagMutation(value).unwrap();
      message.success('Значение удалено');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeletingDelivery(null);
    }
  };

  const handleSyncProductGroups = async () => {
    if (!auth) return;
    try {
      const { count } = await syncProductGroups().unwrap();
      message.success(`Справочник обновлён: ${count} групп продукции`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    }
  };

  const handleDeleteProductGroupValue = async (value: string) => {
    if (!auth) return;
    setDeletingProductGroup(value);
    try {
      await deleteProductGroupMutation(value).unwrap();
      message.success('Значение удалено');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeletingProductGroup(null);
    }
  };

  const handleSyncIikoPoints = async () => {
    if (!auth) return;
    try {
      const { count } = await syncPoints().unwrap();
      message.success(`Справочник обновлён: ${count} точек`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    }
  };

  const handleDeletePoint = async (pointName: string) => {
    if (!auth) return;
    setDeletingPoint(pointName);
    try {
      await deletePointMutation(pointName).unwrap();
      message.success('Точка удалена из справочника');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeletingPoint(null);
    }
  };

  const handleSyncProducts = async () => {
    if (!auth) return;
    try {
      await syncProducts().unwrap();
      message.success('Справочник номенклатуры обновлён');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка синхронизации');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!auth) return;
    setDeletingProductId(productId);
    try {
      await deleteProductMutation(productId).unwrap();
      message.success('Товар удалён из справочника');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeletingProductId(null);
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
    {
      key: 'productGroups',
      name: 'Группы продукции',
      description: 'Группы блюд из iiko для фильтра «Только группы» в отчёте по блюдам.',
      count: productGroupsList.length,
    },
    {
      key: 'iikoPoints',
      name: 'Точки',
      description: 'Торговые предприятия (Department) из iiko. Привязку к подразделениям настраивайте в форме создания/редактирования подразделения.',
      count: iikoPointsList.length,
    },
    {
      key: 'products',
      name: 'Номенклатура (товары)',
      description: 'Все элементы номенклатуры из iiko. Используются для отображения названий товаров в отчётах по остаткам.',
      count: productsList.length,
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
          {canManageRefs &&
            (record.key === 'payTypes' ? (
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={handleSyncPayTypes}
                loading={syncLoading}
              >
                Обновить
              </Button>
            ) : record.key === 'delivery' ? (
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={handleSyncDeliveryFlag}
                loading={deliveryFlagSyncLoading}
              >
                Обновить
              </Button>
            ) : record.key === 'productGroups' ? (
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={handleSyncProductGroups}
                loading={productGroupsSyncLoading}
              >
                Обновить
              </Button>
            ) : record.key === 'iikoPoints' ? (
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={handleSyncIikoPoints}
                loading={syncPointsLoading}
              >
                Обновить
              </Button>
            ) : record.key === 'products' ? (
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={handleSyncProducts}
                loading={productsSyncLoading}
              >
                Обновить
              </Button>
            ) : null)}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '100%', width: '100%', margin: 0, padding: '0 0 24px' }}>
      <Card
        style={{ marginBottom: 24 }}
        title="Подключение к iiko (для всей компании)"
      >
        <Typography.Paragraph style={{ color: 'var(--premium-muted)', marginBottom: 16 }}>
          Администратор компании задаёт здесь сервер и учётные данные iiko. Все отчёты и справочники используют эти настройки.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          form={iikoForm}
          onFinish={async (values: { serverUrl: string; login: string; password: string }) => {
            if (!auth) return;
            try {
              await saveIikoCreds(values).unwrap();
              message.success('Настройки iiko сохранены');
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Не удалось сохранить настройки iiko');
            }
          }}
        >
          <Space
            direction="vertical"
            style={{ width: '100%' }}
            size="middle"
          >
            <Form.Item
              name="serverUrl"
              label="Адрес сервера iiko"
              rules={[{ required: true, message: 'Укажите адрес сервера' }]}
            >
              <Input placeholder="https://xxx-co.iiko.it" disabled={iikoLoading} />
            </Form.Item>
            <Form.Item
              name="login"
              label="Логин"
              rules={[{ required: true, message: 'Введите логин' }]}
            >
              <Input placeholder="Администратор" disabled={iikoLoading} />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Введите пароль' }]}
              extra="Пароль не хранится в открытом виде и используется только для получения токена iiko."
            >
              <Input.Password placeholder="Пароль от iiko" disabled={iikoLoading} />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={iikoSaving}
              disabled={!auth || auth.user.role !== 'owner'}
            >
              Сохранить настройки
            </Button>
            {auth && auth.user.role !== 'owner' && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Только владелец компании может менять настройки подключения к iiko.
              </Typography.Text>
            )}
          </Space>
        </Form>
      </Card>
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
              : detailsType === 'productGroups'
                ? 'Группы продукции'
                : detailsType === 'iikoPoints'
                  ? 'Точки'
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
                    actions={
                      canManageRefs
                        ? [
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
                          ]
                        : []
                    }
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
                    actions={
                      canManageRefs
                        ? [
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
                          ]
                        : []
                    }
                  >
                    {item}
                  </List.Item>
                )}
              />
            )}
          </Space>
        )}

        {detailsType === 'productGroups' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'var(--premium-muted)' }}>
              Группы блюд (DishGroup) из iiko. Используются в фильтрах «Включить группы» и «Исключить группы» в отчёте по блюдам.
              Нажмите «Обновить» в таблице, чтобы загрузить группы из iiko.
            </Typography.Text>
            {productGroupsList.length === 0 ? (
              <Typography.Text style={{ color: 'var(--premium-muted)' }}>
                Справочник пуст. Нажмите «Обновить» в таблице, чтобы загрузить группы продукции из iiko.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={productGroupsList}
                renderItem={(item) => (
                  <List.Item
                    actions={
                      canManageRefs
                        ? [
                            <Popconfirm
                              key="del"
                              title="Удалить из справочника?"
                              description={item}
                              onConfirm={() => handleDeleteProductGroupValue(item)}
                              okText="Удалить"
                              cancelText="Отмена"
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={deletingProductGroup === item}
                              >
                                Удалить
                              </Button>
                            </Popconfirm>,
                          ]
                        : []
                    }
                  >
                    {item}
                  </List.Item>
                )}
              />
            )}
          </Space>
        )}

        {detailsType === 'iikoPoints' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'var(--premium-muted)' }}>
              Торговые предприятия (Department) из iiko. Используются в отчётах как «Точка». Привязку к подразделениям настраивайте в форме создания/редактирования подразделения. Нажмите «Обновить» в таблице, чтобы загрузить список из iiko. Удалённые точки можно снова добавить синхронизацией.
            </Typography.Text>
            {iikoPointsList.length === 0 ? (
              <Typography.Text style={{ color: 'var(--premium-muted)' }}>
                Справочник пуст. Нажмите «Обновить» в таблице, чтобы загрузить точки из iiko.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={iikoPointsList}
                renderItem={(item: string) => (
                  <List.Item
                    actions={
                      canManageRefs
                        ? [
                            <Popconfirm
                              key="del"
                              title="Удалить точку из справочника?"
                              description={item}
                              onConfirm={() => handleDeletePoint(item)}
                              okText="Удалить"
                              cancelText="Отмена"
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={deletingPoint === item}
                              >
                                Удалить
                              </Button>
                            </Popconfirm>,
                          ]
                        : []
                    }
                  >
                    {item}
                  </List.Item>
                )}
              />
            )}
          </Space>
        )}

        {detailsType === 'products' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'var(--premium-muted)' }}>
              Справочник номенклатуры из iiko (товары/блюда). Используется, чтобы отображать названия товаров в отчётах по остаткам.
            </Typography.Text>
            {productsList.length === 0 ? (
              <Typography.Text style={{ color: 'var(--premium-muted)' }}>
                Справочник пуст. Нажмите «Обновить» в таблице, чтобы загрузить номенклатуру из iiko.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={productsList}
                renderItem={({ productId, name }) => (
                  <List.Item
                    actions={
                      canManageRefs
                        ? [
                            <Popconfirm
                              key="del"
                              title="Удалить товар из справочника?"
                              description={name}
                              onConfirm={() => handleDeleteProduct(productId)}
                              okText="Удалить"
                              cancelText="Отмена"
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={deletingProductId === productId}
                              >
                                Удалить
                              </Button>
                            </Popconfirm>,
                          ]
                        : []
                    }
                  >
                    <Space direction="vertical" size={0}>
                      <Typography.Text>{name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {productId}
                      </Typography.Text>
                    </Space>
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
