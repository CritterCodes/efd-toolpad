'use client';

/**
 * MaterialOrb — material preview "chip" for the Studio material picker.
 *
 * High-fidelity CSS art (no WebGL): a round-brilliant gem (top view) for
 * kind="gem", or a small cast ingot for kind="metal". One per material option
 * so the jeweller SEES the material instead of reading a label. Tints mirror
 * the engine's GEM_CONFIGS / metal finishes so the chip reads true.
 *
 * Ported verbatim from the Claude Design mockup (REFRAKT Studio.dc.html →
 * MaterialOrb.jsx). The main viewer renders the *real* refracting engine; these
 * lightweight chips intentionally avoid mounting a WebGL context per swatch.
 */

const GEM_TINT = {
  diamond: { c1: '#ffffff', c2: '#cfe6ff', c3: '#8fa6bd' },
  moissanite: { c1: '#ffffff', c2: '#e6f4ff', c3: '#aebfce' },
  marquise: { c1: '#ffffff', c2: '#d8ecff', c3: '#9fb6cc' },
  amethyst: { c1: '#f3e0ff', c2: '#a855f7', c3: '#5b1d8f' },
  ruby: { c1: '#ffdada', c2: '#ef4444', c3: '#8f1d1d' },
  sapphire: { c1: '#d6e6ff', c2: '#3b82f6', c3: '#1e3a8a' },
  emerald: { c1: '#d6ffe9', c2: '#10b981', c3: '#065f46' },
};
const METAL_TINT = {
  gold: { hi: '#fff3cf', mid: '#e7c054', lo: '#8a5f12' },
  satin: { hi: '#f0dca8', mid: '#c9a23e', lo: '#7a5a16' },
  whiteGold: { hi: '#ffffff', mid: '#d6d8dc', lo: '#7e848c' },
  roseGold: { hi: '#ffe6de', mid: '#e0998c', lo: '#9c5a4f' },
  platinum: { hi: '#ffffff', mid: '#d2d6dc', lo: '#838992' },
  silver: { hi: '#ffffff', mid: '#cfd3d8', lo: '#7c828a' },
};

// Lighten (f>1, toward white) or darken (f<1) a hex colour — used to derive a
// 3-stop tint for materials not in the built-in tables (new baseline + tenant).
function shade(hex, f) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 1) { const t = 1 - 1 / f; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; } else { r *= f; g *= f; b *= f; }
  return '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
}

function PlaceholderGem({ size, variant, tint }) {
  const t = GEM_TINT[variant] || (tint ? { c1: shade(tint, 1.7), c2: tint, c3: shade(tint, 0.45) } : GEM_TINT.diamond);
  const d = size;
  const facetRing =
    'conic-gradient(from 0deg,' +
    Array.from({ length: 16 }, (_, i) => `rgba(255,255,255,${i % 2 ? 0.0 : 0.28}) ${i * 22.5}deg ${(i + 1) * 22.5}deg`).join(',') + ')';
  const shadeRing =
    'conic-gradient(from 11deg,' +
    Array.from({ length: 16 }, (_, i) => `rgba(0,0,0,${i % 2 ? 0.3 : 0.0}) ${i * 22.5}deg ${(i + 1) * 22.5}deg`).join(',') + ')';
  return (
    <span style={{ position: 'relative', display: 'block', width: d, height: d, borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, ${t.c1} 0%, ${t.c2} 52%, ${t.c3} 100%)`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.4)', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: facetRing, mixBlendMode: 'screen', opacity: 0.65 }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: shadeRing, mixBlendMode: 'multiply', opacity: 0.5 }} />
      <span style={{ position: 'absolute', inset: '26%', clipPath: 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)', background: `radial-gradient(circle at 42% 38%, ${t.c1}, ${t.c2})`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)' }} />
      <span style={{ position: 'absolute', left: '30%', top: '24%', width: '22%', height: '16%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.95), rgba(255,255,255,0))' }} />
    </span>
  );
}

function PlaceholderIngot({ size, variant, tint }) {
  const m = METAL_TINT[variant] || (tint ? { hi: shade(tint, 1.5), mid: tint, lo: shade(tint, 0.45) } : METAL_TINT.gold);
  const w = size, h = Math.round(size * 0.82);
  return (
    <span style={{ position: 'relative', display: 'block', width: w, height: h }}>
      <span style={{ position: 'absolute', left: 0, top: '22%', width: '100%', height: '78%', clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)', borderRadius: '2px 2px 4px 4px', background: `linear-gradient(160deg, ${m.hi} 0%, ${m.mid} 42%, ${m.lo} 100%)`, boxShadow: 'inset 0 -2px 4px rgba(0,0,0,.4)' }}>
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, transparent 38%, rgba(255,255,255,.55) 46%, rgba(255,255,255,0) 52%, transparent 62%)' }} />
      </span>
      <span style={{ position: 'absolute', left: '6%', top: 0, width: '88%', height: '34%', clipPath: 'polygon(14% 0, 86% 0, 100% 100%, 0 100%)', borderRadius: '3px', background: `linear-gradient(180deg, ${m.hi}, ${m.mid})`, boxShadow: 'inset 0 1px 1px rgba(255,255,255,.6)' }} />
    </span>
  );
}

export default function MaterialOrb({ kind, variant, size = 36, tint }) {
  const px = Number(size) || 36;
  return kind === 'metal' ? <PlaceholderIngot size={px} variant={variant} tint={tint} /> : <PlaceholderGem size={px} variant={variant} tint={tint} />;
}
