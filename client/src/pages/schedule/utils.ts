import dayjs, { type Dayjs } from 'dayjs';

export function enumerateDates(from: Dayjs, to: Dayjs): Dayjs[] {
  const dates: Dayjs[] = [];
  let d = from.startOf('day');
  const end = to.startOf('day');
  for (; !d.isAfter(end); d = d.add(1, 'day')) {
    dates.push(d);
  }
  return dates;
}

export function hoursBetween(startTime?: string | null, endTime?: string | null): number {
  if (!startTime || !endTime) return 0;
  const start = dayjs(startTime, 'HH:mm');
  const end = dayjs(endTime, 'HH:mm');
  if (!start.isValid() || !end.isValid()) return 0;
  let diff = end.diff(start, 'minute') / 60;
  if (diff < 0) diff += 24;
  return diff > 0 ? diff : 0;
}
