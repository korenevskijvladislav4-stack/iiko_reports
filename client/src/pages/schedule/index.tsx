import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  DatePicker,
  Select,
  Space,
  Typography,
  Modal,
  TimePicker,
  Input,
  Tag,
  Dropdown,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { ApartmentOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import {
  useGetUsersQuery,
  useGetDepartmentsQuery,
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} from '../../api/rtkApi';
import type { Department, User, Schedule, MatrixRow } from './types';
import { enumerateDates, hoursBetween } from './utils';

const { Title, Text } = Typography;

export default function SchedulePage() {
  const { auth } = useAuth();
  const canEditSchedule =
    auth?.user?.role === 'owner' ||
    auth?.user?.role === 'admin' ||
    auth?.user?.scheduleAccessRole === 'manager';
  const [filterForm] = Form.useForm();
  const watchedPeriod = Form.useWatch('period', filterForm) as [Dayjs, Dayjs] | undefined;
  const watchedDepartmentId = Form.useWatch('departmentId', filterForm) as string | undefined;

  const scheduleQueryParams = useMemo(() => {
    if (!watchedPeriod || watchedPeriod.length !== 2) return null;
    return {
      from: watchedPeriod[0].format('YYYY-MM-DD'),
      to: watchedPeriod[1].format('YYYY-MM-DD'),
      departmentId: watchedDepartmentId || undefined,
    };
  }, [watchedPeriod, watchedDepartmentId]);

  const { data: usersData } = useGetUsersQuery(
    { includeInSchedule: true, departmentId: watchedDepartmentId || undefined },
    { skip: !auth }
  );
  const { data: departmentsData } = useGetDepartmentsQuery(undefined, { skip: !auth });
  const { data: schedulesData, isLoading, isFetching } = useGetSchedulesQuery(scheduleQueryParams!, {
    skip: !auth || !scheduleQueryParams,
  });
  const [createSchedule, { isLoading: isCreating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: isUpdating }] = useUpdateScheduleMutation();
  const [deleteSchedule, { isLoading: isDeleting }] = useDeleteScheduleMutation();

  const scheduleUsers: User[] = Array.isArray(usersData)
    ? (usersData as User[]).filter((u) => u.includeInSchedule)
    : [];
  const departments: Department[] = Array.isArray(departmentsData) ? (departmentsData as Department[]) : [];
  const schedules: Schedule[] = Array.isArray(schedulesData) ? (schedulesData as Schedule[]) : [];

  const departmentsSorted = useMemo(
    () => [...departments].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    [departments]
  );
  const usersByDepartment = useMemo(() => {
    const map = new Map<string, User[]>();
    const noDept: User[] = [];
    for (const u of scheduleUsers) {
      const deptId = u.departmentId ?? u.department?.id ?? null;
      if (!deptId) noDept.push(u);
      else {
        const list = map.get(deptId) ?? [];
        list.push(u);
        map.set(deptId, list);
      }
    }
    const byPositionPriority = (a: User, b: User) => {
      const pa = a.position?.priority ?? 999;
      const pb = b.position?.priority ?? 999;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    };
    for (const list of map.values()) list.sort(byPositionPriority);
    noDept.sort(byPositionPriority);
    return { map, noDept };
  }, [scheduleUsers]);

  const [schModalOpen, setSchModalOpen] = useState(false);
  const [editingSch, setEditingSch] = useState<Schedule | null>(null);
  const [schForm] = Form.useForm();
  const [editMode, setEditMode] = useState(false);
  const [editStart, setEditStart] = useState<Dayjs | null>(null);
  const [editEnd, setEditEnd] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (!auth) return;
    const from = dayjs().startOf('week');
    const to = from.add(6, 'day');
    filterForm.setFieldsValue({ period: [from, to], departmentId: undefined });
  }, [auth, filterForm]);

  const matrixRows: MatrixRow[] = useMemo(() => {
    const period = filterForm.getFieldValue('period') as [Dayjs, Dayjs] | undefined;
    if (!period || period.length !== 2) return [];
    const [from, to] = period;
    const days = enumerateDates(from, to);
    const byUser: Record<string, Schedule[]> = {};
    for (const s of schedules) {
      if (!byUser[s.userId]) byUser[s.userId] = [];
      byUser[s.userId].push(s);
    }
    const rows: MatrixRow[] = [];
    const addUserRow = (u: User) => {
      const schList = byUser[u.id] ?? [];
      const row: MatrixRow = {
        key: u.id,
        userId: u.id,
        userName: u.name,
        departmentName: u.department?.name,
        departmentId: u.departmentId ?? u.department?.id,
        departmentPriority: u.department?.priority ?? 999,
      };
      for (const d of days) {
        const dateKey = d.format('YYYY-MM-DD');
        const totalHours = schList
          .filter((s) => dayjs(s.date).isSame(d, 'day'))
          .reduce((sum, s) => sum + hoursBetween(s.startTime, s.endTime), 0);
        row[dateKey] = totalHours > 0 ? totalHours.toFixed(1).replace(/\.0$/, '') : '';
      }
      rows.push(row);
    };
    for (const dept of departmentsSorted) {
      const users = usersByDepartment.map.get(dept.id);
      if (!users?.length) continue;
      rows.push({
        key: `dept-${dept.id}`,
        isGroup: true,
        departmentName: dept.name,
        departmentId: dept.id,
        departmentPriority: dept.priority ?? 0,
      });
      for (const u of users) addUserRow(u);
    }
    if (usersByDepartment.noDept.length > 0) {
      rows.push({
        key: 'dept-none',
        isGroup: true,
        departmentName: 'Без подразделения',
        departmentId: '',
        departmentPriority: 9999,
      });
      for (const u of usersByDepartment.noDept) addUserRow(u);
    }
    return rows;
  }, [scheduleUsers, schedules, departmentsSorted, usersByDepartment, filterForm.getFieldValue('period')]);

  const assignShift = async (userId: string, date: Dayjs) => {
    if (!auth) return;
    if (!editStart || !editEnd) {
      message.warning('Сначала задайте время начала и окончания смены выше.');
      return;
    }
    const existing = schedules.find((s) => s.userId === userId && dayjs(s.date).isSame(date, 'day'));
    const payload = {
      userId,
      date: date.format('YYYY-MM-DD'),
      startTime: editStart.format('HH:mm'),
      endTime: editEnd.format('HH:mm'),
      notes: 'Назначено из таблицы',
    };
    try {
      if (existing) await updateSchedule({ id: existing.id, payload }).unwrap();
      else await createSchedule(payload).unwrap();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Не удалось назначить смену');
    }
  };

  const handleCellClick = (userId: string, dateKey: string) => {
    if (!auth) return;
    const date = dayjs(dateKey, 'YYYY-MM-DD');
    const existing = schedules.find((s) => s.userId === userId && dayjs(s.date).isSame(date, 'day'));
    if (existing) {
      setEditingSch(existing);
      schForm.setFieldsValue({
        userId: existing.userId,
        date,
        startTime: existing.startTime ? dayjs(existing.startTime, 'HH:mm') : null,
        endTime: existing.endTime ? dayjs(existing.endTime, 'HH:mm') : null,
        notes: existing.notes ?? '',
      });
    } else {
      setEditingSch(null);
      schForm.setFieldsValue({ userId, date, startTime: null, endTime: null, notes: '' });
    }
    setSchModalOpen(true);
  };

  const columns: ColumnsType<MatrixRow> = useMemo(() => {
    const base: ColumnsType<MatrixRow> = [
      {
        title: 'Подразделение / Сотрудник',
        dataIndex: 'userName',
        key: 'userName',
        fixed: 'left',
        width: 240,
        render: (_val: string | undefined, record: MatrixRow) => {
          if (record.isGroup) {
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--premium-text)',
                  background: 'linear-gradient(90deg, rgba(56,189,248,0.15) 0%, transparent 100%)',
                  margin: '-8px -12px',
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderRadius: 6,
                  borderLeft: '3px solid rgba(56,189,248,0.6)',
                }}
              >
                <ApartmentOutlined style={{ color: 'rgba(56,189,248,0.9)', fontSize: 16 }} />
                {record.departmentName}
              </div>
            );
          }
          return <span style={{ paddingLeft: 28, color: 'var(--premium-text)' }}>{record.userName}</span>;
        },
      },
    ];
    const period = filterForm.getFieldValue('period') as [Dayjs, Dayjs] | undefined;
    if (!period || period.length !== 2) return base;
    const [from, to] = period;
    const days = enumerateDates(from, to);
    const dayCols: ColumnsType<MatrixRow> = days.map((d) => {
      const key = d.format('YYYY-MM-DD');
      const isWeekend = d.day() === 0 || d.day() === 6;
      return {
        title: d.format('DD.MM'),
        dataIndex: key,
        key,
        align: 'center' as const,
        width: 80,
        onHeaderCell: () =>
          isWeekend
            ? { className: 'schedule-col-weekend', style: { background: 'rgba(100, 116, 139, 0.5)', color: 'var(--premium-muted)' } }
            : {},
        render: (value: string | number | undefined, record: MatrixRow) => {
          if (record.isGroup || !record.userId) {
            return <span style={{ color: 'var(--premium-muted)', fontSize: 11 }}>—</span>;
          }
          const userId = record.userId;
          const schedule = schedules.find((s) => s.userId === userId && dayjs(s.date).isSame(d, 'day'));
          const hasSchedule = !!schedule;
          const display = value !== '' && value !== undefined ? value : '';
          const templateLabel = editStart && editEnd ? `${editStart.format('HH:mm')}–${editEnd.format('HH:mm')}` : undefined;
          if (editMode && canEditSchedule) {
            return (
              <Tag
                color={hasSchedule ? 'blue' : 'green'}
                style={{
                  minWidth: 40,
                  textAlign: 'center',
                  cursor: editStart && editEnd ? 'pointer' : 'default',
                  opacity: editStart && editEnd ? 1 : 0.6,
                }}
                title={schedule ? `${schedule.startTime ?? ''}–${schedule.endTime ?? ''}` : templateLabel}
                onClick={() => editStart && editEnd && void assignShift(userId, d)}
              >
                {display || (hasSchedule ? '' : '+')}
              </Tag>
            );
          }
          if (!canEditSchedule) {
            return (
              <Tag color={hasSchedule ? 'blue' : 'default'} style={{ minWidth: 40, textAlign: 'center' }}>
                {display || (hasSchedule ? '' : '')}
              </Tag>
            );
          }
          const items: MenuProps['items'] = hasSchedule
            ? [
                { key: 'edit', label: 'Изменить смену' },
                { key: 'delete', label: 'Удалить смену' },
              ]
            : [{ key: 'add', label: 'Добавить смену' }];
          const menu: MenuProps = {
            items,
            onClick: async ({ key: action }) => {
              if (!auth) return;
              if (action === 'delete' && schedule) {
                try {
                  await deleteSchedule(schedule.id).unwrap();
                } catch (e) {
                  message.error(e instanceof Error ? e.message : 'Не удалось удалить смену');
                }
                return;
              }
              handleCellClick(userId, key);
            },
          };
          return (
            <Dropdown menu={menu} trigger={['click']}>
              <Tag color={hasSchedule ? 'blue' : 'default'} style={{ minWidth: 40, textAlign: 'center', cursor: 'pointer' }}>
                {display || (hasSchedule ? '' : '+')}
              </Tag>
            </Dropdown>
          );
        },
      };
    });
    return [...base, ...dayCols];
  }, [filterForm.getFieldValue('period'), schedules, editMode, editStart, editEnd, canEditSchedule]);

  if (!auth) return null;

  return (
    <div style={{ width: '100%', maxWidth: '100%', paddingBottom: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              График смен
            </Title>
            <Text type="secondary">
              Матрица «сотрудники × даты» с количеством часов за день. Отображаются только пользователи с флагом «Добавить в график». Есть обычное редактирование через меню по клику и быстрый режим массового назначения смен.
            </Text>
          </div>
          {editMode && (
            <Tag color="processing" style={{ borderRadius: 999, fontWeight: 500 }}>
              Режим назначения включён
            </Tag>
          )}
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ paddingBottom: 8 }}>
        <Form layout="inline" form={filterForm}>
          <Form.Item name="period" label="Период" rules={[{ required: true, message: 'Выберите период' }]}>
            <DatePicker.RangePicker format="DD.MM.YYYY" allowClear={false} />
          </Form.Item>
          <Form.Item name="departmentId" label="Подразделение">
            <Select
              allowClear
              style={{ minWidth: 200 }}
              options={[
                ...departmentsSorted.map((d) => ({ label: d.name, value: d.id })),
                ...(usersByDepartment.noDept.length > 0 ? [{ label: 'Без подразделения', value: '__none__' }] : []),
              ]}
              placeholder="Все подразделения"
            />
          </Form.Item>
          <Form.Item>
            <Button
              onClick={() => {
                const from = dayjs().startOf('week');
                const to = from.add(6, 'day');
                filterForm.setFieldsValue({ period: [from, to] });
              }}
            >
              Текущая неделя
            </Button>
          </Form.Item>
          {canEditSchedule && (
            <Form.Item>
              <Space align="baseline">
                <Button
                  type={editMode ? 'primary' : 'default'}
                  onClick={() => {
                    setEditMode((v) => {
                      const next = !v;
                      if (next && (!editStart || !editEnd)) {
                        const start = dayjs().hour(9).minute(0);
                        const end = dayjs().hour(18).minute(0);
                        setEditStart(start);
                        setEditEnd(end);
                        message.info('По умолчанию установлен шаблон 09:00–18:00. Вы можете изменить его ниже.');
                      }
                      return next;
                    });
                  }}
                >
                  {editMode ? 'Режим назначения: ВКЛ' : 'Режим назначения смен'}
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {editMode
                    ? 'Клик по ячейке сразу создаёт или обновляет смену по шаблону.'
                    : 'Включите режим, чтобы быстро проставлять смены по шаблону.'}
                </Text>
              </Space>
            </Form.Item>
          )}
          {editMode && canEditSchedule && (
            <Form.Item style={{ marginBottom: 0 }}>
              <Card
                size="small"
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.8))',
                  border: '1px solid rgba(56,189,248,0.5)',
                  boxShadow: '0 6px 20px rgba(8,47,73,0.4)',
                  color: '#e5e7eb',
                }}
                bodyStyle={{ padding: 10 }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#bae6fd' }}>
                    Шаблон смены для режима назначения
                  </Text>
                  <Space align="center">
                    <TimePicker format="HH:mm" value={editStart} onChange={(v) => setEditStart(v)} style={{ width: 90 }} />
                    <span style={{ color: '#9ca3af' }}>–</span>
                    <TimePicker format="HH:mm" value={editEnd} onChange={(v) => setEditEnd(v)} style={{ width: 90 }} />
                    {editStart && editEnd && (
                      <Tag color="cyan" style={{ borderRadius: 999, marginLeft: 8 }}>
                        {editStart.format('HH:mm')}–{editEnd.format('HH:mm')}
                      </Tag>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {editStart && editEnd
                      ? 'Клик по любой ячейке назначит смену по этому шаблону для выбранного сотрудника и дня.'
                      : 'Выберите время начала и окончания — после этого кликайте по ячейкам, чтобы проставлять смены.'}
                  </Text>
                </Space>
              </Card>
            </Form.Item>
          )}
        </Form>
      </Card>

      <Table<MatrixRow>
        size="small"
        rowKey="key"
        loading={isLoading || isFetching || isCreating || isUpdating || isDeleting}
        columns={columns}
        dataSource={matrixRows}
        scroll={{ x: 'max-content' }}
        rowClassName={(record) => (record.isGroup ? 'schedule-group-row' : '')}
        className="schedule-table"
      />

      <Modal
        title={editingSch ? 'Редактирование смены' : 'Новая смена'}
        open={schModalOpen}
        onCancel={() => setSchModalOpen(false)}
        footer={[
          editingSch && (
            <Button
              key="delete"
              danger
              onClick={async () => {
                if (!auth || !editingSch) return;
                try {
                  await deleteSchedule(editingSch.id).unwrap();
                  setSchModalOpen(false);
                } catch (e) {
                  message.error(e instanceof Error ? e.message : 'Не удалось удалить смену');
                }
              }}
            >
              Удалить
            </Button>
          ),
          <Button key="cancel" onClick={() => setSchModalOpen(false)}>
            Отмена
          </Button>,
          canEditSchedule && (
            <Button
              key="ok"
              type="primary"
              onClick={async () => {
                if (!auth) return;
                try {
                  const values = await schForm.validateFields();
                  const payload = {
                    userId: values.userId,
                    date: (values.date as Dayjs).format('YYYY-MM-DD'),
                    startTime: values.startTime ? (values.startTime as Dayjs).format('HH:mm') : undefined,
                    endTime: values.endTime ? (values.endTime as Dayjs).format('HH:mm') : undefined,
                    notes: values.notes?.trim() || undefined,
                  };
                  if (editingSch) await updateSchedule({ id: editingSch.id, payload }).unwrap();
                  else await createSchedule(payload).unwrap();
                  setSchModalOpen(false);
                } catch (e) {
                  message.error(e instanceof Error ? e.message : 'Не удалось сохранить смену');
                }
              }}
            >
              Сохранить
            </Button>
          ),
        ]}
      >
        <Form form={schForm} layout="vertical">
          <Form.Item name="userId" label="Сотрудник" rules={[{ required: true, message: 'Выберите сотрудника' }]}>
            <Select options={scheduleUsers.map((u) => ({ label: u.name, value: u.id }))} />
          </Form.Item>
          <Form.Item name="date" label="Дата" rules={[{ required: true, message: 'Выберите дату' }]}>
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
