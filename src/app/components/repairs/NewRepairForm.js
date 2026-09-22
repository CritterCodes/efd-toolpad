import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Autocomplete,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  useMediaQuery,
  useTheme,
  Stack,
  Fab,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

// Render-side services/constants only — everything the LOGIC needs is
// imported by useNewRepairForm (the seam; intake redesign step 2).
import { taskAllowsMetal } from '@/services/repairs/metalTaskFilter';
import { RING_SIZES } from '@/services/repairs/smartIntakeExtractors';
import { isCustomLaborTask, calculatedCustomLaborPrice } from '@/services/repairs/customLabor';
import SmartIntakeMic from '@/app/components/repairs/SmartIntakeMic';

// Components
import CameraCapture from '@/components/shared/CameraCapture';
import PromiseDateSuggestion from '@/app/components/repairs/PromiseDateSuggestion';

// The data seam: all fetching, derived state, and handlers.
import useNewRepairForm, {
  toNumber,
  resolveTaskBasePrice,
  resolveMaterialRawPortionBaseCost,
  resolveMaterialRetailPrice,
  resolveMaterialWholesalePrice,
} from '@/hooks/repairs/useNewRepairForm';

// Metal configuration — single source of truth, shared with the custom-request intake.
import { METAL_TYPES, GOLD_COLORS } from '@/constants/customRequest.constants';

const UI = {
  bgPrimary: '#08090B',
  bgPanel: '#131416',
  bgCard: '#12141A',
  bgTertiary: '#1B1C1E',
  border: 'rgba(255,255,255,0.12)',
  textPrimary: '#FFFFFF',
  textHeader: '#D1D5DB',
  textSecondary: 'rgba(255,255,255,0.66)',
  textMuted: 'rgba(255,255,255,0.5)',
  accent: '#FBBF24',
  shadow: '0 8px 24px rgba(0,0,0,0.45)'
};

const sectionCardSx = {
  px: { xs: 0, sm: 2.5, md: 3 },
  py: { xs: 2, sm: 2.5 },
  backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
  border: { xs: 'none', sm: '1px solid' },
  borderColor: UI.border,
  borderRadius: { xs: 0, sm: 3 },
  boxShadow: { xs: 'none', sm: UI.shadow },
  borderTop: { xs: '1px solid', sm: 'none' }
};

const sectionLabelSx = {
  color: UI.textSecondary,
  fontWeight: 700,
  display: 'block',
  mb: 1.25,
  lineHeight: 1,
  letterSpacing: '0.08em'
};

const neutralChipSx = {
  backgroundColor: UI.bgTertiary,
  color: UI.textPrimary,
  border: '1px solid',
  borderColor: UI.border
};

const successChipSx = {
  backgroundColor: 'rgba(46, 125, 50, 0.18)',
  color: '#A5D6A7',
  border: '1px solid',
  borderColor: 'rgba(165, 214, 167, 0.35)'
};

const autocompleteSlotProps = {
  paper: {
    sx: {
      mt: 0.5,
      backgroundColor: UI.bgCard,
      color: UI.textPrimary,
      border: '1px solid',
      borderColor: UI.border,
      boxShadow: UI.shadow,
      backgroundImage: 'none'
    }
  },
  listbox: {
    sx: {
      py: 0.5,
      '& .MuiAutocomplete-option': {
        alignItems: 'flex-start',
        borderBottom: '1px solid',
        borderColor: UI.border,
        px: 1.5,
        py: 1.25,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&[aria-selected="true"]': {
          backgroundColor: UI.bgTertiary
        },
        '&.Mui-focused, &.Mui-focusVisible': {
          backgroundColor: UI.bgPanel
        }
      }
    }
  },
  popper: {
    sx: {
      '& .MuiAutocomplete-noOptions': {
        color: UI.textSecondary,
        backgroundColor: UI.bgCard
      }
    }
  }
};

const selectMenuProps = {
  PaperProps: {
    sx: {
      mt: 0.5,
      backgroundColor: UI.bgCard,
      color: UI.textPrimary,
      border: '1px solid',
      borderColor: UI.border,
      boxShadow: UI.shadow,
      backgroundImage: 'none',
      '& .MuiMenuItem-root': {
        fontSize: '0.95rem',
        borderBottom: '1px solid',
        borderColor: UI.border,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&.Mui-selected': {
          backgroundColor: UI.bgTertiary
        },
        '&.Mui-focusVisible, &:hover': {
          backgroundColor: UI.bgPanel
        }
      }
    }
  },
  MenuListProps: {
    sx: {
      py: 0.5
    }
  }
};

function FormSection({ title, subtitle, children, sx }) {
  return (
    <Box sx={{ ...sectionCardSx, ...sx }}>
      <Box sx={{ mb: 2, px: { xs: 0.5, sm: 0 } }}>
        <Typography variant="overline" sx={sectionLabelSx}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: UI.textSecondary }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ px: { xs: 0.5, sm: 0 } }}>{children}</Box>
    </Box>
  );
}


