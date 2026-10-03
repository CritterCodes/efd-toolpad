'use client';

/**
 * "How did we do?" — a public page, reached by an emailed link, no sign-in.
 *
 * It is public because the people worth asking do not use the app: of ~389 wholesale repairs, 22 were
 * created by a store itself, and our best account created none of them. A login here would mean never
 * hearing from them.
 *
 * The consent checkbox is the point of the page. A rating is a number nobody acts on; permission to
 * repeat what somebody said is the thing that turns a kind word into something we can show a prospect.
 * So it is a real control with its own box and its own explanation, not fine print under a Submit button.
 *
 * **Why this is reachable without a session:** `middleware.js` never sees it. Its `config.matcher` covers
 * only `/`, `/dashboard/:path*`, `/auth/:path*` and `/emergency-logout`, so a path outside those is public
 * by default — which is also how `/pay/[token]` works. Nothing needs adding to `publicRoutes`, and adding
 * it there would be dead code that reads as load-bearing. If the matcher is ever widened, this page and
 * `/pay` both need an entry on the same day.
 */
import { use, useEffect, useState } from 'react';
import {
  FaceliftRoot, PageBody, SurfaceCard, SectionLabel, Segmented,
  ChoiceList, ChoiceRow, GoldButton, Skeleton,
} from '@/components/facelift';
import styles from './Feedback.module.css';

const RATINGS = [
  { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' },
  { value: 4, label: '4' }, { value: 5, label: '5' },
];

export default function FeedbackPage({ params }) {
  const { token } = use(params);

  const [request, setRequest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [mayQuote, setMayQuote] = useState(false);
  const [attribution, setAttribution] = useState('business');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/feedback/${token}`)
      .then((r) => r.json())
      .then((body) => {
        if (!live) return;
        if (!body.success) { setLoadError(body.error || 'This link is not valid.'); return; }
        setRequest(body.data);
        if (body.data.response) {
          setRating(body.data.response.rating);
          setComment(body.data.response.comment || '');
          setMayQuote(body.data.response.mayQuote === true);
          setAttribution(body.data.response.attribution || 'business');
        }
      })
      .catch(() => live && setLoadError('Something went wrong opening this link.'));
    return () => { live = false; };
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) { setError('Please pick a number from 1 to 5.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          // A real boolean. The server takes nothing else as consent.
          mayQuote: mayQuote === true,
          attribution,
          attributionName: attribution === 'person' ? '' : request?.accountName || '',
        }),
      });
      const body = await res.json();
      if (!body.success) { setError(body.error || 'That did not save.'); return; }
      setDone(body.data);
    } catch {
      setError('That did not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <FaceliftRoot>
        <div className={styles.wrap}>
          <PageBody gutter className={styles.card}>
            <SurfaceCard>
              <h1>This link is not valid</h1>
              <p className={styles.lede}>{loadError} If you were sent it recently, reply to that email and
                we will send a fresh one.</p>
            </SurfaceCard>
          </PageBody>
        </div>
      </FaceliftRoot>
    );
  }

  if (!request) {
    return (
      <FaceliftRoot>
        <div className={styles.wrap}>
          <PageBody gutter className={styles.card}>
            <SurfaceCard><Skeleton /><Skeleton /><Skeleton /></SurfaceCard>
          </PageBody>
        </div>
      </FaceliftRoot>
    );
  }

  if (done) {
    return (
      <FaceliftRoot>
        <div className={styles.wrap}>
          <PageBody gutter className={styles.card}>
            <SurfaceCard>
              <div className={styles.done}>
                <div className={styles.doneMark}>✓</div>
                <h1>Thank you</h1>
                <p className={styles.lede}>
                  {done.response?.mayQuote
                    ? 'Recorded — and thank you for letting us use it.'
                    : 'Recorded, and kept to ourselves.'}
                </p>
                {done.response?.comment && (
                  <p className={styles.quoteBack}>“{done.response.comment}”</p>
                )}
              </div>
            </SurfaceCard>
          </PageBody>
        </div>
      </FaceliftRoot>
    );
  }

  return (
    <FaceliftRoot>
      <div className={styles.wrap}>
        <PageBody gutter className={styles.card}>
          <SurfaceCard>
            <h1>How did we do?</h1>
            <p className={styles.lede}>
              {request.accountName ? `${request.accountName} — ` : ''}
              we would like to know what you thought
              {request.context?.label ? ` of ${request.context.label}` : ' of the work we have done for you'},
              honestly, including anything that was not right. Two questions.
            </p>

            {request.answered && (
              <p className={styles.lede}>You have answered this already — change anything you like and send
                it again.</p>
            )}

            <form onSubmit={submit}>
              <div className={styles.group}>
                <SectionLabel>The work, out of 5</SectionLabel>
                <Segmented options={RATINGS} value={rating} onChange={setRating} aria-label="Rating out of 5" />
              </div>

              <div className={styles.group}>
                <label className={styles.label} htmlFor="comment">Anything you would say about it</label>
                <textarea
                  id="comment"
                  className={styles.textarea}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Turnaround, the quality of the work, how it came back — whatever stood out."
                  maxLength={4000}
                />
              </div>

              <div className={styles.group}>
                <label className={`${styles.consent} ${mayQuote ? styles.consentOn : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.box}
                    checked={mayQuote}
                    onChange={(e) => setMayQuote(e.target.checked)}
                  />
                  <span className={styles.consentText}>
                    You may quote what I have written.
                    <span className={styles.consentNote}>
                      Entirely your call, and saying no changes nothing about the work. If you leave this
                      unticked we keep it to ourselves.
                    </span>
                  </span>
                </label>
              </div>

              {mayQuote && (
                <div className={styles.group}>
                  <SectionLabel>Credit it to</SectionLabel>
                  <ChoiceList>
                    <ChoiceRow
                      title={request.accountName || 'My business'}
                      meta="The business name"
                      selected={attribution === 'business'}
                      onClick={() => setAttribution('business')}
                    />
                    <ChoiceRow
                      title="My name and the business"
                      meta="For example: Jane Smith, Smith & Co"
                      selected={attribution === 'person'}
                      onClick={() => setAttribution('person')}
                    />
                    <ChoiceRow
                      title="Keep me anonymous"
                      meta="Quoted only as “a trade account”"
                      selected={attribution === 'anonymous'}
                      onClick={() => setAttribution('anonymous')}
                    />
                  </ChoiceList>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <GoldButton type="submit" disabled={saving}>
                {saving ? 'Sending…' : 'Send'}
              </GoldButton>
            </form>
          </SurfaceCard>
        </PageBody>
      </div>
    </FaceliftRoot>
  );
}
