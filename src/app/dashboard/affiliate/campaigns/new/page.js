"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField,
  Alert, CircularProgress
} from '@mui/material';
import { Add as AddIcon, CampaignOutlined as CampaignIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const BASE_URL = process.env.NEXT_PUBLIC_SHOP_URL || 'https://engelfinedesign.com';

export default function NewCampaignPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [affiliateId, setAffiliateId] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('/custom-work/request');
  const [loading, setLoading] = useState(false);
  const [fetchingAffiliate, setFetchingAffiliate] = useState(true);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    async function loadAffiliate() {
      try {
        const res = await fetch('/api/affiliates/me');
        const data = await res.json();
        if (data.success && data.data) {
          setAffiliateId(data.data.affiliateId);
          setAffiliateCode(data.data.code);
        }
      } catch {}
      setFetchingAffiliate(false);
    }
    if (session) loadAffiliate();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !affiliateId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/affiliates/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateId, name, description, destinationUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create campaign.');
      setCreated(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingAffiliate) return <CircularProgress sx={{ m: 4, color: UI.accent }} />;

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
              color: UI.textPrimary, backgroundColor: UI.bgCard,
              border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase',
            }}
          >
            <CampaignIcon sx={{ fontSize: 16, color: UI.accent }} />
            Affiliate / Campaigns
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
            New Campaign
          </Typography>
          <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
            Create a referral campaign to generate a trackable link for sharing.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => router.push('/dashboard/affiliate/campaigns')}
          sx={{ color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
        >
          Back to Campaigns
        </Button>
      </Box>

      {/* Body */}
      <Box sx={{ maxWidth: 560 }}>
        {created ? (
          <Box sx={{ p: 3, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
            <Alert severity="success" sx={{ mb: 2 }}>Campaign created!</Alert>
            <Typography variant="body2" sx={{ color: UI.textSecondary, mb: 1 }}>Your referral link:</Typography>
            <Typography
              variant="body1"
              sx={{ wordBreak: 'break-all', fontWeight: 600, fontFamily: 'monospace', color: UI.accent }}
            >
              {`${BASE_URL}/r/${affiliateCode}/${created.code}`}
            </Typography>
            <Button
              sx={{ mt: 3, color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
              variant="outlined"
              onClick={() => router.push('/dashboard/affiliate/campaigns')}
            >
              Back to Campaigns
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Campaign Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Destination URL"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              fullWidth
              helperText="Where the referral link should direct visitors"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !name.trim()}
              startIcon={<AddIcon />}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
