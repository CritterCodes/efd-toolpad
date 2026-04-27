import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export const useMyRepairs = () => {
  const { data: session } = useSession();
  
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchMyRepairs = useCallback(async (status = null) => {
    try {
      setLoading(true);
      const url = status ? `/api/repairs/my-repairs?status=${status}` : '/api/repairs/my-repairs';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRepairs(data.repairs || []);
      } else {
        setError('Failed to fetch repairs');
      }
    } catch (err) {
      console.error('Error fetching repairs:', err);
      setError('An error occurred while fetching repairs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchMyRepairs();
    }
  }, [session?.user, fetchMyRepairs]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const statusFilters = [null, 'current', 'completed']; // All, Current, Completed
    fetchMyRepairs(statusFilters[newValue]);
  };

  const getFilteredRepairs = useCallback(() => {
    if (activeTab === 0) return repairs; // All repairs
    if (activeTab === 1) { // Current repairs
      return repairs.filter(repair => 
        !['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP', 'CANCELLED', 'cancelled'].includes(repair.status)
      );
    }
    if (activeTab === 2) { // Completed repairs
      return repairs.filter(repair => 
        ['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP'].includes(repair.status)
      );
    }
    return repairs;
  }, [activeTab, repairs]);

  const getCurrentRepairsCount = useCallback(() => {
    return repairs.filter(repair => 
      !['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP', 'CANCELLED', 'cancelled'].includes(repair.status)
    ).length;
  }, [repairs]);

  const getCompletedRepairsCount = useCallback(() => {
    return repairs.filter(repair => 
      ['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP'].includes(repair.status)
    ).length;
  }, [repairs]);

  return {
    repairs,
    loading,
    error,
    activeTab,
    handleTabChange,
    getFilteredRepairs,
    getCurrentRepairsCount,
    getCompletedRepairsCount
  };
};