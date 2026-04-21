import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export const useWholesalerDashboard = () => {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [stats, setStats] = useState({
        activeRepairs: 0,
        pendingApproval: 0,
        completedThisMonth: 0,
        totalSpentThisMonth: 0,
        averageTurnaroundTime: '0 days'
    });
    const [recentRepairs, setRecentRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboardData = useCallback(async () => {
        if (!session?.user?.userID) return;

        try {
            setLoading(true);
            setError(null);

            // Build query params
            const params = new URLSearchParams();
            if (session.user.role === 'wholesaler') {
                params.append('clientId', session.user.userID);
            }
            
            // Use standard API endpoints instead of dashboard-specific ones
            const [repairsRes, statsRes] = await Promise.all([
                fetch(`/api/repairs?${params.toString()}&limit=5&sort=updatedAt:desc`),
                fetch(`/api/repairs/stats?${params.toString()}`)
            ]);
            
            if (repairsRes.ok) {
                const repairsData = await repairsRes.json();
                setRecentRepairs(repairsData.repairs || []);
            }
            
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                if (statsData.success && statsData.data) {
                    setStats({
                        ...stats,
                        ...statsData.data
                    });
                }
            }
        } catch (err) {
            console.error('Error loading wholesaler dashboard:', err);
            setError('Failed to load dashboard data. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, session?.user?.role]);

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
