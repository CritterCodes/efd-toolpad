'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import ArticleIcon from '@mui/icons-material/Article';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import ReviewIcon from '@mui/icons-material/RateReview';

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
  warning: '#F59E0B',
  info: '#3B82F6',
  danger: '#EF4444',
};

const STATUS_META = {
  pending_review: { label: 'Pending Q&A', color: C.warning, icon: <PendingIcon sx={{ fontSize: 12 }} /> },
  enriched:       { label: 'Awaiting Review', color: C.info, icon: <ReviewIcon sx={{ fontSize: 12 }} /> },
  published:      { label: 'Published', color: C.success, icon: <CheckCircleIcon sx={{ fontSize: 12 }} /> },
};

const STATUS_TABS = ['all', 'pending_review', 'enriched', 'published'];
const STATUS_LABELS = { all: 'All', pending_review: 'Pending Q&A', enriched: 'Awaiting Review', published: 'Published' };

export default function BlogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Trigger dialog
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [topicHint, setTopicHint] = useState('');
  const [triggering, setTriggering] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) { router.replace('/auth/signin'); return; }
    fetchPosts();
  }, [session, status, activeTab]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const res = await fetch(`/api/admin/blogs${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blogs/${deleteTarget._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setPosts((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      setSnack({ open: true, msg: 'Post deleted', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Delete failed', severity: 'error' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch('/api/admin/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicHint: topicHint.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSnack({ open: true, msg: 'Pipeline started — drafts will appear in 5–10 minutes', severity: 'success' });
      setTriggerOpen(false);
      setTopicHint('');
    } catch (err) {
      setSnack({ open: true, msg: err.message, severity: 'error' });
    } finally {
      setTriggering(false);
    }
  }

  function handleCardClick(post) {
    if (post.status === 'pending_review') {
      router.push(`/dashboard/blog-drafts/${post._id}`);
    } else {
      router.push(`/dashboard/blogs/${post._id}`);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', backgroundColor: C.bg }}>
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ArticleIcon sx={{ color: C.accent, fontSize: 26 }} />
            <Box>
              <Typography variant="h5" sx={{ color: C.text, fontWeight: 600, lineHeight: 1.2 }}>
                Blog Management
              </Typography>
              <Typography variant="body2" sx={{ color: C.muted }}>
                {total} total posts
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => setTriggerOpen(true)}
              startIcon={<AutoAwesomeIcon />}
              sx={{ backgroundColor: C.accentDim, color: C.accent, border: `1px solid ${C.accent}44`, '&:hover': { backgroundColor: C.accent, color: '#000' }, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', px: 2 }}
            >
              Generate Articles
            </Button>
            <Button
              onClick={() => { setTopicHint(''); setTriggerOpen(true); }}
              startIcon={<AddIcon />}
              sx={{ backgroundColor: C.cardAlt, color: C.muted, border: `1px solid ${C.border}`, '&:hover': { borderColor: C.accent, color: C.accent }, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', px: 2 }}
            >
              Custom Topic
            </Button>
          </Box>
        </Box>

        {/* Status tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mt: 1.5,
            minHeight: 36,
            '& .MuiTab-root': { color: C.muted, minHeight: 36, py: 0.5, fontSize: '0.8rem', textTransform: 'none' },
            '& .Mui-selected': { color: C.accent },
            '& .MuiTabs-indicator': { backgroundColor: C.accent },
          }}
        >
          {STATUS_TABS.map((s) => (
            <Tab key={s} label={STATUS_LABELS[s]} value={s} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!error && posts.length === 0 && (
          <Card sx={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
            <CardContent sx={{ textAlign: 'center', py: 5 }}>
              <ArticleIcon sx={{ color: C.muted, fontSize: 48, mb: 1 }} />
              <Typography sx={{ color: C.muted }}>No posts{activeTab !== 'all' ? ` with status "${STATUS_LABELS[activeTab]}"` : ''}</Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {posts.map((post) => {
            const sm = STATUS_META[post.status] || STATUS_META.published;
            return (
              <Card
                key={post._id}
                sx={{ backgroundColor: C.card, border: `1px solid ${C.border}`, '&:hover': { borderColor: C.accent }, transition: 'border-color 0.15s' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                  <CardActionArea onClick={() => handleCardClick(post)} sx={{ flex: 1 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                        <Typography sx={{ color: C.text, fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4, flex: 1, pr: 2 }}>
                          {post.title}
                        </Typography>
                        <Chip
                          label={sm.label}
                          icon={sm.icon}
                          size="small"
                          sx={{ backgroundColor: `${sm.color}18`, color: sm.color, border: `1px solid ${sm.color}44`, fontSize: '0.7rem', height: 22, flexShrink: 0 }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: C.muted, fontSize: '0.8rem', mb: 1.25, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.excerpt}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {post.category && (
                          <Chip label={post.category} size="small" sx={{ backgroundColor: C.cardAlt, color: C.muted, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {post.wordCount && (
                          <Chip label={`${post.wordCount.toLocaleString()} words`} size="small" sx={{ backgroundColor: C.cardAlt, color: C.muted, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {post.readingTime && (
                          <Chip label={`${post.readingTime} min`} size="small" sx={{ backgroundColor: C.cardAlt, color: C.muted, fontSize: '0.7rem', height: 20 }} />
                        )}
                        <Chip
                          label={new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          size="small"
                          sx={{ backgroundColor: C.cardAlt, color: C.muted, fontSize: '0.7rem', height: 20 }}
                        />
                        {post.slug && (
                          <Chip label={`/${post.slug}`} size="small" sx={{ backgroundColor: C.cardAlt, color: C.muted, fontSize: '0.7rem', height: 20, fontFamily: 'monospace' }} />
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  {/* Action icons */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 1, borderLeft: `1px solid ${C.border}` }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleCardClick(post)} sx={{ color: C.muted, '&:hover': { color: C.accent } }}>
                        <EditNoteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(post); }} sx={{ color: C.muted, '&:hover': { color: C.danger } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 2 } }}>
        <DialogTitle sx={{ color: C.text }}>Delete post?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: C.muted, fontSize: '0.9rem' }}>
            "{deleteTarget?.title}" will be permanently deleted. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: C.muted, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleDelete} disabled={deleting} sx={{ backgroundColor: C.danger, color: '#fff', textTransform: 'none', '&:hover': { backgroundColor: '#DC2626' }, '&:disabled': { backgroundColor: C.border } }}>
            {deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Trigger pipeline dialog */}
      <Dialog open={triggerOpen} onClose={() => setTriggerOpen(false)} PaperProps={{ sx: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 2, minWidth: 420 } }}>
        <DialogTitle sx={{ color: C.text, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: C.accent, fontSize: 20 }} />
          Generate Articles
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: C.muted, fontSize: '0.875rem', mb: 2 }}>
            The pipeline will research topics, write 3 articles, and generate interview questions. Drafts appear in 5–10 minutes.
          </Typography>
          <TextField
            fullWidth
            label="Topic hint (optional)"
            placeholder="e.g. rhodium plating, pearl care, resizing vintage rings"
            value={topicHint}
            onChange={(e) => setTopicHint(e.target.value)}
            helperText="If provided, the researcher will prioritize this topic."
            onKeyDown={(e) => { if (e.key === 'Enter') handleTrigger(); }}
            sx={{
              '& .MuiOutlinedInput-root': { color: C.text, '& fieldset': { borderColor: C.border }, '&:hover fieldset': { borderColor: C.accent }, '&.Mui-focused fieldset': { borderColor: C.accent } },
              '& .MuiInputLabel-root': { color: C.muted, '&.Mui-focused': { color: C.accent } },
              '& .MuiFormHelperText-root': { color: C.muted },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setTriggerOpen(false)} sx={{ color: C.muted, textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleTrigger}
            disabled={triggering}
            startIcon={triggering ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <AutoAwesomeIcon />}
            sx={{ backgroundColor: triggering ? C.border : C.accent, color: triggering ? C.muted : '#000', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#B8932A' }, '&:disabled': { backgroundColor: C.border } }}
          >
            {triggering ? 'Starting…' : 'Start Pipeline'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
