import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Modal,
  Typography,
  Select,
  DatePicker,
  TimePicker,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

type Department = { id: string; name: string };
type Position = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  email?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  hourlyRate?: number | null;
};
type Schedule = {
  id: string;
  employeeId: string;
  companyId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
};

export default function HrPage() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm] = Form.useForm();

  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm] = Form.useForm();

  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm] = Form.useForm();

  const [schModalOpen, setSchModalOpen] = useState(false);
  const [editingSch, setEditingSch] = useState<Schedule | null>(null);
  const [schForm] = Form.useForm();

  useEffect(() => {
    if (!auth) return;
    const load = async () => {
      setLoading(true);
      try {
        const [deps, pos, emps, schs] = await Promise.all([
          getDepartments(auth.token),
          getPositions(auth.token),
          getEmployees(auth.token),
          getSchedules(auth.token),
        ]);
        setDepartments(Array.isArray(deps) ? (deps as Department[]) : []);
        setPositions(Array.isArray(pos) ? (pos as Position[]) : []);
        setEmployees(Array.isArray(emps) ? (emps as Employee[]) : []);
        setSchedules(Array.isArray(schs) ? (schs as Schedule[]) : []);
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Не удалось загрузить данные HR');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth]);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.id })),
    [departments]
  );
  const positionOptions = useMemo(
    () => positions.map((p) => ({ label: p.name, value: p.id })),
    [positions]
  );
  const employeeOptions = useMemo(
    () => employees.map((e) => ({ label: e.name, value: e.id })),
    [employees]
  );

  const deptColumns: ColumnsType<Department> = [
    { title: 'Название подразделения', dataIndex: 'name', key: 'name' },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setEditingDept(record);
              deptForm.setFieldsValue({ name: record.name });
              setDeptModalOpen(true);
            }}
          >
            Изменить
          </Button>
          <Button
            size="small"
            danger
            onClick={async () => {
              if (!auth) return;
              try {
                await deleteDepartment(auth.token, record.id);
                setDepartments((prev) => prev.filter((d) => d.id !== record.id));
              } catch (e) {
                message.error(e instanceof Error ? e.message : 'Не удалось удалить подразделение');
              }
            }}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  const posColumns: ColumnsType<Position> = [
    { title: 'Название должности', dataIndex: 'name', key: 'name' },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setEditingPos(record);
              posForm.setFieldsValue({ name: record.name });
              setPosModalOpen(true);
            }}
          >
            Изменить
          </Button>
          <Button
            size="small"
            danger
            onClick={async () => {
              if (!auth) return;
              try {
                await deletePosition(auth.token, record.id);
                setPositions((prev) => prev.filter((p) => p.id !== record.id));
              } catch (e) {
                message.error(e instanceof Error ? e.message : 'Не удалось удалить должность');
              }
            }}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  const employeesWithNames = useMemo(
    () =>
      employees.map((e) => ({
        ...e,
        departmentName: departments.find((d) => d.id === e.departmentId)?.name ?? '—',
        positionName: positions.find((p) => p.id === e.positionId)?.name ?? '—',
      })),
    [employees, departments, positions]
  );

  const empColumns: ColumnsType<(typeof employeesWithNames)[number]> = [
    { title: 'ФИО', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Подразделение', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'Должность', dataIndex: 'positionName', key: 'positionName' },
    {
      title: 'Ставка, ₽/час',
      dataIndex: 'hourlyRate',
      key: 'hourlyRate',
      render: (value: number | null | undefined) =>
        value != null ? value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '—',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setEditingEmp(record);
              empForm.setFieldsValue({
                name: record.name,
                email: record.email ?? '',
                departmentId: record.departmentId ?? undefined,
                positionId: record.positionId ?? undefined,
                hourlyRate: record.hourlyRate ?? undefined,
              });
              setEmpModalOpen(true);
            }}
          >
            Изменить
          </Button>
          <Button
            size="small"
            danger
            onClick={async () => {
              if (!auth) return;
              try {
                await deleteEmployee(auth.token, record.id);
                setEmployees((prev) => prev.filter((e) => e.id !== record.id));
              } catch (e) {
                message.error(e instanceof Error ? e.message : 'Не удалось удалить сотрудника');
              }
            }}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  const schedulesWithNames = useMemo(
    () =>
      schedules.map((s) => {
        const emp = employees.find((e) => e.id === s.employeeId);
        return {
          ...s,
          employeeName: emp?.name ?? '—',
          dateObj: dayjs(s.date),
        };
      }),
    [schedules, employees]
  );

  const schColumns: ColumnsType<(typeof schedulesWithNames)[number]> = [
    { title: 'Сотрудник', dataIndex: 'employeeName', key: 'employeeName' },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY'),
    },
    { title: 'Начало', dataIndex: 'startTime', key: 'startTime' },
    { title: 'Окончание', dataIndex: 'endTime', key: 'endTime' },
    { title: 'Комментарий', dataIndex: 'notes', key: 'notes' },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setEditingSch(record);
              schForm.setFieldsValue({
                employeeId: record.employeeId,
                date: dayjs(record.date),
                startTime: record.startTime ? dayjs(record.startTime, 'HH:mm') : null,
                endTime: record.endTime ? dayjs(record.endTime, 'HH:mm') : null,
                notes: record.notes ?? '',
              });
              setSchModalOpen(true);
            }}
          >
            Изменить
          </Button>
          <Button
            size="small"
            danger
            onClick={async () => {
              if (!auth) return;
              try {
                await deleteSchedule(auth.token, record.id);
                setSchedules((prev) => prev.filter((s) => s.id !== record.id));
              } catch (e) {
                message.error(e instanceof Error ? e.message : 'Не удалось удалить смену');
              }
            }}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  if (!auth) return null;

  return (
    <div style={{ width: '100%', maxWidth: '100%', paddingBottom: 24 }}>
      <Card
        style={{ marginBottom: 16 }}
      >
        <Title level={4} style={{ marginBottom: 4 }}>
          Сотрудники и график
        </Title>
        <Text type="secondary">
          Управляйте структурой компании, сотрудниками и их сменами. Эти данные используются для HR‑отчётности и планирования.
        </Text>
      </Card>

      <Tabs
        defaultActiveKey="employees"
        items={[
          {
            key: 'structure',
            label: 'Подразделения и должности',
            children: (
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="large"
              >
                <Card
                  title="Подразделения"
                  extra={
                    <Button
                      type="primary"
                      onClick={() => {
                        setEditingDept(null);
                        deptForm.resetFields();
                        setDeptModalOpen(true);
                      }}
                    >
                      Добавить подразделение
                    </Button>
                  }
                >
                  <Table<Department>
                    size="small"
                    rowKey="id"
                    loading={loading}
                    columns={deptColumns}
                    dataSource={departments}
                  />
                </Card>

                <Card
                  title="Должности"
                  extra={
                    <Button
                      type="primary"
                      onClick={() => {
                        setEditingPos(null);
                        posForm.resetFields();
                        setPosModalOpen(true);
                      }}
                    >
                      Добавить должность
                    </Button>
                  }
                >
                  <Table<Position>
                    size="small"
                    rowKey="id"
                    loading={loading}
                    columns={posColumns}
                    dataSource={positions}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'employees',
            label: 'Сотрудники',
            children: (
              <Card
                title="Сотрудники"
                extra={
                  <Button
                    type="primary"
                    onClick={() => {
                      setEditingEmp(null);
                      empForm.resetFields();
                      setEmpModalOpen(true);
                    }}
                  >
                    Добавить сотрудника
                  </Button>
                }
              >
                <Table
                  size="small"
                  rowKey="id"
                  loading={loading}
                  columns={empColumns}
                  dataSource={employeesWithNames}
                />
              </Card>
            ),
          },
          {
            key: 'schedule',
            label: 'График смен',
            children: (
              <Card
                title="График смен"
                extra={
                  <Button
                    type="primary"
                    onClick={() => {
                      setEditingSch(null);
                      schForm.resetFields();
                      setSchModalOpen(true);
                    }}
                  >
                    Добавить смену
                  </Button>
                }
              >
                <Table
                  size="small"
                  rowKey="id"
                  loading={loading}
                  columns={schColumns}
                  dataSource={schedulesWithNames}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingDept ? 'Редактирование подразделения' : 'Новое подразделение'}
        open={deptModalOpen}
        onCancel={() => setDeptModalOpen(false)}
        onOk={async () => {
          if (!auth) return;
          try {
            const values = await deptForm.validateFields();
            if (editingDept) {
              const updated = await updateDepartment(auth.token, editingDept.id, values.name);
              setDepartments((prev) =>
                prev.map((d) => (d.id === editingDept.id ? (updated as Department) : d))
              );
            } else {
              const created = await createDepartment(auth.token, values.name);
              setDepartments((prev) => [...prev, created as Department]);
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
        </Form>
      </Modal>

      <Modal
        title={editingPos ? 'Редактирование должности' : 'Новая должность'}
        open={posModalOpen}
        onCancel={() => setPosModalOpen(false)}
        onOk={async () => {
          if (!auth) return;
          try {
            const values = await posForm.validateFields();
            if (editingPos) {
              const updated = await updatePosition(auth.token, editingPos.id, values.name);
              setPositions((prev) =>
                prev.map((p) => (p.id === editingPos.id ? (updated as Position) : p))
              );
            } else {
              const created = await createPosition(auth.token, values.name);
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
        </Form>
      </Modal>

      <Modal
        title={editingEmp ? 'Редактирование сотрудника' : 'Новый сотрудник'}
        open={empModalOpen}
        onCancel={() => setEmpModalOpen(false)}
        onOk={async () => {
          if (!auth) return;
          try {
            const values = await empForm.validateFields();
            if (editingEmp) {
              const updated = await updateEmployee(auth.token, editingEmp.id, values);
              setEmployees((prev) =>
                prev.map((e) => (e.id === editingEmp.id ? (updated as Employee) : e))
              );
            } else {
              const created = await createEmployee(auth.token, values);
              setEmployees((prev) => [...prev, created as Employee]);
            }
            setEmpModalOpen(false);
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Не удалось сохранить сотрудника');
          }
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={empForm} layout="vertical">
          <Form.Item
            name="name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
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

      <Modal
        title={editingSch ? 'Редактирование смены' : 'Новая смена'}
        open={schModalOpen}
        onCancel={() => setSchModalOpen(false)}
        onOk={async () => {
          if (!auth) return;
          try {
            const values = await schForm.validateFields();
            const payload = {
              employeeId: values.employeeId,
              date: (values.date as dayjs.Dayjs).format('YYYY-MM-DD'),
              startTime: values.startTime ? (values.startTime as dayjs.Dayjs).format('HH:mm') : undefined,
              endTime: values.endTime ? (values.endTime as dayjs.Dayjs).format('HH:mm') : undefined,
              notes: values.notes?.trim() || undefined,
            };
            if (editingSch) {
              const updated = await updateSchedule(auth.token, editingSch.id, payload);
              setSchedules((prev) =>
                prev.map((s) => (s.id === editingSch.id ? (updated as Schedule) : s))
              );
            } else {
              const created = await createSchedule(auth.token, payload);
              setSchedules((prev) => [...prev, created as Schedule]);
            }
            setSchModalOpen(false);
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Не удалось сохранить смену');
          }
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={schForm} layout="vertical">
          <Form.Item
            name="employeeId"
            label="Сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
          >
            <Select options={employeeOptions} />
          </Form.Item>
          <Form.Item
            name="date"
            label="Дата"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="startTime" label="Начало смены">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endTime" label="Окончание смены">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

