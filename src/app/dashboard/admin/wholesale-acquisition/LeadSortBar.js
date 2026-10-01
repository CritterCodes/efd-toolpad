import { Box, Stack, Checkbox, Typography, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export function LeadSortBar({ allVisibleSelected, handleToggleVisibleSelection, loading, pageSize, paginatedLeads, setPageSize, someVisibleSelected, visibleLeads, visibleSelectableIds }) {
  return (
    <>
      <Box sx={{ mb: 2, p: 1.5, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={handleToggleVisibleSelection}
              inputProps={{ 'aria-label': 'Select visible leads' }}
            />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              Showing {loading ? 0 : paginatedLeads.length} of {visibleLeads.length}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Per page</InputLabel>
              <Select label="Per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {[12, 24, 48, 96].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={handleToggleVisibleSelection} disabled={!visibleSelectableIds.length}>
              {allVisibleSelected ? 'Unselect Page' : 'Select Page'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
