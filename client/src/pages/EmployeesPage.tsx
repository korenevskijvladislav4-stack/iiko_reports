import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Form, Input, InputNumber, Space, Modal, Typography, Select, Switch, Tooltip, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../context/AuthContext';
import {
  useGetDepartmentsQuery,
  useGetPositionsQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../api/rtkApi';

type Department = { id: string; name: string };
type Position = { id: string; name: string };
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  scheduleAccessRole: string;
  includeInSchedule: boolean;
  departmentId?: string | null;
  positionId?: string | null;
  hourlyRate?: number | null;
};

const ROLE_OPTIONS = [
  { label: 'Владелец', value: 'owner' },
  { label: 'Администратор', value: 'admin' },
  { label: 'Сотрудник', value: 'staff' },
];

const SCHEDULE_ACCESS_OPTIONS = [
  { label: 'Нет доступа', value: 'none' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Работник', value: 'worker' },
];

export default function EmployeesPage() {
  const { auth } = useAuth();
  const { data: depData, isLoading: depsLoading } = useGetDepartmentsQuery(undefined, { skip: !auth });
  const { data: posData, isLoading: posLoading } = useGetPositionsQuery(undefined, { skip: !auth });
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery(undefined, { skip: !auth });
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const canManage =
    auth?.user?.role === 'owner' ||
    auth?.user?.role === 'admin' ||
    (auth?.user?.role === 'staff' && auth?.user?.scheduleAccessRole === 'manager');

  useEffect(() => {
    if (Array.isArray(depData)) setDepartments(depData as Department[]);
  }, [depData]);

  useEffect(() => {
    if (Array.isArray(posData)) setPositions(posData as Position[]);
  }, [posData]);

  useEffect(() => {
    if (Array.isArray(usersData)) setUsers(usersData as User[]);
  }, [usersData]);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.id })),
    [departments]
  );
  const positionOptions = useMemo(
    () => positions.map((p) => ({ label: p.name, value: p.id })),
    [positions]
  );

  const usersWithNames = useMemo(
    () =>
      users.map((u) => ({
        ...u,
        departmentName: departments.find((d) => d.id === u.departmentId)?.name ?? '—',
        positionName: positions.find((p) => p.id === u.positionId)?.name ?? '—',
      })),
    [users, departments, positions]
  );

  const columns: ColumnsType<(typeof usersWithNames)[number]> = [
    { title: 'ФИО', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Роль', dataIndex: 'role', key: 'role', render: (v) => ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v },
    { title: 'Подразделение', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'Должность', dataIndex: 'positionName', key: 'positionName' },
    {
      title: 'В графике',
      dataIndex: 'includeInSchedule',
      key: 'includeInSchedule',
      width: 100,
      render: (v: boolean) => (v ? 'Да' : 'Нет'),
    },
    {
      title: 'Ставка, ₽/час',
      dataIndex: 'hourlyRate',
      key: 'hourlyRate',
      render: (value: number | null | undefined) =>
        value != null ? value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '—',
    },
    ...(canManage
      ? [
          {
            title: 'Действия',
            key: 'actions',
            width: 90,
            render: (_: unknown, record: (typeof usersWithNames)[number]) => (
              <Space size="small">
                <Tooltip title="Изменить">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingUser(record);
                      form.setFieldsValue({
                        name: record.name,
                        email: record.email,
                        role: record.role,
                        scheduleAccessRole: record.scheduleAccessRole,
                        includeInSchedule: record.includeInSchedule,
                        departmentId: record.departmentId ?? undefined,
                        positionId: record.positionId ?? undefined,
                        hourlyRate: record.hourlyRate ?? undefined,
                      });
                      setModalOpen(true);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить пользователя?"
                  description={record.name}
                  onConfirm={async () => {
                    try {
                      await deleteUser(record.id).unwrap();
                      setUsers((prev) => prev.filter((u) => u.id !== record.id));
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : 'Не удалось удалить пользователя');
                    }
                  }}
                  okText="Удалить"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Удалить">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          } as ColumnsType<(typeof usersWithNames)[number]>[number],
        ]
      : []),
  ];

  if (!auth) return null;

  return (
    <div style={{ width: '100%', maxWidth: '100%', paddingBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
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
          <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Пользователи компании
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Роли, доступ к графику, подразделения, должности и почасовые ставки. Флаг «Добавить в график» определяет отображение в матрице смен.
          </Typography.Text>
        </div>
      </div>

      <Card
        className="report-dashboard-card"
        title="Пользователи"
        extra={
          canManage && (
            <Button
              type="primary"
              onClick={() => {
                setEditingUser(null);
                form.resetFields();
                form.setFieldsValue({ role: 'staff', scheduleAccessRole: 'none', includeInSchedule: false });
                setModalOpen(true);
              }}
            >
              Добавить пользователя
            </Button>
          )
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table
          size="small"
          rowKey="id"
          loading={depsLoading || posLoading || usersLoading}
          columns={columns}
          dataSource={usersWithNames}
          className="hr-data-table"
        />
      </Card>

      <Modal
        title={editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            if (editingUser) {
              const payload: Record<string, unknown> = {
                name: values.name,
                email: values.email,
                role: values.role,
                scheduleAccessRole: values.scheduleAccessRole,
                includeInSchedule: values.includeInSchedule,
                departmentId: values.departmentId ?? null,
                positionId: values.positionId ?? null,
                hourlyRate: values.hourlyRate ?? null,
              };
              if (values.password) payload.password = values.password;
              const updated = await updateUser({ id: editingUser.id, payload }).unwrap();
              setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? (updated as User) : u)));
            } else {
              const created = await createUser({
                name: values.name,
                email: values.email,
                password: values.password,
                role: values.role ?? 'staff',
                scheduleAccessRole: values.scheduleAccessRole ?? 'none',
                includeInSchedule: values.includeInSchedule ?? false,
                departmentId: values.departmentId ?? null,
                positionId: values.positionId ?? null,
                hourlyRate: values.hourlyRate ?? null,
              }).unwrap();
              setUsers((prev) => [...prev, created as User]);
            }
            setModalOpen(false);
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Не удалось сохранить пользователя');
          }
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          {editingUser && (
            <Form.Item name="password" label="Новый пароль (оставьте пустым, чтобы не менять)">
              <Input.Password placeholder="Оставьте пустым" />
            </Form.Item>
          )}
          {canManage && (
            <>
              <Form.Item name="role" label="Роль">
                <Select options={ROLE_OPTIONS} />
              </Form.Item>
              <Form.Item name="scheduleAccessRole" label="Доступ к графику">
                <Select options={SCHEDULE_ACCESS_OPTIONS} />
              </Form.Item>
              <Form.Item
                name="includeInSchedule"
                label="Добавить в график"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          )}
          <Form.Item name="departmentId" label="Подразделение">
            <Select
              allowClear
              options={departmentOptions}
              placeholder="Не выбрано"
            />
          </Form.Item>
          <Form.Item name="positionId" label="Должность">
            <Select
              allowClear
              options={positionOptions}
              placeholder="Не выбрано"
            />
          </Form.Item>
          <Form.Item
            name="hourlyRate"
            label="Почасовая ставка, ₽"
            rules={[{ min: 0, type: 'number', message: 'Ставка не может быть отрицательной' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={50}
              min={0}
              placeholder="Например, 300"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
