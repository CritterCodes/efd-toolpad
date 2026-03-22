
import React from 'react';
import { useRepairDetail } from '@/hooks/repairs/useRepairDetail';
import StatusTimeline from './components/StatusTimeline';
import DetailCard from './components/DetailCard';

export default function RepairDetailPage() {
    const { detail } = useRepairDetail();
    return (
        <div>
            <StatusTimeline detail={detail} />
            <DetailCard detail={detail} />
        </div>
    );
}
