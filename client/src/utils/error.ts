/**
 * Извлекает сообщение об ошибке из RTK Query / fetch / unknown.
 * Учитывает SerializedError (status, data) и стандартный Error.
 */
export function getErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  if (error == null) return fallback;
  // RTK Query SerializedError
  if (typeof error === 'object' && 'data' in error) {
    const d = (error as { data?: unknown }).data;
    if (d && typeof d === 'object' && 'message' in (d as object))
      return String((d as { message: unknown }).message);
    if (typeof d === 'string') return d;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