export default function NewRepairForm({
  onSubmit,
  initialData = null,
  submitMode = 'create',
  persistOnSubmit = true,
  // Quoting reuses this whole form, but a quote is not a commitment: the piece
  // is still on the customer's finger and they have not agreed to anything yet,
  // so there is no honest promise date to give. It is asked for at drop-off,
  // when the work is real and the queue is known.
  isQuote = false,
  submitLabel = '',
  repairID = null,
  clientInfo = null,
  isWholesale = false,
  onWholesaleChange = null,
  wholesalerStoreId = null,
  wholesalerStoreName = null
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Every piece of data fetching, derived state, and every handler lives in
  // useNewRepairForm (intake redesign step 2 — the seam). This component is
  // presentational; do not add logic here.
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
    addTask, addMaterial, addCustomLineItem, addCustomLaborTask, patchCustomLaborTask, removeItem, updateItem,
    handleSubmit, handleAddNewClient, handleGenerateDescriptionFromImage, handleAnalyzeSmartIntake
  } = useNewRepairForm({
    onSubmit,
    initialData,
    submitMode,
    persistOnSubmit,
    isQuote,
    repairID,
    clientInfo,
    isWholesale,
    onWholesaleChange,
    wholesalerStoreId,
    wholesalerStoreName
  });

  // Voice input for the sentence: each finished phrase is appended; when the jeweler taps the
  // mic to STOP (not when the engine times out), the sentence is analyzed for them.
  const [dictation, setDictation] = useState({ listening: false, interim: '', error: '', endedByUser: false });
  const analyzeAfterDictationRef = useRef(false);
  const appendDictated = (text) => {
    setSmartIntakeError('');
    setFormData((prev) => ({ ...prev, smartIntakeInput: [String(prev.smartIntakeInput || '').trim(), text].filter(Boolean).join(' ') }));
  };
  const onDictationStatus = (status) => {
    if (status.endedByUser) analyzeAfterDictationRef.current = true;
    setDictation((prev) => ({ ...prev, ...status }));
  };
  useEffect(() => {
    if (!analyzeAfterDictationRef.current || dictation.listening) return;
    analyzeAfterDictationRef.current = false;
    if (String(formData.smartIntakeInput || '').trim()) handleAnalyzeSmartIntake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.listening, formData.smartIntakeInput]);

  return (
    <Box sx={{ 
      maxWidth: 1000, 
      mx: 'auto',
      px: 0,
      pb: { xs: 10, sm: 2 }
    }}>
      {errors.submit && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: UI.bgPanel, border: '1px solid', borderColor: UI.border, color: UI.textPrimary }}>
          {errors.submit}
        </Alert>
      )}

      <Stack spacing={{ xs: 1.5, sm: 3 }}>

        {/* Client Information */}
        <FormSection title="Client Information">
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {isWholesale ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Store"
                  value={formData.storeName || 'My Wholesale Store'}
                  InputProps={{ readOnly: true }}
                  helperText="Store selection controls wholesale pricing automatically"
                />
              </Grid>
              ) : (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Store</InputLabel>
                  <Select
                    MenuProps={selectMenuProps}
                    value={formData.storeId || 'engel-fine-design'}
                    label="Store"
                    onChange={(e) => handleStoreChange(e.target.value)}
                  >
                    {(availableStores || []).map((store) => (
                      <MenuItem key={store.id} value={store.id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ color: UI.textPrimary }}>{store.name}</Typography>
                          {store.isWholesale && (
                              <Chip label="Wholesale" size="small" variant="outlined" sx={neutralChipSx} />
                          )}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    Store selection controls wholesale pricing automatically
                  </Typography>
                </FormControl>
              </Grid>
              )}
              <Grid item xs={12}>
                <Autocomplete
                    disablePortal
                    freeSolo
                    size="small"
                    options={Array.isArray(availableUsers) ? availableUsers : []}
                    slotProps={autocompleteSlotProps}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (option && typeof option === 'object') {
                        return option.name || option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
                      }
                      return '';
                    }}
                    filterOptions={(options, state) => {
                      const input = state.inputValue.toLowerCase().trim();
                      if (!input) return options;
                      return options.filter((opt) => {
                        const name = (opt.name || opt.fullName || `${opt.firstName || ''} ${opt.lastName || ''}`.trim()).toLowerCase();
                        const email = (opt.email || '').toLowerCase();
                        const phone = (opt.phone || opt.phoneNumber || '').toLowerCase();
                        const business = (opt.business || '').toLowerCase();
                        return name.includes(input) || email.includes(input) || phone.includes(input) || business.includes(input);
                      });
                    }}
                    isOptionEqualToValue={(option, val) => {
                      if (!option || !val) return false;
                      if (typeof val === 'string') {
                        const label = option.name || option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
                        return label === val;
                      }
                      return (option._id || option.userID || option.clientID) === (val._id || val.userID || val.clientID);
                    }}
                    inputValue={formData.clientName || ''}
                    onInputChange={(event, newInputValue, reason) => {
                      setFormData(prev => ({
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
                      console.log('Ã°Å¸Å½Â¯ Autocomplete change:', newValue);
                      if (newValue && typeof newValue === 'object') {
                        const clientName = newValue.name || `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim() || newValue.email || '';
                        const userID = newValue._id || newValue.id || newValue.userID || newValue.clientID || '';
                        const isClientWholesale = !!formData.isWholesale;
                        
                        console.log('Ã°Å¸â€˜Â¤ Selected client:', { clientName, userID, role: newValue.role, isWholesale: isClientWholesale });
                        
                        setFormData(prev => ({ 
                          ...prev, 
                          clientName,
                          userID
                        }));

                        console.log('Ã°Å¸â€™Â° Pricing mode from selected store:', isClientWholesale);
                      } else if (typeof newValue === 'string') {
                        console.log('Ã°Å¸â€œÂ String value entered:', newValue);
                        setFormData(prev => ({ 
                          ...prev, 
                          clientName: newValue,
                          userID: ''
                        }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Client Name"
                        required
                        placeholder={formData.isWholesale ? "Search your clients..." : "Type to search clients..."}
                        helperText={formData.isWholesale ? "Select a client from your wholesale client list" : "Start typing to search existing clients"}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option._id || option.id || option.userID || option.clientID || option}>
                        <Stack sx={{ width: '100%' }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" sx={{ color: UI.textPrimary }}>
                              {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()}
                            </Typography>
                            {option.role === 'wholesaler' && (
                              <Chip 
                                label="Wholesale" 
                                size="small" 
                                variant="outlined"
                                sx={neutralChipSx}
                              />
                            )}
                          </Stack>
                          {option.email && (
                            <Typography variant="caption" sx={{ color: UI.textSecondary }}>
                              Email: {option.email}
                            </Typography>
                          )}
                          {(option.phone || option.phoneNumber) && (
                            <Typography variant="caption" sx={{ color: UI.textSecondary }}>
                              Phone: {option.phone || option.phoneNumber}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                    noOptionsText={
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          No existing clients found
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setShowNewClientDialog(true)}
                          sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
                        >
                          Add New Client
                        </Button>
                      </Box>
                    }
                  />
              </Grid>
              
              {/* Quick Add Client Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowNewClientDialog(true)}
                      sx={{ color: UI.accent }}
                    >
                      Add New Client
                    </Button>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Rush Job</Typography>
                    <Switch
                      checked={formData.isRush}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRush: e.target.checked }))}
                      disabled={!rushJobInfo.canCreate && !formData.isRush}
                    />
                    {formData.isRush && (
                      <Chip 
                        label={`x${adminSettings.rushMultiplier}`}
                        size="small"
                        variant="filled"
                        sx={neutralChipSx}
                      />
                    )}
                  </Stack>
                  {!rushJobInfo.canCreate && (
                    <Typography variant="caption" color="error">
                      Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
                    </Typography>
                  )}
                  {rushJobInfo.canCreate && rushJobInfo.remainingSlots <= 2 && (
                    <Typography variant="caption" color="warning.main">
                      {rushJobInfo.remainingSlots} rush job slots remaining
                    </Typography>
                  )}
                  {formData.isRush && (
                    <Typography variant="caption" color="text.secondary">
                      Rush jobs have {((adminSettings.rushMultiplier - 1) * 100).toFixed(0)}% markup
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Pricing Mode</Typography>
                    {formData.isWholesale ? (
                      <Chip label="Wholesale" size="small" variant="filled" sx={neutralChipSx} />
                    ) : (
                      <Chip label="Retail" size="small" variant="outlined" sx={neutralChipSx} />
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: UI.accent }}>
                    Set automatically from selected store
                  </Typography>
                </FormControl>
              </Grid>

              {!formData.isWholesale && submitMode === 'create' && (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: formData.whileYouWait ? UI.accent : UI.border,
                      borderRadius: 2,
                      backgroundColor: formData.whileYouWait ? 'rgba(212, 175, 55, 0.08)' : UI.bgCard,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.whileYouWait}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setFormData(prev => ({
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
                      <Typography variant="caption" sx={{ color: UI.textSecondary }}>
                        Creates this repair as completed and sends it directly to Payment & Pickup closeout.
                      </Typography>
                      {formData.whileYouWait && (
                        <FormControl fullWidth size="small" required>
                          <InputLabel>Artisan who did the work</InputLabel>
                          <Select
                            MenuProps={selectMenuProps}
                            value={formData.assignedTo}
                            label="Artisan who did the work"
                            onChange={(event) => {
                              const selected = benchJewelers.find((jeweler) => jeweler.userID === event.target.value);
                              setFormData(prev => ({
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
                          <Typography variant="caption" sx={{ color: UI.textSecondary, mt: 0.5 }}>
                            Used for labor attribution and repair history.
                          </Typography>
                        </FormControl>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Include Delivery</Typography>
                    <Switch
                      checked={formData.includeDelivery}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeDelivery: e.target.checked }))}
                    />
                    {formData.includeDelivery && (
                      <Chip 
                        label={`+$${adminSettings.deliveryFee.toFixed(2)}`}
                        size="small"
                        variant="filled"
                        sx={neutralChipSx}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Add ${adminSettings.deliveryFee.toFixed(2)} delivery fee to total cost (not subject to wholesale discount)
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                {!formData.isWholesale ? (
                  <FormControl fullWidth>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography>Include Tax</Typography>
                      <Switch
                        checked={formData.includeTax}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeTax: e.target.checked }))}
                      />
                      {formData.includeTax && (
                        <Chip 
                          label={`+${(adminSettings.taxRate * 100).toFixed(2)}%`}
                          size="small"
                          variant="filled"
                          sx={neutralChipSx}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {`Apply ${(adminSettings.taxRate * 100).toFixed(2)}% tax rate to total cost`}
                    </Typography>
                  </FormControl>
                ) : (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Tax Handling</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Your wholesale total is tax exempt. Customer tax is automatically applied from your account settings.
                    </Typography>
                  </Stack>
                )}
              </Grid>
            </Grid>
        </FormSection>

        {/* Wholesaler Information */}
        {isWholesale && (
          <Alert
            severity="info"
            sx={{
              mx: { xs: 2, sm: 0 },
              backgroundColor: UI.bgPanel,
              border: '1px solid',
              borderColor: UI.border,
              color: UI.textPrimary,
              boxShadow: UI.shadow,
              '& .MuiAlert-icon': {
                color: UI.accent
              }
            }}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ color: UI.textPrimary, fontWeight: 600 }}>
              Wholesaler Repair Submission
            </Typography>
            <Typography variant="body2">
              As a wholesaler, you can record your client&apos;s information and special instructions in the notes section below.
              Our admin team will review your submission and provide pricing details.
            </Typography>
          </Alert>
        )}

        {/* Image Capture */}
        <FormSection
          title="Item Photo"
          subtitle="Take a photo with your camera or upload from file"
        >
          <Stack spacing={2} alignItems="center">
            <CameraCapture
              onCapture={(file) => {
                setImageDescriptionError('');
                setFormData(prev => ({ ...prev, picture: file }));
                handleGenerateDescriptionFromImage(file);
              }}
            />
            {formData.picture && (
              <Box sx={{ width: '100%', textAlign: 'center' }}>
                <Box sx={{ mb: 1 }}>
                  <img
                    src={picturePreviewUrl}
                    alt="Captured item"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain', border: `1px solid ${UI.border}`, background: UI.bgCard }}
                  />
                </Box>
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                  <Chip
                    label={typeof formData.picture === 'string' ? 'Existing photo' : (formData.picture.name || 'Captured photo')}
                    onDelete={() => setFormData(prev => ({ ...prev, picture: null }))}
                    deleteIcon={<DeleteIcon />}
                    sx={{ ...neutralChipSx, maxWidth: 250 }}
                  />
                </Stack>
              </Box>
            )}
            <LoadingButton
              variant="outlined"
              onClick={() => handleGenerateDescriptionFromImage()}
              loading={generatingImageDescription}
              loadingPosition="start"
              startIcon={<AutoAwesomeIcon />}
              disabled={!formData.picture}
              sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
            >
              Regenerate Description with Gemini
            </LoadingButton>
            {imageDescriptionError && (
              <Alert severity="error" sx={{ width: '100%', textAlign: 'left', backgroundColor: UI.bgCard, border: '1px solid', borderColor: UI.border }}>
                {imageDescriptionError}
              </Alert>
            )}
            {!formData.picture && (
              <Typography variant="body2" color="text.secondary">
                No photo selected
              </Typography>
            )}
          </Stack>
        </FormSection>

        {/* Item Details */}
        <FormSection title="Item Details">
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Smart Intake Input"
                  multiline
                  rows={2}
                  value={formData.smartIntakeInput}
                  onChange={(e) => {
                    setSmartIntakeError('');
                    setFormData(prev => ({ ...prev, smartIntakeInput: e.target.value }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleAnalyzeSmartIntake();
                    }
                  }}
                  placeholder={dictation.listening ? 'Listening… say what needs doing' : 'Tell us about the ring and what we are doing (e.g., 14k white gold ring resize from 6 to 7, retip prongs)'}
                  helperText={dictation.listening
                    ? `Listening${dictation.interim ? `: “${dictation.interim}”` : '…'} Click the mic again to stop and analyze.`
                    : 'Type or tap the mic to dictate. Press Enter or click Analyze to auto-fill metal, ring sizing, and likely tasks. This does not replace your customer-facing description below.'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.25 }}>
                        <SmartIntakeMic size={36} onTranscript={appendDictated} onStatus={onDictationStatus} />
                      </InputAdornment>
                    ),
                  }}
                />
                {dictation.error ? (
                  <Alert severity="warning" sx={{ mt: 1, backgroundColor: UI.bgCard, border: '1px solid', borderColor: UI.border }}>
                    {dictation.error}
                  </Alert>
                ) : null}
              </Grid>

              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <LoadingButton
                    variant="outlined"
                    loading={analyzingSmartIntake}
                    onClick={handleAnalyzeSmartIntake}
                    startIcon={<AutoAwesomeIcon />}
                    loadingPosition="start"
                    sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
                  >
                    Analyze Smart Intake
                  </LoadingButton>
                  <Typography variant="caption" color="text.secondary">
                    Enter submits analysis. Shift+Enter adds a new line.
                  </Typography>
                </Stack>
                {smartIntakeError ? (
                  <Alert severity="warning" sx={{ mt: 1.5, backgroundColor: UI.bgCard, border: '1px solid', borderColor: UI.border }}>
                    {smartIntakeError}
                  </Alert>
                ) : null}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </Grid>
              
              {!isWholesale && !isQuote && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Promise Date"
                    type="date"
                    size="small"
                    value={formData.promiseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, promiseDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
              )}

              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Metal Type</InputLabel>
                  <Select
                    MenuProps={selectMenuProps}
                    value={formData.metalType}
                    label="Metal Type"
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metalType: e.target.value,
                      goldColor: '',
                      karat: ''
                    }))}
                  >
                    {METAL_TYPES.map(metal => (
                      <MenuItem key={metal.value} value={metal.value}>
                        {metal.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {getKaratOptions().length > 0 && (
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Karat/Purity</InputLabel>
                    <Select
                      MenuProps={selectMenuProps}
                      value={formData.karat}
                      label="Karat/Purity"
                      onChange={(e) => setFormData(prev => ({ ...prev, karat: e.target.value }))}
                    >
                      {getKaratOptions().map(karat => (
                        <MenuItem key={karat} value={karat}>
                          {karat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {formData.metalType === 'gold' && (
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gold Color</InputLabel>
                    <Select
                      MenuProps={selectMenuProps}
                      value={formData.goldColor}
                      label="Gold Color"
                      onChange={(e) => setFormData(prev => ({ ...prev, goldColor: e.target.value }))}
                    >
                      {GOLD_COLORS.map((color) => (
                        <MenuItem key={color.value} value={color.value}>
                          {color.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRing}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        isRing: e.target.checked,
                        currentRingSize: e.target.checked ? prev.currentRingSize : '',
                        desiredRingSize: e.target.checked ? prev.desiredRingSize : ''
                      }))}
                    />
                  }
                  label="This item is a ring (enable sizing fields)"
                />
              </Grid>

              {formData.isRing && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="overline" sx={sectionLabelSx}>
                      Ring Sizing
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Autocomplete
                      disablePortal
                      slotProps={autocompleteSlotProps}
                      options={RING_SIZES}
                      value={formData.currentRingSize}
                      onChange={(e, value) => setFormData(prev => ({ ...prev, currentRingSize: value }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Current Ring Size" size="small" />
                      )}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <Autocomplete
                      disablePortal
                      slotProps={autocompleteSlotProps}
                      options={RING_SIZES}
                      value={formData.desiredRingSize}
                      onChange={(e, value) => setFormData(prev => ({ ...prev, desiredRingSize: value }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Desired Ring Size" size="small" />
                      )}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.compRepair || formData.includedWithSale)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        compRepair: e.target.checked,
                        includedWithSale: e.target.checked,
                        includeTax: e.target.checked ? false : prev.includeTax,
                      }))}
                    />
                  }
                  label="Comp repair price / included with sale"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  multiline
                  rows={isMobile ? 2 : 3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Customer notes, special instructions..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Internal Notes"
                  multiline
                  rows={isMobile ? 2 : 3}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  placeholder="Internal team notes, not visible to customer..."
                />
              </Grid>
            </Grid>
        </FormSection>

        {/* Work Items */}
        <RepairItemsSection
          formData={formData}
          setFormData={setFormData}
          adminSettings={adminSettings}
          availableTasks={availableTasks}
          availableMaterials={availableMaterials}
          addTask={addTask}
          addMaterial={addMaterial}
          addCustomLineItem={addCustomLineItem}
          addCustomLaborTask={addCustomLaborTask}
          patchCustomLaborTask={patchCustomLaborTask}
          removeItem={removeItem}
          updateItem={updateItem}
          stullerSku={stullerSku}
          setStullerSku={setStullerSku}
          loadingStuller={loadingStuller}
          stullerError={stullerError}
          addStullerMaterial={addStullerMaterial}
        />

        {/* Wholesalers see a read-only estimated promise date (admin sets the
            real one). Retail keeps the editable Promise Date field above. */}
        {isWholesale && (
          <FormSection title="Promise Date" subtitle="Estimated completion based on shop workload and your delivery schedule">
            <PromiseDateSuggestion
              readOnly
              estimate={promiseDateEstimate}
              context={promiseDateContext}
              loading={promiseDateLoading}
              error={promiseDateError}
              value={formData.promiseDate}
              onChange={(v) => setFormData(prev => ({ ...prev, promiseDate: v }))}
              deliveryDays={promiseDateContext?.deliveryDays}
            />
          </FormSection>
        )}

        {/* Total Cost & Pricing Breakdown */}
        <TotalCostCard
          formData={formData}
          calculateTotalCost={calculateTotalCost}
          adminSettings={adminSettings}
          viewerIsWholesaler={isWholesale}
        />
      </Stack>

      {/* New Client Dialog */}
      <Dialog
        open={showNewClientDialog}
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: UI.bgPanel,
            border: '1px solid',
            borderColor: UI.border,
            boxShadow: UI.shadow,
            color: UI.textPrimary
          }
        }}
      >
        <DialogTitle sx={{ color: UI.textPrimary, borderBottom: '1px solid', borderColor: UI.border }}>
          Add New Client
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="First Name"
              value={newClientData.firstName}
              onChange={(e) => setNewClientData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Last Name"
              value={newClientData.lastName}
              onChange={(e) => setNewClientData(prev => ({ ...prev, lastName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Phone"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              placeholder="(555) 123-4567"
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Email"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
              helperText="Optional"
            />

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: UI.border }}>
          <Button 
            onClick={() => setShowNewClientDialog(false)}
            disabled={newClientLoading}
            sx={{ color: UI.textSecondary }}
          >
            Cancel
          </Button>
          <LoadingButton 
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="outlined"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.phone.trim()}
            sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
          >
            {newClientLoading ? 'Creating...' : 'Add Client'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Save Button - Sticky on mobile */}
      <Box sx={{ 
        position: { xs: 'fixed', sm: 'static' },
        bottom: { xs: 0, sm: 'auto' },
        left: { xs: 0, sm: 'auto' },
        right: { xs: 0, sm: 'auto' },
        zIndex: { xs: 1100, sm: 'auto' },
        p: { xs: 1.5, sm: 0 },
        mt: { xs: 0, sm: 4 },
        bgcolor: { xs: UI.bgPanel, sm: 'transparent' },
        borderTop: { xs: '1px solid', sm: 'none' },
        borderColor: UI.border,
        boxShadow: { xs: UI.shadow, sm: 'none' },
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Button
          variant="outlined"
          onClick={() => handleSubmit()}
          disabled={loading}
          startIcon={<SaveIcon />}
          size="large"
          fullWidth
          sx={{
            maxWidth: { xs: '100%', sm: 400 },
            py: 1.5,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            fontWeight: 700,
            borderColor: UI.border,
            color: UI.textPrimary,
            backgroundColor: UI.bgCard,
          }}
        >
          {loading ? 'Saving...' : (submitLabel || 'SAVE REPAIR')}
        </Button>
        {/* Stores are pushed to price their own jobs; when they can't, this creates the repair with no
            tasks and asks EFD to quote it. The piece still comes in the normal way. */}
        {formData.isWholesale && submitMode === 'create' && !isQuote && (
          <Button
            variant="text"
            onClick={() => handleSubmit({ requestQuote: true })}
            disabled={loading}
            size="large"
            sx={{ ml: 1.5, py: 1.5, fontWeight: 700, color: UI.accent, whiteSpace: 'nowrap' }}
          >
            Request Quote
          </Button>
        )}
      </Box>
    </Box>
  );
}

// Separate component for repair items to keep main component manageable
function RepairItemsSection({
  formData,
  setFormData,
  adminSettings,
  availableTasks,
  availableMaterials,
  addTask,
  addMaterial,
  addCustomLineItem,
  addCustomLaborTask,
  patchCustomLaborTask,
  removeItem,
  updateItem,
  stullerSku,
  setStullerSku,
  loadingStuller,
  stullerError,
  addStullerMaterial
}) {
  return (
    <FormSection title="Work Items" subtitle="Tasks (catalog or custom labor), materials, and non-labor charges for this repair">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="overline" sx={sectionLabelSx}>
          Tasks {formData.tasks.length > 0 && `(${formData.tasks.length})`}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => addCustomLaborTask()}
          variant="outlined"
          size="small"
          sx={{ borderColor: UI.border, color: UI.textPrimary }}
        >
          Custom labor
        </Button>
      </Box>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          disablePortal
          slotProps={autocompleteSlotProps}
          // Metal-aware: a task restricted to another metal never appears (a
          // platinum laser-weld task on a gold job is the wrong recipe), and the
          // selected metal's own tasks float to the top of the list.
          options={[...availableTasks]
            .filter((t) => taskAllowsMetal(t, formData.metalType))
            .sort((a, b) => {
              const aRestricted = Array.isArray(a.metals) && a.metals.length ? 0 : 1;
              const bRestricted = Array.isArray(b.metals) && b.metals.length ? 0 : 1;
              return aRestricted - bRestricted || String(a.title).localeCompare(String(b.title));
            })}
          getOptionLabel={(option) => `${option.title}`}
          renderInput={(params) => (
            <TextField {...params} label="Add Task" size="small" />
          )}
          onChange={(e, value) => value && addTask(value)}
        />
        {formData.tasks.map(task => (
          isCustomLaborTask(task) ? (
            <CustomLaborItem
              key={task.id}
              item={task}
              isWholesale={!!formData.isWholesale}
              onChange={(patch) => patchCustomLaborTask(task.id, patch)}
              onRemove={() => removeItem('tasks', task.id)}
            />
          ) : (
            <TaskItem
              key={task.id}
              item={task}
              onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
              onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
              showPriceInput={false}
              onRemove={() => removeItem('tasks', task.id)}
            />
          )
        ))}
      </Stack>

      <Typography
        variant="overline"
        sx={{
          ...sectionLabelSx,
          borderTop: '1px solid',
          borderColor: UI.border,
          pt: 2.5
        }}
      >
        Materials {formData.materials.length > 0 && `(${formData.materials.length})`}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          disablePortal
          slotProps={autocompleteSlotProps}
          options={availableMaterials}
          getOptionLabel={(option) => {
            const displayName = option.displayName || option.name || 'Material';
            const retail = resolveMaterialRetailPrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
            const wholesale = resolveMaterialWholesalePrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
            const shownPrice = formData.isWholesale && wholesale > 0 ? wholesale : retail;
            return `${displayName} - $${shownPrice.toFixed(2)}`;
          }}
          renderInput={(params) => (
            <TextField {...params} label="Add Material" size="small" />
          )}
          onChange={(e, value) => value && addMaterial(value)}
        />

        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: UI.border,
            borderRadius: 2,
            backgroundColor: UI.bgPanel,
            boxShadow: UI.shadow
          }}
        >
          <Typography variant="caption" sx={{ color: UI.textSecondary, fontWeight: 600, display: 'block', mb: 1 }}>
            Add Stuller Gemstone/Material
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
            <TextField
              label="Stuller SKU"
              value={stullerSku}
              onChange={(e) => setStullerSku(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
              placeholder="Enter Stuller item number..."
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
              size="small"
              sx={{
                minWidth: 80,
                flexShrink: 0,
                borderColor: UI.border,
                color: UI.textPrimary,
                backgroundColor: UI.bgCard
              }}
            >
              Add
            </LoadingButton>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Material will be added with markup applied.
          </Typography>
        </Box>

        {formData.materials.map(material => (
          <TaskItem
            key={material.id}
            item={material}
            onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
            onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
            onRemove={() => removeItem('materials', material.id)}
          />
        ))}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: UI.border, pt: 2.5, mb: 1.5 }}>
        <Typography variant="overline" sx={sectionLabelSx}>
          Custom Charges {formData.customLineItems.length > 0 && `(${formData.customLineItems.length})`}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => addCustomLineItem()}
          variant="outlined"
          size="small"
          sx={{ borderColor: UI.border, color: UI.textPrimary }}
        >
          Add
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Non-labor only: a part you sourced, a fee, a misc charge. For bench work that isn&apos;t in the catalog, add <strong>Custom labor</strong> under Tasks so it&apos;s priced from hours and credited to whoever does it.
      </Typography>
      <Stack spacing={1.5}>
        {formData.customLineItems.map(item => (
          <CustomLineItem
            key={item.id}
            item={item}
            onDescriptionChange={(desc) => updateItem('customLineItems', item.id, 'description', desc)}
            onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
            onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
            onRemove={() => removeItem('customLineItems', item.id)}
          />
        ))}
      </Stack>
    </FormSection>
  );
}

// Task/Process/Material item component
export function TaskItem({ item, onQuantityChange, onPriceChange, onRemove, showPriceInput = true }) {
  const unitPrice = toNumber(item.price);
  const lineTotal = unitPrice * (item.quantity || 1);

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: UI.border,
        borderRadius: 2,
        backgroundColor: UI.bgCard,
        boxShadow: UI.shadow
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle2" noWrap sx={{ color: UI.textPrimary, fontWeight: 600 }}>
                {item.title || item.displayName || item.name}
              </Typography>
              {item.isStullerItem && (
                <Chip label="Stuller" size="small" variant="outlined" sx={neutralChipSx} />
              )}
            </Stack>
            {item.description && (
              // display:block so noWrap's overflow-hidden actually clips — on the
              // default inline span the text bleeds past the card on phones.
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {item.description}
              </Typography>
            )}
            {item.isStullerItem && item.stullerData && (
              <Typography variant="caption" sx={{ color: UI.accent }} display="block">
                SKU {item.stullerData.itemNumber} · Stuller cost ${toNumber(item.stullerData.originalPrice).toFixed(2)}{item.stullerData.pricedAs ? ` · priced ${item.stullerData.pricedAs}` : ''}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onRemove} size="small" sx={{ color: UI.textSecondary }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="number"
            label="Qty"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 1)}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          {showPriceInput ? (
            <>
              <TextField
                type="number"
                label="Price"
                value={item.price}
                onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 90 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
                ${lineTotal.toFixed(2)}
              </Typography>
            </>
          ) : (
            <>
              <Box sx={{ minWidth: 88 }}>
                <Typography variant="caption" sx={{ color: UI.textMuted, display: 'block', lineHeight: 1.2 }}>
                  Price
                </Typography>
                <Typography variant="body2" sx={{ color: UI.textPrimary, fontWeight: 600 }}>
                  ${unitPrice.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
                ${lineTotal.toFixed(2)}
              </Typography>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

// Custom line item component
// Custom LABOR line (a task): description, per-unit hours, qty, and a price that defaults to
// the engine's hours × wage × markup but can be overridden (bulk discount). The override is
// flagged so a wholesale/metal re-price keeps it; the calculated figure stays visible beside it.
export function CustomLaborItem({ item, isWholesale, onChange, onRemove }) {
  const unitPrice = toNumber(item.price);
  const qty = Math.max(parseInt(item.quantity, 10) || 1, 1);
  const hours = toNumber(item.laborHours);
  const calculated = calculatedCustomLaborPrice(item, { isWholesale });
  const overridden = !!item.priceOverridden && calculated !== unitPrice;

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: UI.border,
        borderRadius: 2,
        backgroundColor: UI.bgCard,
        boxShadow: UI.shadow
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <TextField
            fullWidth
            label="Custom labor"
            value={item.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What was done (e.g. Laser weld)…"
            size="small"
          />
          <Chip label="Labor" size="small" variant="outlined" sx={{ mt: 0.5, borderColor: UI.border, color: UI.textSecondary }} />
          <IconButton onClick={onRemove} size="small" sx={{ color: UI.textSecondary }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          <TextField
            type="number"
            label="Qty"
            value={qty}
            onChange={(e) => onChange({ quantity: parseInt(e.target.value, 10) || 1 })}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            type="number"
            label="Hrs / unit"
            value={item.laborHours ?? 0}
            onChange={(e) => onChange({ laborHours: parseFloat(e.target.value) || 0 })}
            size="small"
            sx={{ width: 100 }}
            inputProps={{ min: 0, step: 0.05 }}
          />
          <TextField
            type="number"
            label="Price / unit"
            value={item.price ?? 0}
            onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
            size="small"
            sx={{ width: 110 }}
            inputProps={{ min: 0, step: 0.01 }}
            helperText={overridden ? `Calculated $${calculated.toFixed(2)} · discounted` : `${isWholesale ? 'Wholesale' : 'Retail'} from hours`}
          />
          <Box sx={{ ml: 'auto', textAlign: 'right' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
              ${(unitPrice * qty).toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: UI.textMuted, whiteSpace: 'nowrap' }}>
              {(hours * qty).toFixed(2)} hrs total
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

// Custom NON-labor charge (a sourced part, a fee, a misc charge). Never carries labor hours.
export function CustomLineItem({
  item,
  onDescriptionChange,
  onQuantityChange,
  onPriceChange,
  onRemove
}) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: UI.border,
        borderRadius: 2,
        backgroundColor: UI.bgCard,
        boxShadow: UI.shadow
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <TextField
            fullWidth
            label="Description"
            value={item.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Custom work description..."
            size="small"
          />
          <IconButton onClick={onRemove} size="small" sx={{ color: UI.textSecondary }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="number"
            label="Qty"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 1)}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            type="number"
            label="Price"
            value={item.price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            size="small"
            sx={{ width: 90 }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
            ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// Total cost card with rush job information
export function TotalCostCard({ formData, calculateTotalCost, adminSettings, viewerIsWholesaler = false }) {
  const [totalCost, setTotalCost] = React.useState(0);
  const isCompedRepair = Boolean(formData.compRepair || formData.includedWithSale);
  const [costBreakdown, setCostBreakdown] = React.useState({
    subtotal: 0,
    retailSubtotal: 0,
    laborHours: 0,
    laborCost: 0,
    averageLaborRate: 0,
    materialsBaseCost: 0,
    wholesalerMarkupAmount: 0,
    wholesalerMarkupPercent: 0,
    retailerMarkupAmount: 0,
    customCost: 0,
    wholesaleDiscount: 0,
    rushFee: 0,
    deliveryFee: 0,
    taxAmount: 0,
    suggestedRetailModifiers: 0,
    final: 0,
    retailFinal: 0
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const updateTotal = async () => {
      setLoading(true);
      try {
        const taskLaborHours = formData.tasks.reduce((sum, item) =>
          sum + (toNumber(item.laborHours ?? item.pricing?.totalLaborHours ?? item.pricing?.baseLaborHours) * (item.quantity || 1)), 0);
        const totalLaborHours = taskLaborHours;

        const taskLaborCost = formData.tasks.reduce((sum, item) =>
          sum + (toNumber(item.pricing?.laborCost ?? item.pricing?.weightedLaborCost) * (item.quantity || 1)), 0);
        const totalLaborCost = taskLaborCost;

        const taskMaterialsBaseCost = formData.tasks.reduce((sum, item) => {
          const pricing = item.pricing || {};
          const derivedBaseMaterials = Math.max(
            toNumber(pricing.baseCost) - toNumber(pricing.laborCost) - toNumber(pricing.toolDepreciationCost),
            0
          );
          const rawTaskMaterials = toNumber(
            pricing.baseMaterialsCost ??
            pricing.weightedBaseMaterialsCost ??
            pricing.totalProcessMaterialCost ??
            pricing.baseMaterialCost ??
            derivedBaseMaterials
          );

          return sum + (rawTaskMaterials * (item.quantity || 1));
        }, 0);
        const materialLineBaseCost = formData.materials.reduce((sum, item) =>
          sum + (resolveMaterialRawPortionBaseCost(item, formData.metalType, formData.karat, formData.goldColor) * (item.quantity || 1)), 0);
        const materialsBaseCost = taskMaterialsBaseCost + materialLineBaseCost;

        const tasksCost = formData.tasks.reduce((sum, item) =>
          sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
        const materialsCost = formData.materials.reduce((sum, item) =>
          sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
        const customCost = formData.customLineItems.reduce((sum, item) =>
          sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);

        const originalSubtotal = tasksCost + materialsCost + customCost;
        const retailSubtotal = [
          ...formData.tasks.map(t => toNumber(t.retailPrice ?? t.price) * (t.quantity || 1)),
          ...formData.materials.map(m => toNumber(m.retailPrice ?? m.price) * (m.quantity || 1)),
          ...formData.customLineItems.map(c => toNumber(c.price) * (c.quantity || 1))
        ].reduce((sum, v) => sum + v, 0);

        let currentTotal = originalSubtotal;
        let wholesaleDiscount = 0;
        let wholesalerMarkupAmount = 0;
        let wholesalerMarkupPercent = 0;
        let retailerMarkupAmount = 0;
        let rushFee = 0;
        let deliveryFee = 0;
        let taxAmount = 0;
        let suggestedRetailModifiers = 0;

        if (formData.isWholesale) {
          const costOfGoods = totalLaborCost + materialsBaseCost + customCost;
          wholesaleDiscount = Math.max(Math.round((retailSubtotal - originalSubtotal) * 100) / 100, 0);
          wholesalerMarkupAmount = Math.max(
            Math.round((originalSubtotal - costOfGoods) * 100) / 100,
            0
          );
          wholesalerMarkupPercent = costOfGoods > 0
            ? Math.round((wholesalerMarkupAmount / costOfGoods) * 1000) / 10
            : 0;
          retailerMarkupAmount = Math.max(
            Math.round((retailSubtotal - originalSubtotal) * 100) / 100,
            0
          );
        }

        let retailCurrentTotal = retailSubtotal;
        if (formData.isRush) {
          retailCurrentTotal *= adminSettings.rushMultiplier;
        }
        if (formData.includeDelivery) {
          retailCurrentTotal += adminSettings.deliveryFee;
        }
        if (formData.includeTax) {
          retailCurrentTotal += retailCurrentTotal * adminSettings.taxRate;
        }
        suggestedRetailModifiers = Math.max(Math.round((retailCurrentTotal - retailSubtotal) * 100) / 100, 0);

        if (formData.isRush) {
          const beforeRush = currentTotal;
          currentTotal *= adminSettings.rushMultiplier;
          rushFee = currentTotal - beforeRush;
        }

        if (formData.includeDelivery) {
          deliveryFee = adminSettings.deliveryFee;
          currentTotal += deliveryFee;
        }

        if (formData.includeTax && !formData.isWholesale) {
          taxAmount = currentTotal * adminSettings.taxRate;
          currentTotal += taxAmount;
        }

        setCostBreakdown({
          subtotal: originalSubtotal,
          retailSubtotal,
          laborHours: totalLaborHours,
          laborCost: totalLaborCost,
          averageLaborRate: totalLaborHours > 0 ? (totalLaborCost / totalLaborHours) : 0,
          materialsBaseCost,
          wholesalerMarkupAmount,
          wholesalerMarkupPercent,
          retailerMarkupAmount,
          customCost,
          wholesaleDiscount,
          rushFee,
          deliveryFee,
          taxAmount,
          suggestedRetailModifiers,
          final: currentTotal,
          retailFinal: retailCurrentTotal
        });

        const cost = await calculateTotalCost();
        setTotalCost(cost);
      } catch (error) {
        console.error('Error calculating total cost:', error);
        setTotalCost(0);
      } finally {
        setLoading(false);
      }
    };

    updateTotal();
  }, [formData.tasks, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, calculateTotalCost, adminSettings]);

  return (
    <FormSection title={formData.isWholesale ? 'Pricing Summary' : 'Total Cost'} subtitle="Review the final pricing before saving the repair">
      <Stack spacing={2}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: UI.textHeader,
              mt: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}
          >
            {isCompedRepair ? (
              '$0.00'
            ) : loading ? (
              <Box component="span" sx={{ color: UI.textSecondary, fontSize: '0.7em' }}>Calculating...</Box>
            ) : (
              `$${totalCost.toFixed(2)}`
            )}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
            {isCompedRepair && (
              <Chip size="small" label="Comped / included with sale" sx={successChipSx} />
            )}
            {formData.isWholesale && (
              <Chip label="Wholesale Pricing" variant="outlined" size="small" sx={neutralChipSx} />
            )}
            {formData.isRush && (
              <Chip label={`Rush (${adminSettings.rushMultiplier}x)`} variant="outlined" size="small" sx={neutralChipSx} />
            )}
            {formData.includeDelivery && (
              <Chip label={`Delivery (+$${adminSettings.deliveryFee.toFixed(2)})`} variant="outlined" size="small" sx={neutralChipSx} />
            )}
            {formData.includeTax && !formData.isWholesale && (
              <Chip label={`Tax (+${(adminSettings.taxRate * 100).toFixed(2)}%)`} variant="outlined" size="small" sx={neutralChipSx} />
            )}
          </Stack>
        </Box>

        {!loading && formData.isWholesale && costBreakdown.retailSubtotal > 0 && (
          <Box sx={{ p: 2, backgroundColor: UI.bgCard, borderRadius: 2, border: '1px solid', borderColor: UI.border }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: UI.textPrimary }}>
              Wholesaler Pricing
            </Typography>
            <Stack spacing={0.75}>
              {/* What EFD invoices the wholesaler */}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">{viewerIsWholesaler ? 'What you pay:' : 'What they pay you:'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: UI.textPrimary }}>
                  ${costBreakdown.final.toFixed(2)}
                </Typography>
              </Stack>
              <Divider sx={{ borderColor: UI.border, my: 0.25 }} />
              {/* Suggested retail breakdown for the wholesaler's reference */}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Suggested retail (pre-tax):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: UI.accent }}>
                  ${costBreakdown.retailSubtotal.toFixed(2)}
                </Typography>
              </Stack>
              {costBreakdown.suggestedRetailModifiers > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {formData.includeTax && !formData.isRush && !formData.includeDelivery && adminSettings?.taxRate > 0
                      ? `+ Tax (${Math.round(adminSettings.taxRate * 1000) / 10}%):`
                      : '+ Tax & fees:'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: UI.accent }}>
                    +${costBreakdown.suggestedRetailModifiers.toFixed(2)}
                  </Typography>
                </Stack>
              )}
              {costBreakdown.retailFinal > costBreakdown.retailSubtotal && (
                <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: UI.textPrimary }}>Suggested total to customer:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: UI.accent }}>
                    ${costBreakdown.retailFinal.toFixed(2)}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        {!loading && formData.isWholesale && costBreakdown.subtotal > 0 && (
          <Box sx={{ p: 2, backgroundColor: UI.bgCard, borderRadius: 2, border: '1px solid', borderColor: UI.border }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: UI.textPrimary }}>
              Wholesale Breakdown
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="body2" color="text.secondary">
                  Labor
                  {costBreakdown.laborHours > 0 && (
                    <Box component="span" sx={{ display: 'block', color: UI.textMuted, fontSize: '0.85em', mt: 0.25 }}>
                      {costBreakdown.laborHours.toFixed(2)} hrs @ ${costBreakdown.averageLaborRate.toFixed(2)}/hr
                    </Box>
                  )}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                  ${costBreakdown.laborCost.toFixed(2)}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Material Cost
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                  ${costBreakdown.materialsBaseCost.toFixed(2)}
                </Typography>
              </Stack>

              {costBreakdown.customCost > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Additional Custom Charges
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                    ${costBreakdown.customCost.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                <Typography variant="body2">
                  Wholesaler Markup {costBreakdown.wholesalerMarkupPercent > 0 ? `(${costBreakdown.wholesalerMarkupPercent.toFixed(1)}% on COG)` : ''}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  +${costBreakdown.wholesalerMarkupAmount.toFixed(2)}
                </Typography>
              </Stack>

              <Divider sx={{ my: 0.5, borderColor: UI.border }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontWeight: 600, color: UI.textPrimary }}>
                  Wholesale Subtotal
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: UI.textHeader }}>
                  ${costBreakdown.subtotal.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {!loading && costBreakdown.subtotal > 0 && (
          <Box sx={{ p: 2, backgroundColor: UI.bgCard, borderRadius: 2, border: '1px solid', borderColor: UI.border }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: UI.textPrimary }}>
              Cost Breakdown
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  {formData.isWholesale ? 'Services & Materials (Wholesale):' : 'Services & Materials:'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                  ${costBreakdown.subtotal.toFixed(2)}
                </Typography>
              </Stack>

              {formData.isWholesale && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Services & Materials (Retail):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${costBreakdown.retailSubtotal.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.isWholesale && costBreakdown.wholesaleDiscount > 0 && (
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ color: UI.accent }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2">Difference from suggested retail:</Typography>
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Wholesale Pricing</Typography>
                            <Typography variant="caption" display="block">Wholesale total reflects the direct charge for this repair.</Typography>
                            <Typography variant="caption" display="block">Suggested retail reflects the store&apos;s configured markup and tax settings.</Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: UI.textMuted }}>Set one markup and tax rate from Account Settings.</Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 14, cursor: 'help' }} />
                    </Tooltip>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    -${costBreakdown.wholesaleDiscount.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.isRush && costBreakdown.rushFee > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Rush Job Fee ({adminSettings.rushMultiplier}x):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    +${costBreakdown.rushFee.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.includeDelivery && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Delivery Fee:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    +${costBreakdown.deliveryFee.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.includeTax && !formData.isWholesale && costBreakdown.taxAmount > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Tax ({(adminSettings.taxRate * 100).toFixed(2)}%):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    +${costBreakdown.taxAmount.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.isWholesale && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.textSecondary }}>
                  <Typography variant="body2">Tax (Wholesale Exempt):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    $0.00
                  </Typography>
                </Stack>
              )}

              <Divider sx={{ my: 1, borderColor: UI.border }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1" sx={{ fontWeight: 600, color: UI.textPrimary }}>
                  Final Total:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: UI.textHeader, fontSize: '1.1em' }}>
                  ${costBreakdown.final.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {!formData.isWholesale && (formData.isRush || formData.includeDelivery || (formData.includeTax && !formData.isWholesale)) && (
          <Typography variant="body2" color="text.secondary">
            {[
              formData.isRush && 'rush job markup',
              formData.includeDelivery && 'delivery fee',
              (formData.includeTax && !formData.isWholesale) && 'tax'
            ].filter(Boolean).length > 1
              ? `Price includes: ${[
                  formData.isRush && 'rush job markup',
                  formData.includeDelivery && 'delivery fee',
                  (formData.includeTax && !formData.isWholesale) && 'tax'
                ].filter(Boolean).join(', ')}`
              : formData.isRush
              ? 'Price includes rush job markup'
              : formData.includeDelivery
              ? 'Price includes delivery fee'
              : 'Price includes tax'
            }
          </Typography>
        )}
      </Stack>
    </FormSection>
  );
}
