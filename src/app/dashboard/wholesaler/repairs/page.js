'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WholesalerRepairsIndex() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/wholesaler/repairs/current');
    }, [router]);
    return null;
}
