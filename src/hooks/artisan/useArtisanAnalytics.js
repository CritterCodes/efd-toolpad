'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useArtisanAnalytics() {
    const { data: session } = useSession();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30days');
    const [selectedMetric, setSelectedMetric] = useState('products');

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchAnalytics();
    }, [session, timeRange]);

    async function fetchAnalytics() {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/artisan/analytics?userId=${session.user.id}&range=${timeRange}`);
            if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
            const data = await res.json();
            setAnalytics(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    return { session, analytics, loading, error, timeRange, setTimeRange, selectedMetric, setSelectedMetric, fetchAnalytics };
}
