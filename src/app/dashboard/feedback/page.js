'use client';

/**
 * Feedback — ask an account what they thought, and read what came back.
 *
 * Exists because the one useful quote we have about our work (Marlen Jewelers, 2026-10-03) survives only
 * as a memory of a phone call, with no permission attached. A quote nobody can produce is not a quote.
 *
 * The column that matters is **Quote**. It is green only when the person ticked the consent box on their
 * own form — never inferred from a warm comment or a five-star rating.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  PageBody, PageHeader, SurfaceCard, CardGrid, SectionLabel, StatusChip,
  GoldButton, QuietButton, Field, FieldList, LoadingPage,
} from '@/components/facelift';

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');

export default function FeedbackDashboardPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ accountName: '', recipientEmail: '', label: '' });
  const [sending, setSending] = useState(false);
  const [lastLink, setLastLink] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback/request');
      const body = await res.json();
      if (!body.success) { setError(body.error || 'Could not load feedback.'); return; }
      setRows(body.data);
    } catch {
      setError('Could not load feedback.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    setLastLink(null);
    try {
      const res = await fetch('/api/feedback/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: form.accountName,
          recipientEmail: form.recipientEmail,
          context: { label: form.label },
        }),
      });
      const body = await res.json();
      if (!body.success) { setError(body.error || 'Could not send that.'); return; }
      setLastLink(body.data);
      setForm({ accountName: '', recipientEmail: '', label: '' });
      load();
    } catch {
      setError('Could not send that.');
    } finally {
      setSending(false);
    }
  };

  if (rows === null && !error) return <LoadingPage shape="cards" />;

  const answered = (rows || []).filter((r) => r.response);
  const quotable = answered.filter((r) => r.response?.mayQuote === true && r.response?.comment?.trim());

  return (
    <PageBody>
      <PageHeader
        title="Feedback"
        subtitle={`${answered.length} of ${rows?.length || 0} answered · ${quotable.length} we may quote`}
      />

      <SurfaceCard>
        <SectionLabel>Ask an account</SectionLabel>
        <form onSubmit={send} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
          <input
            required
            type="email"
            aria-label="Their email address"
            placeholder="Their email address"
            value={form.recipientEmail}
            onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
            style={inputStyle}
          />
          <input
            aria-label="Who they are"
            placeholder="Who they are — e.g. Marlen Jewelers"
            value={form.accountName}
            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            style={inputStyle}
          />
          <input
            aria-label="What to ask about"
            placeholder="What to ask about — e.g. the September packages"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            style={inputStyle}
          />
          <GoldButton type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send the ask'}</GoldButton>
        </form>

        {lastLink && (
          <div style={{ marginTop: '1rem' }}>
            <SectionLabel>{lastLink.emailed ? 'Sent' : 'Not emailed — send this by hand'}</SectionLabel>
            <p style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem' }}>{lastLink.url}</p>
            <QuietButton type="button" onClick={() => navigator.clipboard?.writeText(lastLink.url)}>
              Copy the link
            </QuietButton>
          </div>
        )}

        {error && <p style={{ color: '#f0c3c3', marginTop: '1rem' }}>{error}</p>}
      </SurfaceCard>

      <CardGrid min={320}>
        {(rows || []).map((r) => (
          // No gold accent on the card: the chip below already says "may quote", and two golds saying
          // one thing is how a palette stops meaning anything. On this page gold means consent.
          <SurfaceCard key={r.requestID}>
            <SectionLabel>{r.accountName || r.recipientEmail}</SectionLabel>
            <FieldList>
              <Field label="Asked" value={fmt(r.createdAt)} />
              <Field label="About" value={r.context?.label || '—'} />
              <Field label="Answered" value={r.response ? fmt(r.response.submittedAt) : 'not yet'} />
              {r.response && <Field label="Rating" value={`${r.response.rating} / 5`} strong />}
            </FieldList>

            {r.response?.comment && (
              <p style={{ fontStyle: 'italic', marginTop: '0.75rem', lineHeight: 1.6 }}>
                “{r.response.comment}”
              </p>
            )}

            {r.response && (
              <div style={{ marginTop: '0.75rem' }}>
                {r.response.mayQuote === true
                  ? <StatusChip label={`May quote — as ${r.response.attributionName || r.response.attribution}`} solid />
                  : <StatusChip label="Private — do not quote" hue="#9a9a9a" />}
              </div>
            )}
          </SurfaceCard>
        ))}
      </CardGrid>

      {rows?.length === 0 && (
        <SurfaceCard><p>Nobody has been asked yet.</p></SurfaceCard>
      )}
    </PageBody>
  );
}

const inputStyle = {
  minHeight: 44,
  padding: '0.6rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--fl-line, #2a2a2a)',
  background: 'var(--fl-surface, #141414)',
  color: 'var(--fl-text, #f5f5f5)',
  font: 'inherit',
};
