'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArticleIcon from '@mui/icons-material/Article';

const C = {
  bg: '#0F1115',
  surface: '#15181D',
  card: '#1A1D23',
  cardAlt: '#1F232A',
  border: '#2A2F38',
  text: '#E5E7EB',
  muted: '#6B7280',
  accent: '#D4AF37',
  accentDim: '#D4AF3722',
  success: '#22C55E',
  successDim: '#22C55E18',
  userBubble: '#1E2530',
};

function AiBubble({ children, isLast }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, opacity: 1, animation: isLast ? 'fadeSlideIn 0.25s ease' : 'none', '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: C.accentDim, border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.5 }}>
        <AutoAwesomeIcon sx={{ fontSize: 16, color: C.accent }} />
      </Box>
      <Box sx={{ maxWidth: '75%' }}>
        {children}
      </Box>
    </Box>
  );
}

function UserBubble({ text, isLast }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, animation: isLast ? 'fadeSlideIn 0.2s ease' : 'none', '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
      <Box sx={{ maxWidth: '75%', backgroundColor: C.userBubble, border: `1px solid ${C.border}`, borderRadius: '16px 16px 4px 16px', px: 2, py: 1.5 }}>
        <Typography sx={{ color: C.text, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

function QuestionBubble({ question, isLast }) {
  return (
    <Box sx={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: '4px 16px 16px 16px', px: 2, py: 1.5, mb: 0.5 }}>
      {question.context && (
        <Chip label={question.context} size="small" sx={{ backgroundColor: C.cardAlt, color: C.muted, fontSize: '0.7rem', mb: 1, height: 20 }} />
      )}
      <Typography sx={{ color: C.text, fontSize: '0.925rem', lineHeight: 1.6 }}>
        {question.question}
      </Typography>
    </Box>
  );
}

export default function BlogDraftChatPage({ params }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [draft, setDraft] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [enriched, setEnriched] = useState(false);
  const [showDraft, setShowDraft] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) { router.replace('/auth/signin'); return; }
    fetchDraft();
  }, [session, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchDraft() {
    try {
      const res = await fetch(`/api/admin/blog-drafts/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load draft');

      const d = data.draft;
      setDraft(d);

      const questions = d.questionnaire || [];
      const existing = d.answers || [];
      setSavedAnswers(existing);

      // Build chat history from saved answers
      const msgs = [];

      // Opening message
      msgs.push({
        type: 'ai',
        variant: 'intro',
        text: `I've drafted "${d.title}". I have ${questions.length} questions — your real shop experience is what makes this article non-generic. Answer however you'd naturally explain it to a customer.`,
      });

      // Replay answered questions
      let resumeIndex = 0;
      for (let i = 0; i < questions.length; i++) {
        const saved = existing.find((a) => a.questionId === questions[i].id);
        msgs.push({ type: 'ai', variant: 'question', question: questions[i] });
        if (saved) {
          msgs.push({ type: 'user', text: saved.answer });
          resumeIndex = i + 1;
        } else {
          break;
        }
      }

      // If all answered, add done message
      if (resumeIndex >= questions.length && questions.length > 0) {
        msgs.push({ type: 'ai', variant: 'done' });
      }

      setMessages(msgs);
      setCurrentQuestionIndex(resumeIndex);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function saveAnswers(updatedAnswers) {
    setSaving(true);
    try {
      await fetch(`/api/admin/blog-drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: updatedAnswers }),
      });
    } catch (err) {
      console.error('Save failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSend() {
    const text = currentInput.trim();
    if (!text || !draft) return;

    const questions = draft.questionnaire || [];
    const q = questions[currentQuestionIndex];
    if (!q) return;

    const newAnswer = {
      questionId: q.id,
      context: q.context,
      question: q.question,
      answer: text,
    };

    const updatedAnswers = [...savedAnswers.filter((a) => a.questionId !== q.id), newAnswer];
    setSavedAnswers(updatedAnswers);
    setCurrentInput('');

    const nextIndex = currentQuestionIndex + 1;
    const isLast = nextIndex >= questions.length;

    setMessages((prev) => {
      const next = [...prev, { type: 'user', text, isNew: true }];
      if (isLast) {
        next.push({ type: 'ai', variant: 'done', isNew: true });
      } else {
        next.push({ type: 'ai', variant: 'question', question: questions[nextIndex], isNew: true });
      }
      return next;
    });

    setCurrentQuestionIndex(nextIndex);
    saveAnswers(updatedAnswers);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/blog-drafts/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: savedAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setEnriched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const questions = draft?.questionnaire || [];
  const allAnswered = currentQuestionIndex >= questions.length && questions.length > 0;
  const progress = questions.length ? Math.round((currentQuestionIndex / questions.length) * 100) : 0;

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg }}>
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  if (enriched) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: C.bg }}>
        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: C.successDim, border: `1px solid ${C.success}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CheckCircleIcon sx={{ color: C.success, fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ color: C.text, fontWeight: 600, mb: 1 }}>Answers woven in</Typography>
          <Typography sx={{ color: C.muted, mb: 3, fontSize: '0.9rem' }}>Your experience has been integrated throughout the article. Review it, make any edits, then publish.</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            <Box component="button" onClick={() => router.push(`/dashboard/blogs/${id}`)}
              sx={{ px: 2.5, py: 1, backgroundColor: C.accent, color: '#000', border: 'none', borderRadius: 1.5, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', '&:hover': { backgroundColor: '#B8932A' } }}>
              Review & Publish →
            </Box>
            <Box component="button" onClick={() => router.push('/dashboard/blog-drafts')}
              sx={{ px: 2.5, py: 1, backgroundColor: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 1.5, fontSize: '0.875rem', cursor: 'pointer', '&:hover': { borderColor: C.muted } }}>
              Back to Drafts
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: C.bg }}>

      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => router.push('/dashboard/blog-drafts')} size="small" sx={{ color: C.muted }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: C.text, fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {draft?.title}
          </Typography>
          <Typography sx={{ color: C.muted, fontSize: '0.75rem' }}>
            {allAnswered ? 'All questions answered' : `Question ${Math.min(currentQuestionIndex + 1, questions.length)} of ${questions.length}`}
          </Typography>
        </Box>
        <Tooltip title="View AI draft">
          <IconButton size="small" onClick={() => setShowDraft((v) => !v)} sx={{ color: showDraft ? C.accent : C.muted }}>
            <ArticleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Progress bar */}
      <Box sx={{ height: 2, backgroundColor: C.border, flexShrink: 0 }}>
        <Box sx={{ height: '100%', backgroundColor: C.accent, width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </Box>

      {/* Draft panel (collapsible) */}
      {showDraft && (
        <Box sx={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface, maxHeight: '35vh', overflowY: 'auto', px: 3, py: 2, flexShrink: 0 }}>
          <Typography sx={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1.5 }}>AI Draft</Typography>
          <Typography component="pre" sx={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', m: 0 }}>
            {draft?.content}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 1, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2.5 }}>
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          if (msg.type === 'user') {
            return <UserBubble key={i} text={msg.text} isLast={isLast && msg.isNew} />;
          }
          if (msg.variant === 'intro') {
            return (
              <AiBubble key={i} isLast={isLast}>
                <Box sx={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: '4px 16px 16px 16px', px: 2, py: 1.5 }}>
                  <Typography sx={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.6 }}>{msg.text}</Typography>
                </Box>
              </AiBubble>
            );
          }
          if (msg.variant === 'question') {
            return (
              <AiBubble key={i} isLast={isLast && msg.isNew}>
                <QuestionBubble question={msg.question} />
              </AiBubble>
            );
          }
          if (msg.variant === 'done') {
            return (
              <AiBubble key={i} isLast={isLast}>
                <Box sx={{ backgroundColor: C.successDim, border: `1px solid ${C.success}33`, borderLeft: `3px solid ${C.success}`, borderRadius: '4px 16px 16px 16px', px: 2, py: 1.5 }}>
                  <Typography sx={{ color: C.text, fontSize: '0.925rem', lineHeight: 1.6, mb: 2 }}>
                    That's everything. I'll weave your answers throughout the article now. Once enriched, you'll review the full article, make any final edits, then publish.
                  </Typography>
                  <Box
                    component="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1, backgroundColor: submitting ? C.border : C.accent, color: submitting ? C.muted : '#000', border: 'none', borderRadius: 1.5, fontWeight: 600, fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background-color 0.15s', '&:hover:not(:disabled)': { backgroundColor: '#B8932A' } }}
                  >
                    {submitting ? <><CircularProgress size={14} sx={{ color: C.muted, mr: 0.5 }} /> Enriching article…</> : 'Enrich article with my answers →'}
                  </Box>
                </Box>
              </AiBubble>
            );
          }
          return null;
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      {!allAnswered && (
        <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: `1px solid ${C.border}`, backgroundColor: C.surface, flexShrink: 0 }}>
          {saving && (
            <Typography sx={{ color: C.muted, fontSize: '0.7rem', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={8} sx={{ color: C.muted }} /> Saving…
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <Box
              component="textarea"
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Answer from your experience… (Enter to send, Shift+Enter for new line)"
              rows={3}
              sx={{
                flex: 1, resize: 'none', backgroundColor: C.cardAlt, color: C.text, border: `1px solid ${C.border}`, borderRadius: 2, px: 2, py: 1.5, fontSize: '0.9rem', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none', '&:focus': { borderColor: C.accent }, '&::placeholder': { color: C.muted },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!currentInput.trim()}
              sx={{ width: 44, height: 44, backgroundColor: currentInput.trim() ? C.accent : C.cardAlt, color: currentInput.trim() ? '#000' : C.muted, borderRadius: 2, flexShrink: 0, '&:hover': { backgroundColor: currentInput.trim() ? '#B8932A' : C.cardAlt }, transition: 'background-color 0.15s', '&:disabled': { backgroundColor: C.cardAlt, color: C.muted } }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}
