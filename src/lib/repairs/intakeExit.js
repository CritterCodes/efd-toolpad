/**
 * Where the repair intake goes when you leave it — cancel, or "Save without printing" — and where /dashboard/repairs
 * itself lands.
 *
 * Owner, 2026-10-01: exiting a new repair "takes me back to this page and it's not a page we even use anymore. My bench
 * replaced it." Everything used to go to /dashboard/repairs/ready-for-work. The shop works from My Bench; a store from
 * its own repairs list (it can't open the bench or Ready for Work at all).
 */
export const BENCH_PATH = '/dashboard/repairs/my-bench';
export const STORE_REPAIRS_PATH = '/dashboard/repairs/my-repairs';

/** Pure: the page to leave the intake for. */
export function intakeExitPath(session) {
  return session?.user?.role === 'wholesaler' ? STORE_REPAIRS_PATH : BENCH_PATH;
}
