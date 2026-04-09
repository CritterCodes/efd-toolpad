import { useState, useEffect, useCallback } from 'react';

export const useUserManagementPanel = ({ userRole, rowsPerPage = 12 }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users?role=${userRole}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        console.error("Failed to fetch users:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole) {
      fetchUsers();
    }
  }, [userRole, fetchUsers]);

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = users.filter((user) =>
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.business?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
    setPage(1);
  };

  const handleSort = (order) => {
    setSortOrder(order);
    const sorted = [...filteredUsers].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    setFilteredUsers(sorted);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  return {
    users,
    filteredUsers,
    loading,
    searchQuery,
    sortOrder,
    page,
    rowsPerPage,
    paginatedUsers,
    totalPages,
    handleSearch,
    handleSort,
    handlePageChange,
    fetchUsers
  };
};