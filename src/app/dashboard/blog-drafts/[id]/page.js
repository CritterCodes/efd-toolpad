'use client';

import React, { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const C = {
  bg: '#15181D',
  card: '#1A1D23',
  cardAlt: '#1F232A',
  border: '#2A2F38',
  text: '#D1D5DB',
  muted: '#9CA3AF',
  accent: '#D4AF37',
  success: '#22C55E',
};

export default function BlogDraftPage({ params }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [draft, setDraft] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [published, setPublished] = useState(null);
  const [showDraft, setShowDraft] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/auth/signin');
      return;
    }
    fetchDraft();
  }, [session, status]);

  async function fetchDraft() {
    try {
      const res = await fetch(`/api/admin/blog-drafts/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load draft');
      setDraft(data.draft);
      const initial = {};
      (data.draft.questionnaire || []).forEach((q) => {
        initial[q.id] = '';
      });
      setAnswers(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const unanswered = (draft.questionnaire || []).filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      setError(`Please answer all questions before submitting (${unanswered.length} remaining)`);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const answersPayload = (draft.questionnaire || []).map((q) => ({
        questionId: q.id,
        context: q.context,
        question: q.question,
        answer: answers[q.id].trim(),
      }));

      const res = await fetch(`/api/admin/blog-drafts/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setPublished(data.slug);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;
  const totalCount = draft?.questionnaire?.length ?? 0;

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  if (published) {
    return (
      <Box sx={{ p: 3, backgroundColor: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ backgroundColor: C.card, border: `1px solid ${C.success}44`, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <CheckCircleIcon sx={{ color: C.success, fontSize: 56, mb: 2 }} />
            <Typography variant="h6" sx={{ color: C.text, fontWeight: 600, mb: 1 }}>
              Article Published
            </Typography>
            <Typography sx={{ color: C.muted, mb: 3 }}>
              Your expertise has been woven in and the article is live on the blog.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                href={`https://shop.engelfinedesign.com/blog/${published}`}
                target="_blank"
                sx={{ backgroundColor: C.accent, color: '#000', '&:hover': { backgroundColor: '#B8932A' } }}
              >
                View Article
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/dashboard/blog-drafts')}
                sx={{ borderColor: C.border, color: C.muted }}
              >
                Back to Drafts
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error && !draft) {
    return (
      <Box sx={{ p: 3, backgroundColor: C.bg, minHeight: '100vh' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/blog-drafts')}
          sx={{ color: C.muted, minWidth: 0 }}
        >
          Drafts
        </Button>
      </Box>

      <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, mb: 0.5 }}>
        {draft?.title}
      </Typography>
      <Typography variant="body2" sx={{ color: C.muted, mb: 3 }}>
        {draft?.excerpt}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={draft?.category} size="small" sx={{ backgroundColor: '#1F232A', color: C.muted }} />
        <Chip label={`${draft?.wordCount?.toLocaleString()} words`} size="small" sx={{ backgroundColor: '#1F232A', color: C.muted }} />
        <Chip
          label={`${answeredCount} / ${totalCount} answered`}
          size="small"
          sx={{
            backgroundColor: answeredCount === totalCount ? '#16302B' : '#1F232A',
            color: answeredCount === totalCount ? C.success : C.muted,
            border: answeredCount === totalCount ? `1px solid ${C.success}44` : 'none',
          }}
        />
      </Box>

      {/* Draft preview toggle */}
      <Card sx={{ backgroundColor: C.card, border: `1px solid ${C.border}`, mb: 3 }}>
        <Box
          sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowDraft((v) => !v)}
        >
          <Typography sx={{ color: C.muted, fontSize: '0.875rem', fontWeight: 500 }}>
            AI Draft Preview (read before answering)
          </Typography>
          {showDraft ? <ExpandLessIcon sx={{ color: C.muted }} /> : <ExpandMoreIcon sx={{ color: C.muted }} />}
        </Box>
        {showDraft && (
          <>
            <Divider sx={{ borderColor: C.border }} />
            <CardContent>
              <Box
                component="pre"
                sx={{
                  color: C.muted,
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                  m: 0,
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
              >
                {draft?.content}
              </Box>
            </CardContent>
          </>
        )}
      </Card>

      {/* Questions */}
      <Typography variant="h6" sx={{ color: C.text, fontWeight: 600, mb: 2 }}>
        Your Answers
      </Typography>
      <Typography variant="body2" sx={{ color: C.muted, mb: 3 }}>
        Answer from your real experience at the bench. Your answers get woven directly into the article — the more specific, the better.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {(draft?.questionnaire || []).map((q, i) => (
          <Card
            key={q.id}
            sx={{
              backgroundColor: C.card,
              border: `1px solid ${answers[q.id]?.trim() ? C.accent + '44' : C.border}`,
              transition: 'border-color 0.15s',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5 }}>
                <Typography sx={{ color: C.accent, fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, mt: '2px' }}>
                  Q{i + 1}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: C.text, fontWeight: 500, mb: 0.5, fontSize: '0.95rem' }}>
                    {q.question}
                  </Typography>
                  <Chip
                    label={q.context}
                    size="small"
                    sx={{ backgroundColor: '#1F232A', color: C.muted, fontSize: '0.72rem', mb: 1.5 }}
                  />
                </Box>
              </Box>
              <TextField
                multiline
                minRows={3}
                maxRows={10}
                fullWidth
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: C.cardAlt,
                    color: C.text,
                    fontSize: '0.9rem',
                    '& fieldset': { borderColor: C.border },
                    '&:hover fieldset': { borderColor: C.accent + '66' },
                    '&.Mui-focused fieldset': { borderColor: C.accent },
                  },
                  '& .MuiInputBase-input::placeholder': { color: C.muted, opacity: 0.7 },
                }}
              />
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Submit */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          endIcon={submitting ? <CircularProgress size={18} sx={{ color: '#000' }} /> : <SendIcon />}
          disabled={submitting || answeredCount < totalCount}
          onClick={handleSubmit}
          sx={{
            backgroundColor: C.accent,
            color: '#000',
            fontWeight: 600,
            px: 4,
            '&:hover': { backgroundColor: '#B8932A' },
            '&:disabled': { backgroundColor: '#2A2F38', color: C.muted },
          }}
        >
          {submitting ? 'Enriching & Publishing…' : `Publish with My Answers`}
        </Button>
      </Box>
    </Box>
  );
}
