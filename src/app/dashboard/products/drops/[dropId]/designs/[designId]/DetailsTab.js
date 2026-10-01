import { Stack, Box, Paper, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Typography } from '@mui/material';
import { repairsMenuProps, REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { CATEGORIES, DESIGN_STATUSES, EDITION_TYPES, PRODUCTION_METHODS, PanelTitle, artisanId, artisanLabel, cap, panelSx } from './designShared';
export function DetailsTab({ form, setField, artisans }) {
  const isGem = form.category === 'gemstone';
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      {/* Main column */}
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Paper sx={panelSx}>
          <PanelTitle>Details</PanelTitle>
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={(e) => setField('name', e.target.value)} size="small" fullWidth required />
            <TextField label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} size="small" fullWidth multiline minRows={4} />
            {/* Jewelry categories (ring/necklace/…) never apply to a gemstone design. */}
            {!isGem && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.category} label="Category" onChange={(e) => setField('category', e.target.value)} MenuProps={repairsMenuProps}>
                    <MenuItem value="">Unspecified</MenuItem>
                    {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Production method</InputLabel>
                  <Select value={form.productionMethod} label="Production method" onChange={(e) => setField('productionMethod', e.target.value)} MenuProps={repairsMenuProps}>
                    {PRODUCTION_METHODS.map((m) => <MenuItem key={m} value={m}>{cap(m)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            )}
            {/* Gemstone: the CUT is the design — shape + cutting technique. Material (species/
                carat/color…) lives per variant, like metal on jewelry. */}
            {isGem && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Cut(s)" value={form.gemCut} onChange={(e) => setField('gemCut', e.target.value)} size="small" sx={{ flex: 1 }}
                  placeholder="cushion, portuguese round…" helperText="comma-separated" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.62rem' } }} />
                <TextField label="Cutting technique" value={form.gemCutStyle} onChange={(e) => setField('gemCutStyle', e.target.value)} size="small" sx={{ flex: 1 }}
                  placeholder="brilliant, step, fantasy…" helperText="comma-separated" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.62rem' } }} />
              </Stack>
            )}
            <Autocomplete
              multiple freeSolo options={[]} value={form.tags}
              onChange={(_, v) => setField('tags', v)}
              renderInput={(params) => <TextField {...params} label="Tags" placeholder="add tag…" size="small" />}
            />
          </Stack>
        </Paper>
      </Box>

      {/* Sidebar */}
      <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>Status</PanelTitle>
          <FormControl size="small" fullWidth>
            <Select value={form.status} onChange={(e) => setField('status', e.target.value)} MenuProps={repairsMenuProps}>
              {DESIGN_STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{cap(s)}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={panelSx}>
          <PanelTitle>Edition</PanelTitle>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Edition type</InputLabel>
              <Select value={form.editionType} label="Edition type" onChange={(e) => setField('editionType', e.target.value)} MenuProps={repairsMenuProps}>
                {EDITION_TYPES.map((et) => <MenuItem key={et.value} value={et.value}>{et.label}</MenuItem>)}
              </Select>
            </FormControl>
            {form.editionType === 'limited' && (
              <TextField label="Edition limit" type="number" value={form.editionLimit} onChange={(e) => setField('editionLimit', e.target.value)} size="small" fullWidth />
            )}
          </Stack>
        </Paper>

        <Paper sx={panelSx}>
          <PanelTitle>Artisan credit</PanelTitle>
          <Autocomplete
            size="small" options={artisans}
            getOptionLabel={artisanLabel}
            isOptionEqualToValue={(o, v) => artisanId(o) === artisanId(v)}
            value={artisans.find((a) => artisanId(a) === form.primaryArtisanId) || null}
            onChange={(_, opt) => setField('primaryArtisanId', opt ? (artisanId(opt) || '') : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Primary artisan"
                placeholder="search…"
                required
                error={!form.primaryArtisanId}
                helperText={!form.primaryArtisanId ? 'Required — a design must credit an artisan.' : ' '}
              />
            )}
          />
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
            Drop credit is derived from each design’s primary artisan.
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}

