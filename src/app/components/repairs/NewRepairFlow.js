'use client';

/**
 * NewRepairFlow — the stepped, mobile-first intake presentation.
 *
 * Step 3 of the intake redesign (facelift handoff INTAKE.md / intake-flow.png):
 * a SECOND presentational component rendering from the SAME useNewRepairForm
 * hook as the classic NewRepairForm. Both views share every piece of state,
 * fetching, pricing, and submission — this file contains NO business logic,
 * only arrangement. Reached behind the ?ui=next flag on /dashboard/repairs/new
 * so old and new can be A/B'd on real records and reverted instantly.
 *
 * The four screens, per the mock:
 *   1 Who it's for   — store → client scoped to that store, new-client dialog
 *   2 The piece      — photo, then the sentence; extractions as confirm-chips
 *   3 Work items     — mixed ticket list, subtotal, task/material/custom adds
 *   4 Review & save  — everything editable, pricing summary, save
 *
 * No step gates: validation happens at submit exactly as in the classic form,
 * so the two views cannot disagree about what a valid repair is.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import { taskAllowsMetal } from '@/services/repairs/metalTaskFilter';
import { RING_SIZES } from '@/services/repairs/smartIntakeExtractors';
import CameraCapture from '@/components/shared/CameraCapture';
import PromiseDateSuggestion from '@/app/components/repairs/PromiseDateSuggestion';
import { METAL_TYPES, GOLD_COLORS } from '@/constants/customRequest.constants';
import useNewRepairForm, {
  toNumber,
  resolveMaterialRetailPrice,
  resolveMaterialWholesalePrice,
} from '@/hooks/repairs/useNewRepairForm';
import { TaskItem, CustomLineItem, TotalCostCard } from '@/app/components/repairs/NewRepairForm';
import { SurfaceCard, SectionLabel, StatusChip, facelift } from '@/components/facelift';

const STEPS = [
  { key: 'who', title: "Who it's for", next: 'Next — the piece' },
  { key: 'piece', title: 'The piece', next: 'Next — the work' },
  { key: 'work', title: 'Work items', next: 'Next — review' },
  { key: 'review', title: 'Review & save', next: null },
];

function StepProgress({ step }) {
  return (
    <Box>
      <SectionLabel>
        Step {step + 1} of {STEPS.length} — {STEPS[step].title}
      </SectionLabel>
      <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
        {STEPS.map((s, i) => (
          <Box
            key={s.key}
            sx={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              backgroundColor: i <= step ? facelift.gold : 'rgba(255,255,255,0.14)',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

/** A confirm-chip for a value the smart intake picked out of the sentence. */
function ExtractedChip({ label }) {
  return <StatusChip label={`✓ ${label}`} hue="#34D399" />;
}

