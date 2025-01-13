"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import QCStepper from '@/app/components/repairs/quality-control/stepper';

const QualityControlDetailPage = () => {
    const { repairID } = useParams();
    const { repairs } = useRepairs();

    // ✅ Find the specific repair
    const repair = repairs.find(r => r.repairID === repairID);

    if (!repair) {
        return <p>Repair not found.</p>;
    }

    return (
        <div>
            <QCStepper repair={repair} />
        </div>
    );
};

export default QualityControlDetailPage;
