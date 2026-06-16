import { redirect } from 'next/navigation';

/**
 * The unified bench now lives at /dashboard/repairs/my-bench (it IS "My Bench").
 * This stub keeps any lingering /dashboard/bench links working.
 */
export default function BenchRedirect() {
  redirect('/dashboard/repairs/my-bench');
}
