'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

export const useAdminDashboard = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { repairs, loading } = useRepairs();
    
    // Calculate dashboard metrics
    const dashboardMetrics = useMemo(() => {
        if (!repairs || loading) {
            return {
                totalRepairs: 0,
                pendingReceipts: [],
                inProgress: [],
                completed: [],
                qcRequired: [],
                readyForPickup: [],
                rushJobs: [],
                averageValue: 0,
                monthlyRevenue: 0
            };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const pendingReceipts = repairs.filter(r => r.status === 'pending-receipt' || r.status === 'received');
        const inProgress = repairs.filter(r => r.status === 'in-progress' || r.status === 'repair-started');
        const completed = repairs.filter(r => r.status === 'completed' || r.status === 'picked-up');
        const qcRequired = repairs.filter(r => r.status === 'quality-control' || r.status === 'qc-review');
        const readyForPickup = repairs.filter(r => r.status === 'ready-for-pickup' || r.status === 'payment-pending');
        const rushJobs = repairs.filter(r => r.rushJob === true || r.priority === 'rush');

        // Calculate revenue for current month
        const monthlyRevenue = completed
            .filter(r => {
                const completedDate = new Date(r.completedDate || r.updatedAt);
                return completedDate.getMonth() === currentMonth && 
                       completedDate.getFullYear() === currentYear;
            })
            .reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);

        const averageValue = completed.length > 0 
            ? completed.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0) / completed.length
            : 0;

        return {
            totalRepairs: repairs.length,
            pendingReceipts,
            inProgress,
            completed,
            qcRequired,
            readyForPickup,
            rushJobs,
            averageValue,
            monthlyRevenue
        };
    }, [repairs, loading]);

    // Get recent activity
    const recentActivity = useMemo(() => {
        if (!repairs || loading) return [];
        
        return repairs
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5)
            .map(repair => ({
                id: repair.repairID || repair._id,
                customerName: repair.customerName || 'Unknown Customer',
                status: repair.status,
                updatedAt: repair.updatedAt,
                type: repair.repairType || 'General Repair'
            }));
    }, [repairs, loading]);

    return {
        session,
        router,
        loading,
        dashboardMetrics,
        recentActivity
    };
};
