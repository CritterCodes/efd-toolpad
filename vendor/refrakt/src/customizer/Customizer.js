'use client'
/**
 * REFRAKT — Customizer (the package's 4th surface: Viewer / Customizer / Studio / Embed).
 *
 * It IS the Studio's 3-pane UI (parts tree · 3D viewer · inspector), in a client "customize" mode
 * (decisions/0002 v2): same click-select + grouping/expand, but the inspector offers only the
 * admin-allowed presets for the selected part (no full library, no appearance/shader editing) and
 * all authoring chrome (upload / scene / save / advanced / save-as-material / group) is hidden.
 * Presets are locked — the shopper picks, never tunes. Renders INLINE (not the Studio's fullscreen
 * overlay). Emits a `RefraktSelection` live; the host (efd-shop) prices it via admin's engine — this
 * surface never prices.
 *
 * Admin authors what's customizable via `config.meshMap[].customizable` (authored by <ConfiguratorSetup>).
 * Client-only — load like the other surfaces:
 *   const Customizer = dynamic(() => import('@crittercodes/refrakt/Customizer'), { ssr: false })
 *
 * Props:
 *   glbUrl        {string}  the piece (falls back to config.glbUrl)
 *   config        {object}  a JewelryViewer config whose meshMap carries `customizable` slots
 *   materials     {array}   optional tenant materials (merged over the baseline)
 *   onConfigure   {fn}      (selection) => void — fires LIVE on every change (host re-prices)
 *   onAddToCart   {fn}      (selection) => void — optional; host commits the current selection
 *   renderContext {*}       optional; reserved for a future in-Customizer render pass
 *
 * NOTE: this surface NEVER prices. The host (efd-shop) takes the emitted RefraktSelection and
 * calls admin's pricing engine (decisions/0002 §C) — see the TODO(pricing) in Studio's emit.
 */

import Studio from '../studio/Studio'

export default function Customizer({ glbUrl, config = {}, materials, onConfigure, onAddToCart, renderContext, style, className }) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: 560, ...style }}>
      <Studio
        customize
        glbUrl={glbUrl || config.glbUrl}
        initialConfig={config}
        materials={materials}
        onConfigure={onConfigure}
        onAddToCart={onAddToCart}
        renderContext={renderContext}
      />
    </div>
  )
}
