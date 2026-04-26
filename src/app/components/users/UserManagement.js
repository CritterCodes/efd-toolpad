"use client";
import React, { useState, useEffect } from 'react';
import {
  Box,
  Pagination,
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
  Tooltip,
  CircularProgress
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
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const getUserIcon = (role) => {
  switch (role) {
    case 'admin': return <AdminIcon sx={{ fontSize: 20, color: '#EF4444' }} />;
    case 'developer': return <DeveloperIcon sx={{ fontSize: 20, color: '#3B82F6' }} />;
    case 'wholesaler': return <WholesalerIcon sx={{ fontSize: 20, color: '#F59E0B' }} />;
    case 'artisan': return <ArtisanIcon sx={{ fontSize: 20, color: '#8B5CF6' }} />;
    case 'client': return <ClientIcon sx={{ fontSize: 20, color: UI.accent }} />;
    default: return <PersonIcon sx={{ fontSize: 20, color: UI.textSecondary }} />;
  }
};

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'verified':
      return { color: '#10B981', borderColor: '#10B981' };
    case 'pending':
      return { color: '#F59E0B', borderColor: '#F59E0B' };
    case 'inactive':
    case 'suspended':
      return { color: '#EF4444', borderColor: '#EF4444' };
    default:
      return { color: UI.textSecondary, borderColor: UI.border };
  }
};

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
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole) fetchUsers();
  }, [userRole, fetchUsers]);

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredUsers(users.filter((u) =>
      u.firstName?.toLowerCase().includes(query) ||
      u.lastName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.business?.toLowerCase().includes(query)
    ));
    setPage(1);
  };

  const handleSort = (order) => {
    setSortOrder(order);
    setFilteredUsers(prev =>
      [...prev].sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      })
    );
  };

  const paginatedUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  return (
    <Box sx={{ pb: 10, position: 'relative' }}>
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3
        }}
      >
        <Box sx={{ maxWidth: 920, mb: 2 }}>
          <Typography
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.5,
              mb: 1.5,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: UI.textPrimary,
              backgroundColor: UI.bgCard,
              border: `1px solid ${UI.border}`,
              borderRadius: 2,
              textTransform: 'uppercase'
            }}
          >
            {getUserIcon(userRole)}
            {title}
          </Typography>

          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
            {title}
          </Typography>
          <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
            {description}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          {showCreateButton && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {}}
              sx={{ color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
            >
              {createButtonText}
            </Button>
          )}
          <TextField
            placeholder={`Search ${title.toLowerCase()}...`}
            size="small"
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: UI.textMuted }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Sort</InputLabel>
            <Select value={sortOrder} label="Sort" onChange={(e) => handleSort(e.target.value)}>
              <MenuItem value="asc">A–Z</MenuItem>
              <MenuItem value="desc">Z–A</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" sx={{ color: UI.textMuted, ml: 'auto' }}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: UI.accent }} />
        </Box>
      ) : paginatedUsers.length === 0 ? (
        <Box
          sx={{
            backgroundColor: UI.bgPanel,
            border: `1px solid ${UI.border}`,
            borderRadius: 3,
            py: 6,
            textAlign: 'center'
          }}
        >
          {getUserIcon(userRole)}
          <Typography variant="h6" sx={{ mt: 2, mb: 1, color: UI.textHeader }}>
            No {title.toLowerCase()} found
          </Typography>
          <Typography sx={{ color: UI.textSecondary }}>
            {searchQuery ? 'Try adjusting your search criteria' : `No ${title.toLowerCase()} have been added yet`}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {paginatedUsers.map((user) => {
            const statusStyle = getStatusStyle(user.status);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={user.userID || user._id}>
                <Box
                  sx={{
                    backgroundColor: UI.bgPanel,
                    border: `1px solid ${UI.border}`,
                    borderRadius: 3,
                    boxShadow: UI.shadow,
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    transition: 'border-color 0.15s',
                    '&:hover': { borderColor: UI.accent }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: UI.bgCard,
                        border: `1px solid ${UI.border}`
                      }}
                    >
                      {getUserIcon(user.role)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: UI.textHeader, fontSize: '0.9rem' }} noWrap>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Chip
                        label={user.status || 'Active'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          backgroundColor: UI.bgCard,
                          border: `1px solid ${statusStyle.borderColor}`,
                          color: statusStyle.color
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <EmailIcon sx={{ fontSize: 13, color: UI.textMuted }} />
                      <Typography variant="body2" sx={{ color: UI.textSecondary, fontSize: '0.82rem' }} noWrap>
                        {user.email}
                      </Typography>
                    </Box>
                    {user.phoneNumber && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <PhoneIcon sx={{ fontSize: 13, color: UI.textMuted }} />
                        <Typography variant="body2" sx={{ color: UI.textSecondary, fontSize: '0.82rem' }} noWrap>
                          {user.phoneNumber}
                        </Typography>
                      </Box>
                    )}
                    {user.business && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <BusinessIcon sx={{ fontSize: 13, color: UI.textMuted }} />
                        <Typography variant="body2" sx={{ color: UI.textSecondary, fontSize: '0.82rem' }} noWrap>
                          {user.business}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 'auto' }}>
                    <Tooltip title="Edit User">
                      <IconButton size="small" onClick={() => {}} sx={{ color: UI.textMuted, '&:hover': { color: UI.textPrimary } }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton size="small" onClick={() => {}} sx={{ color: UI.textMuted, '&:hover': { color: '#EF4444' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            sx={{
              '& .MuiPaginationItem-root': { color: UI.textPrimary, borderColor: UI.border },
              '& .Mui-selected': { backgroundColor: `${UI.bgCard} !important`, borderColor: `${UI.accent} !important` }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default UserManagement;
