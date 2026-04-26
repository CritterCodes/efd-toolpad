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
import { TaskFormSection, TASK_UI } from './taskBuilderUi';

const REQUIRED_INFO_OPTIONS = [
  { key: 'metalType', label: 'Metal Type' },
  { key: 'karat', label: 'Karat' },
  { key: 'currentRingSize', label: 'Current Ring Size' },
  { key: 'desiredRingSize', label: 'Desired Ring Size' },
  { key: 'stoneCount', label: 'Stone Count' },
  { key: 'stoneType', label: 'Stone Type' },
  { key: 'chainLength', label: 'Chain Length' },
  { key: 'engraving', label: 'Engraving Text' },
];

export function AiMetaSection({ formData, setFormData }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [symptomInput, setSymptomInput] = useState('');
  const [pairsWithInput, setPairsWithInput] = useState('');

  const aiMeta = formData.aiMeta || {};
  const setAiMeta = (patch) => setFormData((prev) => ({ ...prev, aiMeta: { ...prev.aiMeta, ...patch } }));

  const addTag = (key, value, setter) => {
    const next = value.trim();
    if (!next) return;
    const existing = aiMeta[key] || [];
    if (!existing.includes(next)) setAiMeta({ [key]: [...existing, next] });
    setter('');
  };

  const removeTag = (key, value) => setAiMeta({ [key]: (aiMeta[key] || []).filter((x) => x !== value) });

  const toggleRequiredInfo = (key) => {
    const current = aiMeta.requiredInfo || [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setAiMeta({ requiredInfo: updated });
  };

  const startCooldown = (secs = 3) => {
    setCooldownSecs(secs);
    const interval = setInterval(() => {
      setCooldownSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
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
      <TaskFormSection title="AI Context" subtitle="Tune how the assistant recommends and qualifies this task.">
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: open ? 2 : 0, cursor: 'pointer' }}
          onClick={() => setOpen((value) => !value)}
        >
          <Box>
            <Typography variant="body2" sx={{ color: TASK_UI.textPrimary, fontWeight: 700 }}>
              Assistant Guidance
            </Typography>
            {!open && (
              <Typography variant="caption" sx={{ color: TASK_UI.textSecondary }}>
                Expand to configure recommendation prompts and required intake data.
              </Typography>
            )}
          </Box>
          <IconButton size="small" sx={{ color: TASK_UI.textSecondary }}>
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>

        <Collapse in={open}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={generating ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                  onClick={handleGenerate}
                  disabled={generating || cooldownSecs > 0}
                  sx={{ borderColor: TASK_UI.border, color: TASK_UI.textPrimary, backgroundColor: TASK_UI.bgCard }}
                >
                  {generating ? 'Generating...' : cooldownSecs > 0 ? `Wait ${cooldownSecs}s...` : 'Auto-fill with AI'}
                </Button>
                <Typography variant="caption" sx={{ color: TASK_UI.textSecondary }}>
                  Uses the task title and description to generate recommendation guidance.
                </Typography>
              </Box>
              {genError && <Alert severity="error" sx={{ mt: 1 }}>{genError}</Alert>}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="When to use this task"
                value={aiMeta.whenToUse || ''}
                onChange={(e) => setAiMeta({ whenToUse: e.target.value })}
                multiline
                rows={3}
                placeholder="Describe the customer request or condition that should trigger this task."
                helperText="The assistant reads this to decide when to suggest the task."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Customer Phrases
              </Typography>
              <Typography variant="caption" sx={{ color: TASK_UI.textSecondary, display: 'block', mb: 1 }}>
                Short phrases a customer might actually use.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" value={symptomInput} onChange={(e) => setSymptomInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('symptoms', symptomInput, setSymptomInput); } }} placeholder="e.g. too tight, needs to be bigger..." sx={{ flex: 1 }} />
                <Button variant="outlined" size="small" onClick={() => addTag('symptoms', symptomInput, setSymptomInput)} sx={{ borderColor: TASK_UI.border, color: TASK_UI.textPrimary, backgroundColor: TASK_UI.bgCard }}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(aiMeta.symptoms || []).map((item) => (
                  <Chip key={item} label={item} size="small" variant="outlined" onDelete={() => removeTag('symptoms', item)} />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Required Information Before Quoting
              </Typography>
              <Typography variant="caption" sx={{ color: TASK_UI.textSecondary, display: 'block', mb: 1 }}>
                The assistant will ask for these values before showing a quote.
              </Typography>
              <FormGroup row>
                {REQUIRED_INFO_OPTIONS.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={<Checkbox size="small" checked={(aiMeta.requiredInfo || []).includes(key)} onChange={() => toggleRequiredInfo(key)} />}
                    label={label}
                  />
                ))}
              </FormGroup>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Never use when..."
                value={aiMeta.neverUseWhen || ''}
                onChange={(e) => setAiMeta({ neverUseWhen: e.target.value })}
                multiline
                rows={2}
                placeholder="Conditions where this task looks relevant but should not be used."
                helperText="Used to prevent false-positive recommendations."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Commonly Paired With
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" value={pairsWithInput} onChange={(e) => setPairsWithInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('pairsWith', pairsWithInput, setPairsWithInput); } }} placeholder="Task title..." sx={{ flex: 1 }} />
                <Button variant="outlined" size="small" onClick={() => addTag('pairsWith', pairsWithInput, setPairsWithInput)} sx={{ borderColor: TASK_UI.border, color: TASK_UI.textPrimary, backgroundColor: TASK_UI.bgCard }}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(aiMeta.pairsWith || []).map((item) => (
                  <Chip key={item} label={item} size="small" variant="outlined" onDelete={() => removeTag('pairsWith', item)} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Collapse>
      </TaskFormSection>
    </Grid>
  );
}
