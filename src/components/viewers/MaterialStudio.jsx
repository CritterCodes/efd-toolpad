'use client';

import dynamic from 'next/dynamic';

// The packaged REFRAKT Studio — full-screen WebGL material-tagging editor; it must never SSR
// (`ssr: false` is only allowed inside a Client Component, so this thin wrapper hosts the dynamic
// import and can be rendered from anywhere). Mirrors JewelryViewerClient.jsx.
//
// M3-T1 — the ONE shared material-tagging surface, reused by Design / Product / customs authoring.
// Studio emits the full JewelryViewer config on Save; each caller supplies its own pluggable
// `onSave(config)` adapter + data-fetching:
//   Design  → design viewer/assets
//   Product → product.viewer (per-product override)
//   customs → custom-order design-model PUT (existing path)
// Keeping the dynamic import + Studio mount in one place means all three share a single code path.
const Studio = dynamic(() => import('@crittercodes/refrakt').then((m) => m.Studio), { ssr: false });

export default function MaterialStudio({ glbUrl, initialConfig, saveLabel, onClose, onSave }) {
  return (
    <Studio
      glbUrl={glbUrl}
      initialConfig={initialConfig}
      saveLabel={saveLabel}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
