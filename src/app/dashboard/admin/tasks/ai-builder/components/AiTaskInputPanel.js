'use client';
import React, { useState, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Card, CardContent, Chip,
  LinearProgress, Grid, Stack, Divider, Collapse
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

const CONFIDENCE_COLOR = (n) => n >= 80 ? 'success' : n >= 55 ? 'warning' : 'error';

export default function AiTaskInputPanel({ availableProcesses = [], onApplySuggestions }) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [showMissing, setShowMissing] = useState(false);

  const handleAnalyze = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setLoading(true);
    setError('');
    setSuggestions(null);

    try {
      const res = await fetch('/api/ai/build-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: text,
          processes: availableProcesses.slice(0, 80).map(p => ({
            _id: p._id,
            displayName: p.displayName || p.name,
            category: p.category,
            laborHours: p.laborHours
          }))
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'AI analysis failed');
      setSuggestions(data.data?.task || null);
    } catch (err) {
      setError(err.message || 'Failed to analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [inputText, availableProcesses]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleAnalyze();
  };

  const handleApply = () => {
    if (suggestions && onApplySuggestions) onApplySuggestions(suggestions);
  };

  const hasMatches = suggestions && Array.isArray(suggestions.matchedProcesses) && suggestions.matchedProcesses.length > 0;
  const hasMissing = suggestions && Array.isArray(suggestions.missingProcesses) && suggestions.missingProcesses.length > 0;

  return (
    <Box sx={{ mb: 3 }}>
      <Card variant="outlined" sx={{ borderColor: 'primary.light', bgcolor: 'action.hover' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesomeIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
              Describe Your Task (AI-Assisted)
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            placeholder="e.g. Ring sizing up 2 sizes with pave accent stones that need to be reset. Yellow gold 14k band."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="outlined"
            sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1 }}
            disabled={loading}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Ctrl+Enter to analyze</Typography>
            <LoadingButton
              variant="contained"
              size="small"
              loading={loading}
              startIcon={<AutoAwesomeIcon />}
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
            >
              Analyze with AI
            </LoadingButton>
          </Box>

          {loading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

          {error && (
            <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>

      {suggestions && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">AI Task Suggestions</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">Confidence</Typography>
                <Box sx={{ width: 80 }}>
                  <LinearProgress
                    variant="determinate"
                    value={suggestions.confidence || 0}
                    color={CONFIDENCE_COLOR(suggestions.confidence || 0)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Typography variant="caption" fontWeight="bold">
                  {suggestions.confidence || 0}%
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Suggested Title</Typography>
                <Typography variant="body2" fontWeight="bold">{suggestions.title || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="body2">{suggestions.category || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Skill Level</Typography>
                <Typography variant="body2">{suggestions.suggestedSkillLevel || '—'}</Typography>
              </Grid>
              {suggestions.description && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{suggestions.description}</Typography>
                </Grid>
              )}
            </Grid>

            {hasMatches && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                  MATCHED PROCESSES ({suggestions.matchedProcesses.length})
                </Typography>
                <Stack spacing={0.5}>
                  {suggestions.matchedProcesses.map((mp, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.75, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">{mp.processName}</Typography>
                        {mp.reason && <Typography variant="caption" color="text.secondary">{mp.reason}</Typography>}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {mp.quantity > 1 && <Chip label={`×${mp.quantity}`} size="small" />}
                        <Chip label={`${mp.confidence}%`} size="small" color="success" />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {hasMissing && (
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="text"
                  color="warning"
                  endIcon={showMissing ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowMissing(v => !v)}
                >
                  {suggestions.missingProcesses.length} suggested new process{suggestions.missingProcesses.length > 1 ? 'es' : ''} not in catalog
                </Button>
                <Collapse in={showMissing}>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {suggestions.missingProcesses.map((mp, i) => (
                      <Box key={i} sx={{ p: 0.75, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                        <Typography variant="body2" fontWeight="medium">{mp.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{mp.reason}</Typography>
                        {mp.suggestedCategory && (
                          <Chip label={mp.suggestedCategory} size="small" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            )}

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" size="small" onClick={handleApply}>
                Apply Suggestions to Form ↓
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
