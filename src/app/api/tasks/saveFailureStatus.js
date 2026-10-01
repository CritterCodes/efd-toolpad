/**
 * The HTTP status for a task save the service refused (EFD-DEFECTS P20). The controller used to wrap a
 * failed save in `{ success: true }` with HTTP 200, so the editor said "Task updated" on a duplicate
 * title and nothing had changed.
 */
export function saveFailureStatus(message = '') {
  const m = String(message).toLowerCase();
  if (m.includes('already exists')) return 409;
  if (m.includes('not found')) return 404;
  if (m.includes('required') || m.includes('must be')) return 400;
  return 500;
}
