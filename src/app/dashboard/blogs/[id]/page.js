'use client';

import React, { useEffect, useState, use, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import PublishIcon from '@mui/icons-material/Rocket';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/OpenInNew';

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
  info: '#3B82F6',
  userBubble: '#1E2530',
};

const STATUS_META = {
  pending_review: { label: 'Pending Q&A', color: '#F59E0B' },
  enriched:       { label: 'Awaiting Review', color: '#3B82F6' },
  published:      { label: 'Published', color: '#22C55E' },
};

function AiBubble({ children, isLast }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, animation: isLast ? 'fadeSlideIn 0.25s ease' : 'none', '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
      <Box sx={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: C.accentDim, border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
        <AutoAwesomeIcon sx={{ fontSize: 14, color: C.accent }} />
      </Box>
      <Box sx={{ maxWidth: '85%' }}>{children}</Box>
    </Box>
  );
}

function UserBubble({ text, isLast }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, animation: isLast ? 'fadeSlideIn 0.2s ease' : 'none', '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
      <Box sx={{ maxWidth: '85%', backgroundColor: C.userBubble, border: `1px solid ${C.border}`, borderRadius: '16px 16px 4px 16px', px: 2, py: 1.25 }}>
        <Typography sx={{ color: C.text, fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</Typography>
      </Box>
    </Box>
  );
}

export default function BlogReviewPage({ params }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '' });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) { router.replace('/auth/signin'); return; }
    fetchPost();
  }, [session, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchPost() {
    try {
      const res = await fetch(`/api/admin/blogs/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      const p = data.post;
      setPost(p);

      // Show enrichedContent for review; fall back to content for published posts
      const displayContent = p.enrichedContent || p.content || '';
      setContent(displayContent);

      setMessages([{
        type: 'ai',
        variant: 'intro',
        text: p.status === 'published'
          ? `This article is live at /blog/${p.slug}. Tell me what you'd like to change and I'll update the draft. You can republish when ready.`
          : `Here's your enriched article. Tell me anything you'd like to change — tighten a section, swap out a detail, fix the tone — and I'll rewrite it. When you're happy, hit Publish.`,
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const handleSend = useCallback(async () => {
    const instruction = input.trim();
    if (!instruction || editing) return;

    setInput('');
    setEditing(true);
    setError(null);

    const userMsg = { type: 'user', text: instruction, isNew: true };
    const thinkingMsg = { type: 'ai', variant: 'thinking', isNew: true };
    setMessages((prev) => [...prev, userMsg, thinkingMsg]);

    try {
      const res = await fetch(`/api/admin/blog-drafts/${id}/article-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');

      setContent(data.content);
      setMessages((prev) => [
        ...prev.filter((m) => m.variant !== 'thinking'),
        { type: 'ai', variant: 'done-edit', isNew: true },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.variant !== 'thinking'));
      setError(err.message);
    } finally {
      setEditing(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, editing, id]);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog-drafts/${id}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setPublished(data.slug);
      setPost((p) => ({ ...p, status: 'published' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: C.bg }}>
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  if (published) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: C.bg }}>
        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: C.successDim, border: `1px solid ${C.success}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CheckCircleIcon sx={{ color: C.success, fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ color: C.text, fontWeight: 600, mb: 1 }}>Article live</Typography>
          <Typography sx={{ color: C.muted, mb: 3, fontSize: '0.9rem' }}>The post is published and the site has been revalidated.</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            <Box component="a" href={`https://shop.engelfinedesign.com/blog/${published}`} target="_blank"
              sx={{ px: 2.5, py: 1, backgroundColor: C.accent, color: '#000', borderRadius: 1.5, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { backgroundColor: '#B8932A' } }}>
              View Article <LinkIcon sx={{ fontSize: 14 }} />
            </Box>
            <Box component="button" onClick={() => router.push('/dashboard/blogs')}
              sx={{ px: 2.5, py: 1, backgroundColor: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 1.5, fontSize: '0.875rem', cursor: 'pointer', '&:hover': { borderColor: C.muted } }}>
              Blog Management
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  const sm = post ? (STATUS_META[post.status] || STATUS_META.published) : null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: C.bg, overflow: 'hidden' }}>

      {/* Left pane — article preview */}
      <Box sx={{ flex: '0 0 58%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* Article header */}
        <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconButton size="small" onClick={() => router.push('/dashboard/blogs')} sx={{ color: C.muted }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            {sm && (
              <Chip label={sm.label} size="small" sx={{ backgroundColor: `${sm.color}18`, color: sm.color, border: `1px solid ${sm.color}44`, fontSize: '0.7rem', height: 20 }} />
            )}
            {post?.slug && (
              <Tooltip title="View on site">
                <IconButton size="small" component="a" href={`https://shop.engelfinedesign.com/blog/${post.slug}`} target="_blank" sx={{ color: C.muted, ml: 'auto' }}>
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography sx={{ color: C.text, fontWeight: 600, fontSize: '0.925rem', lineHeight: 1.4 }}>
            {post?.title}
          </Typography>
          {post?.excerpt && (
            <Typography sx={{ color: C.muted, fontSize: '0.775rem', mt: 0.5, lineHeight: 1.5 }}>
              {post.excerpt}
            </Typography>
          )}
        </Box>

        {/* Article content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography
            component="pre"
            sx={{
              color: C.muted,
              fontSize: '0.8rem',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              m: 0,
              transition: 'opacity 0.2s',
              opacity: editing ? 0.5 : 1,
            }}
          >
            {content}
          </Typography>
        </Box>
      </Box>

      {/* Right pane — chat editor */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Article Editor</Typography>
            <Typography sx={{ color: C.muted, fontSize: '0.75rem' }}>Chat to refine — publish when ready</Typography>
          </Box>
          {post?.status !== 'published' && (
            <Box
              component="button"
              onClick={handlePublish}
              disabled={publishing}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 0.875,
                backgroundColor: publishing ? C.border : C.accent, color: publishing ? C.muted : '#000',
                border: 'none', borderRadius: 1.5, fontWeight: 600, fontSize: '0.8rem',
                cursor: publishing ? 'not-allowed' : 'pointer', transition: 'background-color 0.15s',
                '&:hover:not(:disabled)': { backgroundColor: '#B8932A' },
              }}
            >
              {publishing
                ? <><CircularProgress size={12} sx={{ color: C.muted }} /> Publishing…</>
                : <><PublishIcon sx={{ fontSize: 15 }} /> Publish</>}
            </Box>
          )}
          {post?.status === 'published' && (
            <Chip label="Live" size="small" sx={{ backgroundColor: C.successDim, color: C.success, border: `1px solid ${C.success}44`, fontSize: '0.7rem' }} />
          )}
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
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

            if (msg.variant === 'thinking') {
              return (
                <AiBubble key={i} isLast={isLast}>
                  <Box sx={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: '4px 16px 16px 16px', px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={12} sx={{ color: C.accent }} />
                    <Typography sx={{ color: C.muted, fontSize: '0.875rem' }}>Rewriting…</Typography>
                  </Box>
                </AiBubble>
              );
            }

            if (msg.variant === 'done-edit') {
              return (
                <AiBubble key={i} isLast={isLast && msg.isNew}>
                  <Box sx={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.success}`, borderRadius: '4px 16px 16px 16px', px: 2, py: 1.5 }}>
                    <Typography sx={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.6 }}>
                      Done — preview updated on the left. Keep refining or publish when ready.
                    </Typography>
                  </Box>
                </AiBubble>
              );
            }

            return null;
          })}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: `1px solid ${C.border}`, backgroundColor: C.surface, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <Box
              component="textarea"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              disabled={editing}
              placeholder="What would you like to change? (Enter to send, Shift+Enter for new line)"
              rows={3}
              sx={{
                flex: 1, resize: 'none', backgroundColor: C.cardAlt, color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 2, px: 2, py: 1.5, fontSize: '0.875rem', lineHeight: 1.6,
                fontFamily: 'inherit', outline: 'none',
                '&:focus': { borderColor: C.accent },
                '&::placeholder': { color: C.muted },
                '&:disabled': { opacity: 0.5 },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!input.trim() || editing}
              sx={{
                width: 44, height: 44, backgroundColor: input.trim() && !editing ? C.accent : C.cardAlt,
                color: input.trim() && !editing ? '#000' : C.muted, borderRadius: 2, flexShrink: 0,
                '&:hover': { backgroundColor: input.trim() && !editing ? '#B8932A' : C.cardAlt },
                transition: 'background-color 0.15s',
                '&:disabled': { backgroundColor: C.cardAlt, color: C.muted },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ open: false, msg: '' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" sx={{ width: '100%' }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
