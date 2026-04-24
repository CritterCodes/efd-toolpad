"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, Button, TextField,
  Alert, CircularProgress, Card, CardContent
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

  if (fetchingAffiliate) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/affiliate')} sx={{ cursor: 'pointer' }}>Affiliate</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/affiliate/campaigns')} sx={{ cursor: 'pointer' }}>Campaigns</Link>
        <Typography color="text.primary">New</Typography>
      </Breadcrumbs>

      <Typography variant="h5" fontWeight={600} mb={3}>New Campaign</Typography>

      {created ? (
        <Card>
          <CardContent>
            <Alert severity="success" sx={{ mb: 2 }}>Campaign created!</Alert>
            <Typography variant="body2" color="text.secondary" mb={1}>Your referral link:</Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-all', fontWeight: 600 }}>
              {`${BASE_URL}/r/${affiliateCode}/${created.code}`}
            </Typography>
            <Button sx={{ mt: 3 }} variant="outlined" onClick={() => router.push('/dashboard/affiliate/campaigns')}>
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={3} fullWidth />
          <TextField label="Destination URL" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} fullWidth helperText="Where the referral link should direct visitors" />
          <Button type="submit" variant="contained" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
