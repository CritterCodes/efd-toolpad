import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    isWholesaleActiveRepair,
    isWholesaleCompletedRepair,
    isWholesaleIntakeRepair,
    normalizeRepairWorkflow,
} from '@/services/repairWorkflow';

/**
 * Wholesaler landing-page data.
 *
 * Rebuilt on /api/wholesale/repairs (the ownership-scoped endpoint) with stats
 * computed client-side from the same rows the tables show. The old version hit
 * `/api/repairs?limit=5&sort=...` — parameters that endpoint never implemented,
 * against a response shape (`.repairs`) it never returned — and `/api/repairs/stats`,
 * which does not exist. Every stat card has silently shown zero since it shipped;
 * one fetch of the real data replaces both calls.
 */
export const useWholesalerDashboard = () => {
    const { data: session } = useSession();
    const router = useRouter();

    const [stats, setStats] = useState(null);
    const [recentRepairs, setRecentRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboardData = useCallback(async () => {
        if (!session?.user?.userID) return;

        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/wholesale/repairs');
            if (!res.ok) throw new Error('failed to load repairs');
            const data = await res.json();
            const repairs = (data.repairs || []).map(normalizeRepairWorkflow);

            const active = repairs.filter(isWholesaleActiveRepair);
            const intake = repairs.filter(isWholesaleIntakeRepair);
            const completed = repairs.filter(isWholesaleCompletedRepair);

            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const completedThisMonth = completed.filter((r) => {
                const done = r.completedAt || r.updatedAt;
                return done && new Date(done) >= monthStart;
            }).length;

            // Received → completed, averaged over repairs that carry both stamps.
            const turnarounds = completed
                .map((r) => {
                    const start = r.receivedAt || r.createdAt;
                    const end = r.completedAt;
                    if (!start || !end) return null;
                    const days = (new Date(end) - new Date(start)) / 86400000;
                    return days >= 0 ? days : null;
                })
                .filter((d) => d !== null);
            const avgDays = turnarounds.length
                ? Math.round(turnarounds.reduce((s, d) => s + d, 0) / turnarounds.length)
                : null;

            setStats({
                activeRepairs: active.length,
                pendingApproval: intake.length,
                completedThisMonth,
                averageTurnaroundTime: avgDays === null ? '—' : `${avgDays} day${avgDays === 1 ? '' : 's'}`,
            });

            setRecentRepairs(
                [...repairs]
                    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
                    .slice(0, 5),
            );
        } catch (err) {
            console.error('Error loading wholesaler dashboard:', err);
            setError('Failed to load dashboard data. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    }, [session?.user?.userID]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    return {
        session,
        router,
        stats,
        recentRepairs,
        loading,
        error,
        refresh: loadDashboardData
    };
};
