export const ROLE_OPTIONS = [
  { label: 'Владелец', value: 'owner' },
  { label: 'Администратор', value: 'admin' },
  { label: 'Сотрудник', value: 'staff' },
] as const;

export const SCHEDULE_ACCESS_OPTIONS = [
  { label: 'Нет доступа', value: 'none' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Работник', value: 'worker' },
] as const;
