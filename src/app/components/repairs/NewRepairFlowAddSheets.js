import { AddSheet } from './NewRepairFlowParts';
import { Stack, Box, Alert, Typography, TextField } from '@mui/material';
import { SearchField, ChoiceList, ChoiceRow, SectionLabel, FilterPill, facelift, GoldButton, QtyStepper } from '@/components/facelift';
import { toNumber } from '@/hooks/repairs/useNewRepairForm';

export function NewRepairFlowAddSheets({ addCustomFromDraft, addLaborFromDraft, addMaterial, addSheet, addStullerMaterial, addTask, commonTasks, customDraft, formData, isMobile, laborDraft, laborDraftCalculated, laborDraftPrice, loadingStuller, materialPriceLabel, materialQuery, materialResults, metalAllowedTasks, metalSummary, setAddSheet, setCustomDraft, setLaborDraft, setMaterialQuery, setStullerSku, setTaskQuery, stullerError, stullerSku, taskQuery, taskResults }) {
  return (
    <>
      {/* ── Add sheets (mock frames 3a / 3b / 3c) ──────────────────────── */}
      <AddSheet open={addSheet === 'task'} title="Add a task" onClose={() => { setAddSheet(null); setTaskQuery(''); }} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <SearchField
            placeholder={`Search all ${metalAllowedTasks.length} tasks…`}
            value={taskQuery}
            onChange={(e) => setTaskQuery(e.target.value)}
            autoFocus={!isMobile}
          />
          {taskResults.length > 0 && (
            <ChoiceList>
              {taskResults.map((t) => (
                <ChoiceRow
                  key={t._id || t.title}
                  title={t.title}
                  meta={t.description}
                  onClick={() => { addTask(t); setTaskQuery(''); setAddSheet(null); }}
                />
              ))}
            </ChoiceList>
          )}
          {!taskQuery && commonTasks.length > 0 && (
            <Box>
              <SectionLabel>Most used at the counter</SectionLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {commonTasks.map((t) => (
                  <FilterPill key={t._id || t.title} onClick={() => { addTask(t); setAddSheet(null); }}>
                    + {t.title}
                  </FilterPill>
                ))}
              </Box>
            </Box>
          )}
          <Alert severity="info">
            Only tasks valid for {formData.metalType ? metalSummary : 'the selected metal'} are shown — the catalog is filtered to the metal picked in step 2.
          </Alert>
        </Stack>
      </AddSheet>

      <AddSheet open={addSheet === 'material'} title="Add a material" onClose={() => { setAddSheet(null); setMaterialQuery(''); }} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <SearchField
            placeholder="Search the material catalog…"
            value={materialQuery}
            onChange={(e) => setMaterialQuery(e.target.value)}
            autoFocus={!isMobile}
          />
          {materialResults.length > 0 && (
            <ChoiceList>
              {materialResults.map((m) => (
                <ChoiceRow
                  key={m._id || m.name}
                  title={m.displayName || m.name || 'Material'}
                  meta={materialPriceLabel(m)}
                  onClick={() => { addMaterial(m); setMaterialQuery(''); setAddSheet(null); }}
                />
              ))}
            </ChoiceList>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.594rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: facelift.text4 }}>or by SKU</Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              label="Stuller SKU"
              value={stullerSku}
              onChange={(e) => setStullerSku(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
              placeholder="Enter Stuller item number…"
              fullWidth
              error={!!stullerError}
              helperText={stullerError}
              inputProps={{ style: { fontSize: 16 } }}
            />
            <GoldButton onClick={addStullerMaterial} disabled={!stullerSku.trim() || loadingStuller} aria-label="Look up Stuller SKU">
              {loadingStuller ? 'Looking up…' : 'Look up'}
            </GoldButton>
          </Stack>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            A found SKU is added to the ticket with markup applied.
          </Typography>
        </Stack>
      </AddSheet>

      <AddSheet open={addSheet === 'labor'} title="Custom labor" onClose={() => setAddSheet(null)} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="What was done"
            value={laborDraft.description}
            onChange={(e) => setLaborDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Laser weld, rebuild prong, re-tip claw…"
            autoFocus={!isMobile}
            inputProps={{ style: { fontSize: 16 } }}
          />
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            <QtyStepper
              value={laborDraft.quantity}
              min={1}
              onChange={(q) => setLaborDraft((prev) => ({ ...prev, quantity: q }))}
              label="Custom labor quantity"
            />
            <TextField
              type="number"
              label="Hours / unit"
              value={laborDraft.laborHours}
              onChange={(e) => setLaborDraft((prev) => ({ ...prev, laborHours: e.target.value, price: '' }))}
              inputProps={{ min: 0, step: 0.05, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
            <TextField
              type="number"
              label="Price / unit"
              value={laborDraft.price === '' ? (laborDraftCalculated ?? '') : laborDraft.price}
              onChange={(e) => setLaborDraft((prev) => ({ ...prev, price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            {laborDraftCalculated == null
              ? 'Enter the hours to price this labor.'
              : laborDraft.price === '' || toNumber(laborDraft.price) === laborDraftCalculated
              ? `${formData.isWholesale ? 'Wholesale' : 'Retail'} price from hours: $${laborDraftCalculated.toFixed(2)} each. Type over it to discount — the hours still credit the jeweler at payroll.`
              : `Calculated $${laborDraftCalculated.toFixed(2)} each, discounted to $${laborDraftPrice.toFixed(2)}. Hours still credit the jeweler in full.`}
          </Typography>
          <GoldButton
            onClick={addLaborFromDraft}
            disabled={!laborDraft.description.trim() || toNumber(laborDraft.laborHours) <= 0}
            aria-label="Add custom labor to ticket"
          >
            Add to ticket · ${(laborDraftPrice * Math.max(1, Number(laborDraft.quantity) || 1)).toFixed(2)}
          </GoldButton>
        </Stack>
      </AddSheet>

      <AddSheet open={addSheet === 'custom'} title="Custom charge" onClose={() => setAddSheet(null)} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={customDraft.description}
            onChange={(e) => setCustomDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Rebuild unusual bezel — no catalog match"
            autoFocus={!isMobile}
            inputProps={{ style: { fontSize: 16 } }}
          />
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            <QtyStepper
              value={customDraft.quantity}
              min={1}
              onChange={(q) => setCustomDraft((prev) => ({ ...prev, quantity: q }))}
              label="Custom line quantity"
            />
            <TextField
              type="number"
              label="Price"
              value={customDraft.price}
              onChange={(e) => setCustomDraft((prev) => ({ ...prev, price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            A non-labor charge: a sourced part, a fee, a pass-through. It carries no hours and never
            enters labor credit. Work you did by hand goes on as Labor instead.
          </Typography>
          <GoldButton onClick={addCustomFromDraft} disabled={!customDraft.description.trim()} aria-label="Add custom charge to ticket">
            Add to ticket
          </GoldButton>
        </Stack>
      </AddSheet>
    </>
  );
}
