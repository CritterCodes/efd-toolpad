'use client';

import React, { useEffect, useState } from 'react';
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
import ArticleIcon from '@mui/icons-material/Article';
import QuizIcon from '@mui/icons-material/Quiz';

const C = {
  bg: '#15181D',
  card: '#1A1D23',
  border: '#2A2F38',
  text: '#D1D5DB',
  muted: '#9CA3AF',
  accent: '#D4AF37',
};

export default function BlogDraftsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/auth/signin');
      return;
    }
    fetchDrafts();
  }, [session, status]);

  async function fetchDrafts() {
    try {
      const res = await fetch('/api/admin/blog-drafts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setDrafts(data.drafts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: C.accent }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: C.bg, minHeight: '100vh' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ArticleIcon sx={{ color: C.accent, fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{ color: C.text, fontWeight: 600 }}>
            Blog Drafts
          </Typography>
          <Typography variant="body2" sx={{ color: C.muted }}>
            Answer the questionnaire for each draft to publish it with your expertise
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && drafts.length === 0 && (
        <Card sx={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <QuizIcon sx={{ color: C.muted, fontSize: 48, mb: 1 }} />
            <Typography sx={{ color: C.muted }}>No drafts awaiting review</Typography>
            <Typography variant="body2" sx={{ color: C.muted, mt: 0.5 }}>
              New drafts appear here after the pipeline runs (Mon + Thu at 6am)
            </Typography>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {drafts.map((draft) => (
          <Card
            key={draft._id}
            sx={{
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              '&:hover': { borderColor: C.accent },
              transition: 'border-color 0.15s',
            }}
          >
            <CardActionArea onClick={() => router.push(`/dashboard/blog-drafts/${draft._id}`)}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ color: C.text, fontWeight: 600, fontSize: '1rem', lineHeight: 1.4, flex: 1, pr: 2 }}>
                    {draft.title}
                  </Typography>
                  <Chip
                    label={`${draft.questionnaire?.length ?? 0} questions`}
                    size="small"
                    icon={<QuizIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ backgroundColor: '#2A2F38', color: C.accent, border: `1px solid ${C.accent}33`, flexShrink: 0 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: C.muted, mb: 1.5, lineHeight: 1.5 }}>
                  {draft.excerpt}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={draft.category} size="small" sx={{ backgroundColor: '#1F232A', color: C.muted, fontSize: '0.75rem' }} />
                  <Chip label={`${draft.wordCount?.toLocaleString()} words`} size="small" sx={{ backgroundColor: '#1F232A', color: C.muted, fontSize: '0.75rem' }} />
                  <Chip label={`${draft.readingTime} min read`} size="small" sx={{ backgroundColor: '#1F232A', color: C.muted, fontSize: '0.75rem' }} />
                  <Chip
                    label={new Date(draft.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    size="small"
                    sx={{ backgroundColor: '#1F232A', color: C.muted, fontSize: '0.75rem' }}
                  />
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
