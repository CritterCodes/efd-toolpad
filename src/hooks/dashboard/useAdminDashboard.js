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

        const pendingReceipts = repairs.filter(r => r.status === 'RECEIVING');
        const inProgress = repairs.filter(r => r.status === 'IN PROGRESS');
        const completed = repairs.filter(r => ['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP'].includes(r.status));
        const qcRequired = repairs.filter(r => ['QC', 'QUALITY CONTROL', 'quality-control'].includes(r.status));
        const readyForPickup = repairs.filter(r => ['READY FOR PICKUP', 'READY FOR PICK-UP'].includes(r.status));
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
