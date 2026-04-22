'use client';

import React, { useState } from 'react';
import {
  Grid,
  Typography,
  TextField,
  Chip,
  Box,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const REQUIRED_INFO_OPTIONS = [
  { key: 'metalType',       label: 'Metal Type' },
  { key: 'karat',           label: 'Karat' },
  { key: 'currentRingSize', label: 'Current Ring Size' },
  { key: 'desiredRingSize', label: 'Desired Ring Size' },
  { key: 'stoneCount',      label: 'Stone Count' },
  { key: 'stoneType',       label: 'Stone Type' },
  { key: 'chainLength',     label: 'Chain Length' },
  { key: 'engraving',       label: 'Engraving Text' },
];

export function AiMetaSection({ formData, setFormData }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState('');
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [symptomInput, setSymptomInput]   = useState('');
  const [pairsWithInput, setPairsWithInput] = useState('');

  const aiMeta = formData.aiMeta || {};

  const setAiMeta = (patch) =>
    setFormData((prev) => ({
      ...prev,
      aiMeta: { ...prev.aiMeta, ...patch },
    }));

  // --- Symptoms tag input ---
  const addSymptom = () => {
    const val = symptomInput.trim();
    if (!val) return;
    const existing = aiMeta.symptoms || [];
    if (!existing.includes(val)) setAiMeta({ symptoms: [...existing, val] });
    setSymptomInput('');
  };
  const removeSymptom = (s) =>
    setAiMeta({ symptoms: (aiMeta.symptoms || []).filter((x) => x !== s) });

  // --- Pairs-with tag input ---
  const addPairsWith = () => {
    const val = pairsWithInput.trim();
    if (!val) return;
    const existing = aiMeta.pairsWith || [];
    if (!existing.includes(val)) setAiMeta({ pairsWith: [...existing, val] });
    setPairsWithInput('');
  };
  const removePairsWith = (s) =>
    setAiMeta({ pairsWith: (aiMeta.pairsWith || []).filter((x) => x !== s) });

  // --- requiredInfo checkboxes ---
  const toggleRequiredInfo = (key) => {
    const current = aiMeta.requiredInfo || [];
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setAiMeta({ requiredInfo: updated });
  };

  // --- Auto-generate ---
  const startCooldown = (secs = 3) => {
    setCooldownSecs(secs);
    const interval = setInterval(() => {
      setCooldownSecs((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGenerate = async () => {
    setGenError('');
    if (!formData.title) {
      setGenError('Add a task title first.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-ai-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setFormData((prev) => ({ ...prev, aiMeta: json.data.aiMeta }));
    } catch (err) {
      setGenError(err.message || 'Generation failed.');
    } finally {
      setGenerating(false);
      startCooldown(3);
    }
  };

  return (
    <Grid item xs={12}>
      <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: open ? 2 : 0, cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}
        >
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
              ✨ AI Context
            </Typography>
            {!open && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, mt: 0.25 }}>
                Tap to configure chatbot suggestions
              </Typography>
            )}
          </Box>
          <IconButton size="small">
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={open}>
          <Grid container spacing={2}>

            {/* Auto-generate button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={generating ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                  onClick={handleGenerate}
                  disabled={generating || cooldownSecs > 0}
                >
                  {generating ? 'Generating...' : cooldownSecs > 0 ? `Wait ${cooldownSecs}s…` : 'Auto-fill with AI'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Uses the task title &amp; description to generate these fields automatically
                </Typography>
              </Box>
              {genError && <Alert severity="error" sx={{ mt: 1 }}>{genError}</Alert>}
            </Grid>

            {/* When to use */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="When to use this task"
                value={aiMeta.whenToUse || ''}
                onChange={(e) => setAiMeta({ whenToUse: e.target.value })}
                multiline
                rows={3}
                placeholder="Describe exactly what a customer says or describes that should trigger this task. E.g. 'Customer says ring is too tight or too loose, wants to go up or down a size, or mentions the ring doesn't fit anymore.'"
                helperText="The AI reads this to decide whether to suggest this task based on the customer's description."
              />
            </Grid>

            {/* Symptoms / trigger phrases */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Customer Phrases (Symptoms)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Short phrases a customer might actually say that indicate this task
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSymptom(); } }}
                  placeholder="e.g. too tight, needs to be bigger..."
                  sx={{ flex: 1 }}
                />
                <Button variant="outlined" size="small" onClick={addSymptom}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(aiMeta.symptoms || []).map((s) => (
                  <Chip key={s} label={s} size="small" onDelete={() => removeSymptom(s)} />
                ))}
              </Box>
            </Grid>

            {/* Required info */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Required Information Before Quoting
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                The chatbot will ask for these before showing a price estimate
              </Typography>
              <FormGroup row>
                {REQUIRED_INFO_OPTIONS.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        size="small"
                        checked={(aiMeta.requiredInfo || []).includes(key)}
                        onChange={() => toggleRequiredInfo(key)}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>
            </Grid>

            {/* Never use when */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Never use when..."
                value={aiMeta.neverUseWhen || ''}
                onChange={(e) => setAiMeta({ neverUseWhen: e.target.value })}
                multiline
                rows={2}
                placeholder="E.g. Customer is asking about a bracelet or necklace — sizing only applies to rings."
                helperText="Conditions where this task looks relevant but shouldn't be applied."
              />
            </Grid>

            {/* Pairs with */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Commonly Paired With</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  value={pairsWithInput}
                  onChange={(e) => setPairsWithInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPairsWith(); } }}
                  placeholder="Task title..."
                  sx={{ flex: 1 }}
                />
                <Button variant="outlined" size="small" onClick={addPairsWith}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(aiMeta.pairsWith || []).map((s) => (
                  <Chip key={s} label={s} size="small" onDelete={() => removePairsWith(s)} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Tasks often done together — AI can suggest these proactively.
              </Typography>
            </Grid>

          </Grid>
        </Collapse>
      </Box>
    </Grid>
  );
}
