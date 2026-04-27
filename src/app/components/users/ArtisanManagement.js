"use client";
import React, { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useArtisanManagement } from '@/hooks/admin/useArtisanManagement';
import ArtisanTable from '@/components/admin/sections/ArtisanTable';

export default function ArtisanManagement() {
  const { data, loading, error } = useArtisanManagement();
  const [search, setSearch] = useState('');

  const filtered = data.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
    return (
      name.includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.business || '').toLowerCase().includes(q) ||
      (a.artisanTypes || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Artisans</Typography>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${data.length} artisan${data.length !== 1 ? 's' : ''}`}
        </Typography>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, email, business, or type…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && (
        <ArtisanTable data={filtered} />
      )}
    </Box>
  );
}
