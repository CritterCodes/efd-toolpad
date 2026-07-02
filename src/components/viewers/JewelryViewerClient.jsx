'use client';

import dynamic from 'next/dynamic';

// REFRAKT JewelryViewer is a WebGL/r3f component — it must never SSR. `ssr: false`
// is only allowed inside a Client Component, so this thin wrapper hosts the dynamic
// import and can be rendered from anywhere. Mirrors efd-shop's JewelryViewerClient.
const JewelryViewer = dynamic(() => import('@crittercodes/refrakt/JewelryViewer'), {
  ssr: false,
});

// Default AI-render handler → our admin-only Gemini route. Shows the Generate-render
// button; callers can pass their own `onRender`/`onSaveRender` or `onRender={null}`.
async function renderViaGemini({ image, prompt, materials, scene, context }) {
  const res = await fetch('/api/refrakt-render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, prompt, materials, scene, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Render failed.');
  return data.url;
}

export default function JewelryViewerClient({ onRender = renderViaGemini, ...props }) {
  return <JewelryViewer onRender={onRender} {...props} />;
}
