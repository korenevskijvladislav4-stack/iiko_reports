/**
 * Парсинг XML-ответа OLAP iiko в массив строк для таблицы.
 * Ожидаемая структура: корень содержит элементы <row> или подобные с дочерними тегами (имя тега = ключ, текст = значение).
 */
export function parseOlapXmlToRows(xmlString: string): Record<string, string | number>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) return [];

  const root = doc.documentElement;
  const rowTagNames = ['row', 'r', 'record', 'item'];
  let rowElements: Element[] = [];

  for (const tag of rowTagNames) {
    rowElements = Array.from(root.getElementsByTagName(tag));
    if (rowElements.length > 0) break;
  }

  if (rowElements.length === 0) {
    const children = Array.from(root.children);
    if (children.length > 0 && children[0].children.length === 0) {
      rowElements = [root];
    } else {
      rowElements = children.filter((el) => el.children.length > 0 || el.textContent?.trim());
    }
  }

  return rowElements.map((rowEl) => {
    const obj: Record<string, string | number> = {};
    for (const child of Array.from(rowEl.children)) {
      const key = child.tagName;
      const text = (child.textContent ?? '').trim();
      const num = Number(text);
      obj[key] = text !== '' && !Number.isNaN(num) ? num : text;
    }
    return obj;
  });
}

const COLUMN_LABELS: Record<string, string> = {
  Month: 'Месяц',
  'OpenDate.Typed': 'Дата',
  Department: 'Департамент',
  department: 'Департамент',
  DepartmentName: 'Департамент',
  departmentName: 'Департамент',
  DishAmount: 'Блюд',
  dishAmount: 'Блюд',
  'Amount.Int': 'Блюд',
  'DishDiscountSumInt.withoutVAT': 'Сумма заказов',
  VoucherNum: 'Чеков',
  voucherNum: 'Чеков',
  'UniqOrderId.Int': 'Количество заказов',
  UniqOrderId: 'Количество заказов',
  uniqOrderId: 'Количество заказов',
  OrderSum: 'Сумма заказов',
  orderSum: 'Сумма заказов',
  'DishAmount.Int': 'Количество блюд',
  AvgSum: 'Средний чек',
  avgSum: 'Средний чек',
};

export function getColumnLabel(key: string): string {
  return COLUMN_LABELS[key] ?? key;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function formatMonthFromDate(dateStr: string | number | undefined): string {
  if (dateStr == null || dateStr === '') return '—';
  const s = String(dateStr);
  const match = s.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const monthIndex = parseInt(match[2], 10) - 1;
    return `${MONTH_NAMES[monthIndex] ?? match[2]} ${match[1]}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  return s;
}

export function getMonthKey(dateStr: string | number | undefined): string {
  if (dateStr == null || dateStr === '') return '';
  const s = String(dateStr);
  const match = s.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return s;
}
