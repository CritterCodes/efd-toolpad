'use client';
import React, { useState } from 'react';
import {
  Box, Card, CardContent, CardHeader, TextField, Button, Alert,
  Typography, Chip, Grid, Divider, LinearProgress, Stack
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, Search as SearchIcon } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

const CONFIDENCE_COLOR = (c) => c >= 0.8 ? 'success' : c >= 0.6 ? 'warning' : 'error';

const SKILL_COLORS = { basic: 'default', standard: 'primary', advanced: 'warning', expert: 'error' };

export default function AiProcessInputPanel({ onApplySuggestions, onSearchStuller }) {
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState('');
  const [modelUsed, setModelUsed] = useState('');

  const handleAnalyze = async () => {
    const text = description.trim();
    if (!text) { setError('Describe the process first.'); return; }
    setAnalyzing(true);
    setError('');
    setSuggestions(null);

    try {
      const res = await fetch('/api/ai/build-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text })
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'AI analysis failed');
      setSuggestions(payload.data.process);
      setModelUsed(payload.data.model || '');
    } catch (err) {
      setError(err.message || 'Failed to analyze — try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalyze();
  };

  const handleApply = () => {
    if (suggestions && onApplySuggestions) onApplySuggestions(suggestions);
  };

  return (
    <Card elevation={2} sx={{ mb: 3, border: '2px solid', borderColor: 'primary.light' }}>
      <CardHeader
        avatar={<AutoAwesomeIcon color="primary" />}
        title="AI Process Builder"
        subheader="Describe the repair process in plain language — AI will generate the name, category, labor estimate, and material suggestions"
        sx={{ pb: 1 }}
      />
      <CardContent>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Describe the process"
          placeholder='e.g. "Carefully retip 4 worn prong tips on a yellow gold ring using hard solder and flux, then polish to blend"'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          helperText="Ctrl+Enter to analyze"
          sx={{ mb: 2 }}
        />
        <LoadingButton
          loading={analyzing}
          onClick={handleAnalyze}
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          disabled={!description.trim()}
        >
          Analyze with AI
        </LoadingButton>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {suggestions && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">AI Suggestions</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {modelUsed && <Chip label={modelUsed} size="small" variant="outlined" />}
                <Chip
                  label={`${Math.round(suggestions.confidence * 100)}% confidence`}
                  color={CONFIDENCE_COLOR(suggestions.confidence)}
                  size="small"
                />
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={suggestions.confidence * 100} color={CONFIDENCE_COLOR(suggestions.confidence)} sx={{ mb: 2, borderRadius: 1 }} />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Suggested Name</Typography>
                <Typography variant="h6">{suggestions.displayName}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Box><Chip label={suggestions.category} size="small" color="primary" /></Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">Skill Level</Typography>
                <Box><Chip label={suggestions.skillLevel} size="small" color={SKILL_COLORS[suggestions.skillLevel] || 'default'} /></Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">Labor Hours</Typography>
                <Typography variant="body1" fontWeight="bold">{suggestions.laborHours}h</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{suggestions.description}</Typography>
              </Grid>
            </Grid>

            {suggestions.suggestedMaterials?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Suggested Materials (click to search Stuller)
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {suggestions.suggestedMaterials.map((mat, i) => (
                    <Chip
                      key={i}
                      label={mat.name}
                      icon={<SearchIcon />}
                      size="small"
                      variant="outlined"
                      onClick={() => onSearchStuller && onSearchStuller(mat.searchQuery || mat.name)}
                      clickable
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {suggestions.metalCompatibility?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Metal Compatibility
                </Typography>
                <Stack direction="row" gap={1}>
                  {suggestions.metalCompatibility.map((m, i) => (
                    <Chip key={i} label={m} size="small" />
                  ))}
                </Stack>
              </Box>
            )}

            <Button variant="contained" color="success" onClick={handleApply} sx={{ mt: 1 }}>
              Apply These Suggestions to Form ↓
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