export default function NewRepairFlow(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isWholesale, submitMode = 'create', submitLabel = '' } = props;

  const {
    formData, setFormData,
    loading, errors,
    showNewClientDialog, setShowNewClientDialog,
    analyzingSmartIntake, smartIntakeError, setSmartIntakeError,
    generatingImageDescription, imageDescriptionError, setImageDescriptionError,
    newClientData, setNewClientData, newClientLoading,
    picturePreviewUrl,
    availableTasks, availableMaterials, availableUsers, benchJewelers, availableStores,
    rushJobInfo, adminSettings,
    stullerSku, setStullerSku, loadingStuller, stullerError, addStullerMaterial,
    promiseDateEstimate, promiseDateContext, promiseDateLoading, promiseDateError,
    getJewelerLabel, getKaratOptions, calculateTotalCost, formatPhoneNumber,
    handleStoreChange,
    addTask, addMaterial, addCustomLineItem, removeItem, updateItem,
    handleSubmit, handleAddNewClient, handleGenerateDescriptionFromImage, handleAnalyzeSmartIntake
  } = useNewRepairForm(props);

  const [step, setStep] = useState(0);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const itemCount = formData.tasks.length + formData.materials.length + formData.customLineItems.length;
  const itemsSubtotal = [
    ...formData.tasks.map((t) => toNumber(t.price) * (t.quantity || 1)),
    ...formData.materials.map((m) => toNumber(m.price) * (m.quantity || 1)),
    ...formData.customLineItems.map((c) => toNumber(c.price) * (c.quantity || 1)),
  ].reduce((sum, v) => sum + v, 0);

  const extractedChips = [
    formData.karat && String(formData.karat),
    formData.metalType === 'gold' && formData.goldColor && `${formData.goldColor} gold`,
    formData.metalType && formData.metalType !== 'gold' && formData.metalType,
    formData.isRing && 'Ring',
    formData.currentRingSize && formData.desiredRingSize && `${formData.currentRingSize} → ${formData.desiredRingSize}`,
  ].filter(Boolean);

  const clientLabel = (option) => {
    if (typeof option === 'string') return option;
    if (option && typeof option === 'object') {
      return option.name || option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
    }
    return '';
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pb: { xs: 12, sm: 4 } }}>
      <Stack spacing={2.5}>
        <StepProgress step={step} />

        {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

        {/* ── Step 1 — Who it's for ─────────────────────────────────────── */}
        {step === 0 && (
          <SurfaceCard>
            <Stack spacing={2.5}>
              <Box>
                <SectionLabel>Account</SectionLabel>
                <Box sx={{ mt: 1.5 }}>
                  {isWholesale ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Store"
                      value={formData.storeName || 'My Wholesale Store'}
                      InputProps={{ readOnly: true }}
                      helperText="Store selection controls wholesale pricing automatically"
                    />
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>Store</InputLabel>
                      <Select
                        value={formData.storeId || 'engel-fine-design'}
                        label="Store"
                        onChange={(e) => handleStoreChange(e.target.value)}
                      >
                        {(availableStores || []).map((store) => (
                          <MenuItem key={store.id} value={store.id}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body2">{store.name}</Typography>
                              {store.isWholesale && <Chip label="Wholesale" size="small" variant="outlined" />}
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
                <Box sx={{ mt: 1.25 }}>
                  <StatusChip
                    label={formData.isWholesale ? 'Wholesale pricing' : 'Retail pricing'}
                    hue={formData.isWholesale ? '#7DD3FC' : facelift.gold}
                  />
                </Box>
              </Box>

              <Box>
                <SectionLabel>Client at this store</SectionLabel>
                <Box sx={{ mt: 1.5 }}>
                  <Autocomplete
                    disablePortal
                    freeSolo
                    size="small"
                    options={Array.isArray(availableUsers) ? availableUsers : []}
                    getOptionLabel={clientLabel}
                    filterOptions={(options, state) => {
                      const input = state.inputValue.toLowerCase().trim();
                      if (!input) return options;
                      return options.filter((opt) => {
                        const name = clientLabel(opt).toLowerCase();
                        const email = (opt.email || '').toLowerCase();
                        const phone = (opt.phone || opt.phoneNumber || '').toLowerCase();
                        const business = (opt.business || '').toLowerCase();
                        return name.includes(input) || email.includes(input) || phone.includes(input) || business.includes(input);
                      });
                    }}
                    isOptionEqualToValue={(option, val) => {
                      if (!option || !val) return false;
                      if (typeof val === 'string') return clientLabel(option) === val;
                      return (option._id || option.userID || option.clientID) === (val._id || val.userID || val.clientID);
                    }}
                    inputValue={formData.clientName || ''}
                    onInputChange={(event, newInputValue, reason) => {
                      setFormData((prev) => ({
                        ...prev,
                        clientName: newInputValue || '',
                        userID: reason === 'input' || reason === 'clear' ? '' : prev.userID
                      }));
                    }}
                    value={
                      formData.userID
                        ? (Array.isArray(availableUsers) ? availableUsers : []).find(
                            (u) => (u._id || u.userID || u.clientID) === formData.userID
                          ) || formData.clientName || null
                        : null
                    }
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue === 'object') {
                        setFormData((prev) => ({
                          ...prev,
                          clientName: clientLabel(newValue),
                          userID: newValue._id || newValue.id || newValue.userID || newValue.clientID || ''
                        }));
                      } else if (typeof newValue === 'string') {
                        setFormData((prev) => ({ ...prev, clientName: newValue, userID: '' }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Client Name"
                        required
                        placeholder="Name, phone, or email"
                        helperText={formData.isWholesale ? 'Select a client from your wholesale client list' : 'Start typing to search existing clients'}
                      />
                    )}
                    renderOption={(liProps, option) => (
                      <Box component="li" {...liProps} key={option._id || option.id || option.userID || option.clientID || option}>
                        <Stack sx={{ width: '100%' }}>
                          <Typography variant="body2">{clientLabel(option)}</Typography>
                          {(option.email || option.phone || option.phoneNumber) && (
                            <Typography variant="caption" sx={{ color: facelift.text2 }}>
                              {[option.email, option.phone || option.phoneNumber].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                  />
                </Box>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={() => setShowNewClientDialog(true)}
                  sx={{ mt: 1.5 }}
                >
                  New client at this store
                </Button>
              </Box>
            </Stack>
          </SurfaceCard>
        )}

        {/* ── Step 2 — The piece ────────────────────────────────────────── */}
        {step === 1 && (
          <Stack spacing={2.5}>
            <SurfaceCard>
              <SectionLabel>Photo of the piece</SectionLabel>
              <Stack spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
                <CameraCapture
                  onCapture={(file) => {
                    setImageDescriptionError('');
                    setFormData((prev) => ({ ...prev, picture: file }));
                    handleGenerateDescriptionFromImage(file);
                  }}
                />
                {formData.picture && (
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <img
                      src={picturePreviewUrl}
                      alt="Captured item"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, objectFit: 'contain', border: `1px solid ${facelift.border}` }}
                    />
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={typeof formData.picture === 'string' ? 'Existing photo' : (formData.picture.name || 'Captured photo')}
                        onDelete={() => setFormData((prev) => ({ ...prev, picture: null }))}
                        sx={{ maxWidth: 250 }}
                      />
                    </Box>
                  </Box>
                )}
                {imageDescriptionError && <Alert severity="error" sx={{ width: '100%' }}>{imageDescriptionError}</Alert>}
                {generatingImageDescription && (
                  <Typography variant="caption" sx={{ color: facelift.text2 }}>
                    Writing a description from the photo…
                  </Typography>
                )}
              </Stack>
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>What needs doing?</SectionLabel>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.smartIntakeInput}
                onChange={(e) => {
                  setSmartIntakeError('');
                  setFormData((prev) => ({ ...prev, smartIntakeInput: e.target.value }));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleAnalyzeSmartIntake();
                  }
                }}
                placeholder="Size down 14k white gold ring from 7 to 6.5, retip two prongs"
                sx={{ mt: 1.5 }}
              />
              <LoadingButton
                variant="contained"
                loading={analyzingSmartIntake}
                onClick={handleAnalyzeSmartIntake}
                startIcon={<AutoAwesomeIcon />}
                loadingPosition="start"
                sx={{ mt: 1.5, alignSelf: 'flex-start' }}
              >
                Analyze the sentence
              </LoadingButton>
              {smartIntakeError && <Alert severity="warning" sx={{ mt: 1.5 }}>{smartIntakeError}</Alert>}

              {extractedChips.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontFamily: facelift.mono, color: facelift.text3 }}>
                    Picked up from that sentence — confirm on the review step
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {extractedChips.map((label) => <ExtractedChip key={label} label={label} />)}
                  </Box>
                </Box>
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Customer-facing description</SectionLabel>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                required
                placeholder="What the ticket says. Filled from the photo when one is taken."
                sx={{ mt: 1.5 }}
              />
            </SurfaceCard>
          </Stack>
        )}

        {/* ── Step 3 — Work items ───────────────────────────────────────── */}
        {step === 2 && (
          <Stack spacing={2.5}>
            {itemCount > 0 && (
              <SurfaceCard>
                <SectionLabel>On this ticket ({itemCount})</SectionLabel>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {formData.tasks.map((task) => (
                    <Box key={task.id}>
                      <StatusChip label="Task" hue={facelift.gold} />
                      <Box sx={{ mt: 0.75 }}>
                        <TaskItem
                          item={task}
                          onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
                          onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
                          showPriceInput={false}
                          onRemove={() => removeItem('tasks', task.id)}
                        />
                      </Box>
                    </Box>
                  ))}
                  {formData.materials.map((material) => (
                    <Box key={material.id}>
                      <StatusChip label="Material" hue="#7DD3FC" />
                      <Box sx={{ mt: 0.75 }}>
                        <TaskItem
                          item={material}
                          onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
                          onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
                          onRemove={() => removeItem('materials', material.id)}
                        />
                      </Box>
                    </Box>
                  ))}
                  {formData.customLineItems.map((item) => (
                    <Box key={item.id}>
                      <StatusChip label="Custom" hue="#C4B5FD" />
                      <Box sx={{ mt: 0.75 }}>
                        <CustomLineItem
                          item={item}
                          onDescriptionChange={(desc) => updateItem('customLineItems', item.id, 'description', desc)}
                          onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
                          onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
                          onLaborHoursChange={(hours) => updateItem('customLineItems', item.id, 'laborHours', hours)}
                          onRemove={() => removeItem('customLineItems', item.id)}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
                <Box
                  sx={{
                    mt: 2,
                    pt: 1.5,
                    borderTop: `1px solid ${facelift.hairline}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <SectionLabel>Items subtotal</SectionLabel>
                  <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ${itemsSubtotal.toFixed(2)}
                  </Typography>
                </Box>
              </SurfaceCard>
            )}

            <SurfaceCard>
              <SectionLabel>Add a task</SectionLabel>
              <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mt: 0.5 }}>
                Filtered to {formData.metalType ? `${formData.metalType} work` : 'the selected metal'} — a task
                restricted to another metal never appears.
              </Typography>
              <Autocomplete
                disablePortal
                size="small"
                options={[...availableTasks]
                  .filter((t) => taskAllowsMetal(t, formData.metalType))
                  .sort((a, b) => {
                    const aRestricted = Array.isArray(a.metals) && a.metals.length ? 0 : 1;
                    const bRestricted = Array.isArray(b.metals) && b.metals.length ? 0 : 1;
                    return aRestricted - bRestricted || String(a.title).localeCompare(String(b.title));
                  })}
                getOptionLabel={(option) => `${option.title}`}
                renderInput={(params) => <TextField {...params} label="Search all tasks" />}
                onChange={(e, value) => value && addTask(value)}
                sx={{ mt: 1.5 }}
              />
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Add a material</SectionLabel>
              <Autocomplete
                disablePortal
                size="small"
                options={availableMaterials}
                getOptionLabel={(option) => {
                  const displayName = option.displayName || option.name || 'Material';
                  const retail = resolveMaterialRetailPrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
                  const wholesale = resolveMaterialWholesalePrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
                  const shownPrice = formData.isWholesale && wholesale > 0 ? wholesale : retail;
                  return `${displayName} - $${shownPrice.toFixed(2)}`;
                }}
                renderInput={(params) => <TextField {...params} label="Search the catalog" />}
                onChange={(e, value) => value && addMaterial(value)}
                sx={{ mt: 1.5 }}
              />
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${facelift.hairline}` }}>
                <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mb: 1 }}>
                  Or look one up by Stuller SKU — added with markup applied.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
                  <TextField
                    label="Stuller SKU"
                    value={stullerSku}
                    onChange={(e) => setStullerSku(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
                    placeholder="Enter Stuller item number…"
                    size="small"
                    fullWidth
                    error={!!stullerError}
                    helperText={stullerError}
                  />
                  <LoadingButton
                    onClick={addStullerMaterial}
                    loading={loadingStuller}
                    disabled={!stullerSku.trim()}
                    variant="outlined"
                    sx={{ minWidth: 88, flexShrink: 0 }}
                  >
                    Look up
                  </LoadingButton>
                </Stack>
              </Box>
            </SurfaceCard>

            <SurfaceCard sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Box>
                <SectionLabel>Custom line</SectionLabel>
                <Typography variant="caption" sx={{ color: facelift.text2 }}>
                  Work with no catalog match — labor hours feed payroll, price is what's billed.
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addCustomLineItem} sx={{ flexShrink: 0 }}>
                Add
              </Button>
            </SurfaceCard>
          </Stack>
        )}

        {/* ── Step 4 — Review & save ────────────────────────────────────── */}
        {step === 3 && (
          <Stack spacing={2.5}>
            <SurfaceCard>
              <SectionLabel>The piece — confirm</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Metal Type</InputLabel>
                  <Select
                    value={formData.metalType}
                    label="Metal Type"
                    onChange={(e) => setFormData((prev) => ({ ...prev, metalType: e.target.value, goldColor: '', karat: '' }))}
                  >
                    {METAL_TYPES.map((metal) => (
                      <MenuItem key={metal.value} value={metal.value}>{metal.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {getKaratOptions().length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Karat/Purity</InputLabel>
                    <Select
                      value={formData.karat}
                      label="Karat/Purity"
                      onChange={(e) => setFormData((prev) => ({ ...prev, karat: e.target.value }))}
                    >
                      {getKaratOptions().map((karat) => (
                        <MenuItem key={karat} value={karat}>{karat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {formData.metalType === 'gold' && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Gold Color</InputLabel>
                    <Select
                      value={formData.goldColor}
                      label="Gold Color"
                      onChange={(e) => setFormData((prev) => ({ ...prev, goldColor: e.target.value }))}
                    >
                      {GOLD_COLORS.map((color) => (
                        <MenuItem key={color.value} value={color.value}>{color.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={formData.isRing}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      isRing: e.target.checked,
                      currentRingSize: e.target.checked ? prev.currentRingSize : '',
                      desiredRingSize: e.target.checked ? prev.desiredRingSize : ''
                    }))}
                  />
                }
                label="This item is a ring (enable sizing fields)"
              />
              {formData.isRing && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1 }}>
                  <Autocomplete
                    disablePortal
                    size="small"
                    options={RING_SIZES}
                    value={formData.currentRingSize}
                    onChange={(e, value) => setFormData((prev) => ({ ...prev, currentRingSize: value }))}
                    renderInput={(params) => <TextField {...params} label="Current Ring Size" />}
                  />
                  <Autocomplete
                    disablePortal
                    size="small"
                    options={RING_SIZES}
                    value={formData.desiredRingSize}
                    onChange={(e, value) => setFormData((prev) => ({ ...prev, desiredRingSize: value }))}
                    renderInput={(params) => <TextField {...params} label="Desired Ring Size" />}
                  />
                </Box>
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Timing</SectionLabel>
              {!isWholesale ? (
                <TextField
                  fullWidth
                  label="Promise Date"
                  type="date"
                  size="small"
                  value={formData.promiseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, promiseDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={{ mt: 1.5 }}
                />
              ) : (
                <Box sx={{ mt: 1.5 }}>
                  <PromiseDateSuggestion
                    readOnly
                    estimate={promiseDateEstimate}
                    context={promiseDateContext}
                    loading={promiseDateLoading}
                    error={promiseDateError}
                    value={formData.promiseDate}
                    onChange={(v) => setFormData((prev) => ({ ...prev, promiseDate: v }))}
                    deliveryDays={promiseDateContext?.deliveryDays}
                  />
                </Box>
              )}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                <Typography>Rush Job</Typography>
                <Switch
                  checked={formData.isRush}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isRush: e.target.checked }))}
                  disabled={!rushJobInfo.canCreate && !formData.isRush}
                />
                {formData.isRush && <Chip label={`x${adminSettings.rushMultiplier}`} size="small" />}
              </Stack>
              {!rushJobInfo.canCreate && (
                <Typography variant="caption" color="error">
                  Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
                </Typography>
              )}
            </SurfaceCard>

            {!formData.isWholesale && submitMode === 'create' && (
              <SurfaceCard accent={formData.whileYouWait ? facelift.gold : undefined}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.whileYouWait}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          whileYouWait: checked,
                          assignedTo: checked ? prev.assignedTo : '',
                          assignedJeweler: checked ? prev.assignedJeweler : '',
                        }));
                      }}
                    />
                  }
                  label="While-you-wait repair"
                />
                <Typography variant="caption" sx={{ color: facelift.text2 }}>
                  Creates this repair as completed and sends it directly to Payment & Pickup closeout.
                </Typography>
                {formData.whileYouWait && (
                  <FormControl fullWidth size="small" required sx={{ mt: 1.5 }}>
                    <InputLabel>Artisan who did the work</InputLabel>
                    <Select
                      value={formData.assignedTo}
                      label="Artisan who did the work"
                      onChange={(event) => {
                        const selected = benchJewelers.find((jeweler) => jeweler.userID === event.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          assignedTo: event.target.value,
                          assignedJeweler: selected ? getJewelerLabel(selected) : '',
                        }));
                      }}
                    >
                      {benchJewelers.map((jeweler) => (
                        <MenuItem key={jeweler.userID} value={jeweler.userID}>
                          {getJewelerLabel(jeweler)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </SurfaceCard>
            )}

            <SurfaceCard>
              <SectionLabel>Billing options</SectionLabel>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.compRepair || formData.includedWithSale)}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        compRepair: e.target.checked,
                        includedWithSale: e.target.checked,
                        includeTax: e.target.checked ? false : prev.includeTax,
                      }))}
                    />
                  }
                  label="Comp repair price / included with sale"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.includeDelivery}
                      onChange={(e) => setFormData((prev) => ({ ...prev, includeDelivery: e.target.checked }))}
                    />
                  }
                  label={`Include delivery (+$${adminSettings.deliveryFee.toFixed(2)})`}
                />
                {!formData.isWholesale ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.includeTax}
                        onChange={(e) => setFormData((prev) => ({ ...prev, includeTax: e.target.checked }))}
                      />
                    }
                    label={`Include tax (+${(adminSettings.taxRate * 100).toFixed(2)}%)`}
                  />
                ) : (
                  <Typography variant="caption" sx={{ color: facelift.text2 }}>
                    Your wholesale total is tax exempt. Customer tax is automatically applied from your account settings.
                  </Typography>
                )}
              </Stack>
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Notes</SectionLabel>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                rows={isMobile ? 2 : 3}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Customer notes, special instructions…"
                sx={{ mt: 1.5 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Internal Notes"
                multiline
                rows={isMobile ? 2 : 3}
                value={formData.internalNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))}
                placeholder="Internal team notes, not visible to customer…"
                sx={{ mt: 1.5 }}
              />
            </SurfaceCard>

            <TotalCostCard
              formData={formData}
              calculateTotalCost={calculateTotalCost}
              adminSettings={adminSettings}
              viewerIsWholesaler={isWholesale}
            />
          </Stack>
        )}
      </Stack>

      {/* ── Sticky step actions ─────────────────────────────────────────── */}
      <Box
        sx={{
          position: { xs: 'fixed', sm: 'static' },
          bottom: { xs: 0, sm: 'auto' },
          left: { xs: 0, sm: 'auto' },
          right: { xs: 0, sm: 'auto' },
          zIndex: { xs: 1100, sm: 'auto' },
          p: { xs: 1.5, sm: 0 },
          // Clear the global FAB, which floats bottom-right above this bar.
          pr: { xs: 10, sm: 0 },
          mt: { xs: 0, sm: 3 },
          backgroundColor: { xs: facelift.ground, sm: 'transparent' },
          borderTop: { xs: `1px solid ${facelift.hairline}`, sm: 'none' },
          display: 'flex',
          gap: 1.25,
        }}
      >
        {step > 0 && (
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={goBack} sx={{ flexShrink: 0 }}>
            Back
          </Button>
        )}
        {STEPS[step].next ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={goNext}
            fullWidth
            sx={{ py: 1.25 }}
          >
            {STEPS[step].next}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={<SaveIcon />}
            fullWidth
            sx={{ py: 1.25 }}
          >
            {loading ? 'Saving…' : (submitLabel || 'Create repair')}
          </Button>
        )}
      </Box>

      {/* New Client Dialog — same fields and handler as the classic form. */}
      <Dialog
        open={showNewClientDialog}
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>New client at this store</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="First Name"
              value={newClientData.firstName}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Last Name"
              value={newClientData.lastName}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, lastName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Phone"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              placeholder="(555) 123-4567"
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Email"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
              helperText="Optional"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewClientDialog(false)} disabled={newClientLoading}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="contained"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.phone.trim()}
          >
            {newClientLoading ? 'Creating…' : 'Add Client'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
