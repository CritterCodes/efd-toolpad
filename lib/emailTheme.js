/**
 * THE EFD EMAIL THEME — one shell for every email this app sends.
 *
 * Ported from efd-shop `public/email-templates/email-theme.html`, which is the canonical design and
 * matches the website: dark ground, gold accent, 600px, Segoe UI. Admin's 24 .hbs templates each carry
 * their OWN copy of a different, LIGHT design (#f5f5f5 body, white card, navy header) — so a customer
 * who gets a shop email and an admin email sees two unrelated brands. That is the incoherence this fixes.
 *
 * ── WHY STYLES ARE INLINE ─────────────────────────────────────────────────────
 * Email clients are not browsers. Gmail strips <style> in some contexts, Outlook's renderer is Word,
 * and neither reliably supports flexbox, grid, or CSS variables. So the tokens below are JS constants
 * interpolated into `style="…"` attributes on the elements themselves, and layout is TABLES.
 *
 * This is also why the invoice email must not reuse the PRINT document: that one is built for paper —
 * `@page`, letter margins, widths in inches, and a <style> block — so in an inbox it arrives unstyled
 * and mis-sized. Print and email share the document MODEL (so the numbers cannot drift) and nothing else.
 */

export const THEME = {
  bg: '#0a0a0a',            // hsl(0 0% 3.9%) — website dark ground
  panel: '#171717',         // hsl(0 0% 9%)   — detail/info boxes
  border: '#262626',        // hsl(0 0% 14.9%)
  text: '#fafafa',          // hsl(0 0% 98%)
  textMuted: '#a3a3a3',     // hsl(0 0% 63.9%)
  gold: '#D4AF37',
  goldDark: '#c9a227',
  white: '#ffffff',
  black: '#000000',
  danger: '#dc2626',
  dangerText: '#fca5a5',
  font: "'Segoe UI', Arial, Helvetica, sans-serif",
  mono: "Monaco, Menlo, 'Ubuntu Mono', monospace",
  width: 600,
};

const T = THEME;

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** A gold call-to-action. Table-wrapped so Outlook centres it. */
export function emailButton(url, label) {
  if (!url) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto"><tr><td
    style="background:${T.gold};border-radius:2px"><a href="${esc(url)}"
    style="display:inline-block;padding:14px 32px;color:${T.black};text-decoration:none;font-weight:600;
    font-size:14px;letter-spacing:.5px;font-family:${T.font}">${esc(label)}</a></td></tr></table>`;
}

/** A bordered panel — the theme's `.detail-box`, gold left rule. */
export function detailBox(innerHtml) {
  return `<div style="background:${T.panel};border-left:4px solid ${T.gold};padding:16px;margin:16px 0;
    border-radius:2px;color:${T.text}">${innerHtml}</div>`;
}

/** A section heading with the gold underline the theme uses. */
export function sectionHeading(text) {
  return `<h2 style="font-size:18px;color:${T.text};margin:0 0 16px;font-weight:600;padding-bottom:8px;
    border-bottom:2px solid ${T.gold};font-family:${T.font}">${esc(text)}</h2>`;
}

/**
 * Wrap body html in the shell: dark ground, gold-ruled header, 600px, footer.
 *
 * @param {object} o
 *   title      — the gold header line
 *   bodyHtml   — already-escaped markup for the content area
 *   preheader  — the grey line inbox lists show next to the subject; skipping it lets the client
 *                pick the first words of the body instead, which is usually noise
 *   logoSrc    — absolute url; emails cannot use relative paths
 *   footerNote — small print under the rule
 */
export function renderEmailShell({ title, bodyHtml, preheader = '', logoSrc = '', footerNote = '' }) {
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${T.bg};font-family:${T.font};line-height:1.6;color:${T.text}">
${preheaderBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.bg}">
  <tr><td align="center" style="padding:24px 12px">

    <table role="presentation" width="${T.width}" cellpadding="0" cellspacing="0"
      style="max-width:${T.width}px;width:100%;background:${T.bg}">

      <tr><td align="center" style="padding:40px 20px;border-bottom:4px solid ${T.gold}">
        ${logoSrc ? `<img src="${esc(logoSrc)}" alt="Engel Fine Design" width="150"
          style="max-width:150px;height:auto;margin-bottom:20px;display:block" />` : ''}
        <h1 style="margin:0;font-size:28px;font-weight:600;color:${T.gold};letter-spacing:.5px;
          font-family:${T.font}">${esc(title)}</h1>
      </td></tr>

      <tr><td style="padding:40px 30px;background:${T.bg};color:${T.text};font-size:15px">
        ${bodyHtml}
      </td></tr>

      <tr><td style="padding:20px 30px;border-top:1px solid ${T.border};text-align:center;
        color:${T.textMuted};font-size:12px">
        ${footerNote ? `<div style="margin-bottom:8px">${footerNote}</div>` : ''}
        <div>Engel Fine Design &middot; 115 N 10th St #A107, Fort Smith, AR 72901 &middot; (479) 546-6740</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
