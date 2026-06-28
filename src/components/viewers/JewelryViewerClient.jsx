'use client';

import dynamic from 'next/dynamic';

// REFRAKT JewelryViewer is a WebGL/r3f component — it must never SSR. `ssr: false`
// is only allowed inside a Client Component, so this thin wrapper hosts the dynamic
// import and can be rendered from anywhere. Mirrors efd-shop's JewelryViewerClient.
const JewelryViewer = dynamic(() => import('@crittercodes/refrakt/JewelryViewer'), {
  ssr: false,
});

export default function JewelryViewerClient(props) {
  return <JewelryViewer {...props} />;
}
