"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import QCStepper from '@/app/components/repairs/quality-control/stepper';

const QualityControlDetailPage = () => {
    const { repairID } = useParams();
    const { repairs } = useRepairs();

    // ✅ Find the current repair
    const repair = repairs.find(r => r.repairID === repairID);

    // ✅ Get all repairs currently in QC
    const qcRepairs = repairs.filter(r => r.status === "QUALITY CONTROL");

    if (!repair) {
        return <p>Repair not found.</p>;
    }

    return (
        <div>
            {/* ✅ Pass all repairs in QC to the stepper */}
            <QCStepper repair={repair} qcRepairs={qcRepairs} />
        </div>
    );
};

export default QualityControlDetailPage;
