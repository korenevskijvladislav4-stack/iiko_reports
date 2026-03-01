import { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Form, Input, InputNumber, Space, Modal, Typography, Tooltip, Tag, Popconfirm, message, Select } from 'antd';
import { EditOutlined, DeleteOutlined, ApartmentOutlined, IdcardOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../context/AuthContext';
import {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetPositionsQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
  useGetProductGroupValuesQuery,
  useGetPointsQuery,
  useGetPointDepartmentLinksQuery,
  useSetPointDepartmentMutation,
  useUnsetPointDepartmentMutation,
} from '../api/rtkApi';

type Department = { id: string; name: string; priority?: number; productGroupValues?: string[] | null };
type Position = { id: string; name: string; priority?: number };

export default function DepartmentsPage() {
  const { auth } = useAuth();
  const canManage =
    auth?.user?.role === 'owner' ||
    auth?.user?.role === 'admin' ||
    (auth?.user?.role === 'staff' && auth?.user?.scheduleAccessRole === 'manager');
  const { data: depData, isLoading: depsLoading } = useGetDepartmentsQuery(undefined, { skip: !auth });
  const { data: posData, isLoading: posLoading } = useGetPositionsQuery(undefined, { skip: !auth });
  const [createDepartment] = useCreateDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [createPosition] = useCreatePositionMutation();
  const [updatePosition] = useUpdatePositionMutation();
  const [deletePosition] = useDeletePositionMutation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const { data: productGroupOptions = [] } = useGetProductGroupValuesQuery(undefined, { skip: !auth });
  const { data: pointsList = [] } = useGetPointsQuery(undefined, { skip: !auth });
  const { data: pointLinks = [] } = useGetPointDepartmentLinksQuery(undefined, { skip: !auth });
  const [setPointDepartment] = useSetPointDepartmentMutation();
  const [unsetPointDepartment] = useUnsetPointDepartmentMutation();
  const previousPointNamesRef = useRef<string[]>([]);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm] = Form.useForm();

  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm] = Form.useForm();

  useEffect(() => {
    if (Array.isArray(depData)) {
      setDepartments(depData as Department[]);
    }
  }, [depData]);

  useEffect(() => {
    if (Array.isArray(posData)) {
      setPositions(posData as Position[]);
    }
  }, [posData]);

  const deptColumns: ColumnsType<Department> = [
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      align: 'center',
      render: (v: number) => (
        <Tag className="priority-tag" color="cyan" style={{ margin: 0, minWidth: 40 }}>
          {v ?? 0}
        </Tag>
      ),
    },
    {
      title: 'Название подразделения',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      align: 'center',
    },
    {
      title: 'Точки',
      key: 'points',
      width: 160,
      align: 'center',
      render: (_: unknown, record: Department) => {
        const linked = pointLinks.filter((l) => l.departmentId === record.id).map((l) => l.pointName);
        if (linked.length === 0) {
          return <Typography.Text type="secondary">Все точки</Typography.Text>;
        }
        return (
          <Space size={[4, 4]} wrap style={{ justifyContent: 'center' }}>
            {linked.map((p) => (
              <Tag key={p} style={{ margin: 0 }}>{p}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Группы продукции',
      key: 'productGroups',
      width: 160,
      align: 'center',
      render: (_: unknown, record: Department) => {
        const vals = record.productGroupValues;
        if (!vals || !Array.isArray(vals) || vals.length === 0) {
          return <Typography.Text type="secondary">—</Typography.Text>;
        }
        return (
          <Space size={[4, 4]} wrap style={{ justifyContent: 'center' }}>
            {vals.map((v) => (
              <Tag key={v} color="blue" style={{ margin: 0 }}>{v}</Tag>
            ))}
          </Space>
        );
      },
    },
    ...(canManage
      ? [
          {
            title: 'Действия',
            key: 'actions',
            width: 120,
            align: 'center' as const,
            render: (_: unknown, record: Department) => (
              <Space size="small">
                <Tooltip title="Изменить">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingDept(record);
                      const linkedPoints = pointLinks
                        .filter((l) => l.departmentId === record.id)
                        .map((l) => l.pointName);
                      previousPointNamesRef.current = linkedPoints;
                      deptForm.setFieldsValue({
                        name: record.name,
                        priority: record.priority ?? 0,
                        productGroupValues: record.productGroupValues ?? undefined,
                        pointNames: linkedPoints,
                      });
                      setDeptModalOpen(true);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить подразделение?"
                  description={record.name}
                  onConfirm={async () => {
                    try {
                      await deleteDepartment(record.id).unwrap();
                      setDepartments((prev) => prev.filter((d) => d.id !== record.id));
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : 'Не удалось удалить подразделение');
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
          },
        ]
      : []),
  ];

  const posColumns: ColumnsType<Position> = [
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      align: 'center' as const,
      render: (v: number) => (
        <Tag className="priority-tag" color="blue" style={{ margin: 0, minWidth: 40 }}>
          {v ?? 0}
        </Tag>
      ),
    },
    { title: 'Название должности', dataIndex: 'name', key: 'name' },
    ...(canManage
      ? [
          {
            title: 'Действия',
            key: 'actions',
            width: 90,
            render: (_: unknown, record: Position) => (
              <Space size="small">
                <Tooltip title="Изменить">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingPos(record);
                      posForm.setFieldsValue({ name: record.name, priority: record.priority ?? 0 });
                      setPosModalOpen(true);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить должность?"
                  description={record.name}
                  onConfirm={async () => {
                    try {
                      await deletePosition(record.id).unwrap();
                      setPositions((prev) => prev.filter((p) => p.id !== record.id));
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : 'Не удалось удалить должность');
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
          },
        ]
      : []),
  ];

  if (!auth) return null;

  return (
    <div className="departments-page" style={{ width: '100%', maxWidth: '100%', paddingBottom: 24 }}>
      <div
        className="departments-hero"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 28,
          padding: '24px 28px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.6) 50%, rgba(15,23,42,0.5) 100%)',
          boxShadow: '0 0 0 1px rgba(148,163,184,0.08), 0 16px 48px rgba(0,0,0,0.25), 0 0 80px rgba(56,189,248,0.06)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
            boxShadow: '0 8px 32px rgba(34, 211, 238, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ApartmentOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Подразделения и должности
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 14, lineHeight: 1.5 }}>
            Структура компании: подразделения и должности для привязки сотрудников. Приоритет задаёт порядок отображения.
          </Typography.Text>
        </div>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size={28}>
        <Card
          className="report-dashboard-card departments-card"
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ApartmentOutlined style={{ color: 'rgba(34, 211, 238, 0.9)', fontSize: 18 }} />
              Подразделения
            </span>
          }
          extra={
            canManage && (
              <Button
                type="primary"
                onClick={() => {
                  setEditingDept(null);
                  previousPointNamesRef.current = [];
                  deptForm.resetFields();
                  deptForm.setFieldsValue({ priority: 0, pointNames: [] });
                  setDeptModalOpen(true);
                }}
              >
                Добавить подразделение
              </Button>
            )
          }
          styles={{ body: { padding: 0 } }}
        >
          <Table<Department>
            size="small"
            rowKey="id"
            loading={depsLoading}
            columns={deptColumns}
            dataSource={departments}
            pagination={false}
            className="hr-data-table"
            tableLayout="fixed"
          />
        </Card>

        <Card
          className="report-dashboard-card departments-card"
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IdcardOutlined style={{ color: 'rgba(99, 102, 241, 0.9)', fontSize: 18 }} />
              Должности
            </span>
          }
          extra={
            canManage && (
              <Button
                type="primary"
                onClick={() => {
                  setEditingPos(null);
                  posForm.resetFields();
                  posForm.setFieldsValue({ priority: 0 });
                  setPosModalOpen(true);
                }}
              >
                Добавить должность
              </Button>
            )
          }
          styles={{ body: { padding: 0 } }}
        >
          <Table<Position>
            size="small"
            rowKey="id"
            loading={posLoading}
            columns={posColumns}
            dataSource={positions}
            pagination={false}
            className="hr-data-table"
          />
        </Card>
      </Space>

      <Modal
        title={editingDept ? 'Редактирование подразделения' : 'Новое подразделение'}
        open={deptModalOpen}
        onCancel={() => setDeptModalOpen(false)}
        onOk={async () => {
          try {
            const values = await deptForm.validateFields();
            const payload = {
              name: values.name,
              priority: values.priority,
              productGroupValues: values.productGroupValues ?? null,
            };
            let departmentId: string;
            if (editingDept) {
              const updated = await updateDepartment({ id: editingDept.id, ...payload }).unwrap();
              setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? (updated as Department) : d)));
              departmentId = editingDept.id;
            } else {
              const created = await createDepartment({
                name: payload.name,
                priority: payload.priority,
                productGroupValues: payload.productGroupValues ?? null,
              }).unwrap();
              setDepartments((prev) => [...prev, created as Department]);
              departmentId = (created as { id: string }).id;
            }
            const newPointNames: string[] = Array.isArray(values.pointNames) ? values.pointNames : [];
            const prevPointNames = previousPointNamesRef.current;
            for (const pointName of newPointNames) {
              await setPointDepartment({ pointName, departmentId }).unwrap();
            }
            for (const pointName of prevPointNames) {
              if (!newPointNames.includes(pointName)) {
                await unsetPointDepartment(pointName).unwrap();
              }
            }
            setDeptModalOpen(false);
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Не удалось сохранить подразделение');
          }
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={deptForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название подразделения"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="priority"
            label="Приоритет (меньше = выше)"
            tooltip="Меньшее значение отображается первым"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="productGroupValues"
            label="Группы продукции"
            tooltip="Группы блюд, которые производит это подразделение (из справочника групп продукции)"
          >
            <Select
              mode="multiple"
              placeholder="Выберите группы продукции"
              allowClear
              options={productGroupOptions.map((v) => ({ label: v, value: v }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="pointNames"
            label="Точки iiko (подразделения)"
            tooltip="Торговые предприятия iiko, привязанные к этому подразделению. Список точек загружается в справочниках."
          >
            <Select
              mode="multiple"
              placeholder="Выберите точки"
              allowClear
              options={pointsList.map((p) => ({ label: p, value: p }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPos ? 'Редактирование должности' : 'Новая должность'}
        open={posModalOpen}
        onCancel={() => setPosModalOpen(false)}
        onOk={async () => {
          try {
            const values = await posForm.validateFields();
            if (editingPos) {
              const updated = await updatePosition({ id: editingPos.id, name: values.name, priority: values.priority }).unwrap();
              setPositions((prev) => prev.map((p) => (p.id === editingPos.id ? (updated as Position) : p)));
            } else {
              const created = await createPosition({ name: values.name, priority: values.priority }).unwrap();
              setPositions((prev) => [...prev, created as Position]);
            }
            setPosModalOpen(false);
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Не удалось сохранить должность');
          }
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={posForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название должности"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="priority"
            label="Приоритет (меньше = выше)"
            tooltip="Меньшее значение отображается первым"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

