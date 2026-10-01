import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { STATUSES, statusLabel, BUSINESS_FILTERS, SORT_OPTIONS } from './leadHelpers';

export function LeadFilters({ businessFilter, filters, loadLeads, setBusinessFilter, setFilters, setSortBy, sortBy }) {
  return (
    <>
      <Box sx={{ p: 2, mb: 2, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="Search" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="Min score" type="number" value={filters.minScore} onChange={(e) => setFilters((p) => ({ ...p, minScore: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="City" value={filters.city} onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField fullWidth size="small" label="State" value={filters.state} onChange={(e) => setFilters((p) => ({ ...p, state: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={1}>
            <Button fullWidth variant="outlined" onClick={loadLeads}>Apply</Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Business type</InputLabel>
              <Select label="Business type" value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)}>
                {BUSINESS_FILTERS.map((option) => (
                  <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort</InputLabel>
              <Select label="Sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
