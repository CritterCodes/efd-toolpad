import { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';

export default function useCadDesign() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [users, setUsers] = useState({});

  useEffect(() => {
    fetchRequests();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users/designers');
      const userMap = {};
      response.data?.users?.forEach((user) => {
        userMap[user._id] = user.name;
      });
      setUsers(userMap);
    } catch (err) {
      // best-effort lookup only
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/cad-requests');
      const data = response.data?.data || [];
      setRequests(data);
      setFilteredRequests(data);
    } catch (err) {
      setError(err?.message || 'Failed to load CAD requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...requests];
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter((r) => r.priority === priorityFilter);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.title?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (sortDirection === 'desc') return valA < valB ? 1 : -1;
      return valA > valB ? 1 : -1;
    });

    setFilteredRequests(result);
  }, [requests, statusFilter, priorityFilter, searchQuery, sortField, sortDirection]);

  return {
    requests: filteredRequests,
    loading,
    error,
    users,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    refresh: fetchRequests
  };
}
