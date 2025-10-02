"use client";
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Pagination, 
  Breadcrumbs, 
  Link, 
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Code as DeveloperIcon,
  Storefront as WholesalerIcon,
  Palette as ArtisanIcon,
  Group as ClientIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const UserManagement = ({ 
  userRole, 
  title, 
  description, 
  createButtonText = "Add User",
  showCreateButton = true 
}) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;
  const router = useRouter();

  const fetchUsers = React.useCallback(async () => {
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

  const getUserIcon = (role) => {
    switch (role) {
      case 'admin':
        return <AdminIcon color="error" />;
      case 'developer':
        return <DeveloperIcon color="info" />;
      case 'wholesaler':
        return <WholesalerIcon color="warning" />;
      case 'artisan':
        return <ArtisanIcon color="secondary" />;
      case 'client':
        return <ClientIcon color="primary" />;
      default:
        return <PersonIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link href="/dashboard" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">{title}</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Box>
          
          {showCreateButton && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {/* TODO: Implement create user modal */}}
            >
              {createButtonText}
            </Button>
          )}
        </Box>
      </Box>

      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            value={sortOrder}
            label="Sort"
            onChange={(e) => handleSort(e.target.value)}
          >
            <MenuItem value="asc">A-Z</MenuItem>
            <MenuItem value="desc">Z-A</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
        </Typography>
      </Box>

      {/* Users Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>Loading {title.toLowerCase()}...</Typography>
        </Box>
      ) : paginatedUsers.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            {getUserIcon(userRole)}
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              No {title.toLowerCase()} found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search criteria' : `No ${title.toLowerCase()} have been added yet`}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {paginatedUsers.map((user) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={user.userID || user._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {getUserIcon(user.role)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" noWrap>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Chip 
                        label={user.status || 'Active'} 
                        size="small" 
                        color={getStatusColor(user.status)}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" noWrap>
                        {user.email}
                      </Typography>
                    </Box>
                    
                    {user.phoneNumber && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" noWrap>
                          {user.phoneNumber}
                        </Typography>
                      </Box>
                    )}
                    
                    {user.business && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" noWrap>
                          {user.business}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Tooltip title="Edit User">
                      <IconButton 
                        size="small"
                        onClick={() => {/* TODO: Implement edit */}}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => {/* TODO: Implement delete */}}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Box>
  );
};

export default UserManagement;