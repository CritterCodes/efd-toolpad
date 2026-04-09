'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

export const useRepairDetail = () => {
  const { repairID } = useParams();
  const { repairs } = useRepairs();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const normalizedRepairId = useMemo(() => String(repairID || '').trim(), [repairID]);

  useEffect(() => {
    let isMounted = true;

    const loadRepairDetail = async () => {
      if (!normalizedRepairId) {
        if (isMounted) {
          setError('Repair ID is missing');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const fromContext = (repairs || []).find(
          (repair) => String(repair?.repairID || '').trim() === normalizedRepairId
        );

        if (fromContext) {
          if (isMounted) {
            setDetail(fromContext);
            setLoading(false);
          }
          return;
        }

        const response = await fetch(`/api/repairs?repairID=${encodeURIComponent(normalizedRepairId)}`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load repair detail');
        }

        if (isMounted) {
          setDetail(data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load repair detail');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRepairDetail();
    return () => {
      isMounted = false;
    };
  }, [normalizedRepairId, repairs]);

  return { detail, loading, error };
};
