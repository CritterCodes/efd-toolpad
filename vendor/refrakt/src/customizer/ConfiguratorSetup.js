'use client'
/**
 * REFRAKT — ConfiguratorSetup (the ADMIN authoring surface for the Customizer).
 *
 * The counterpart to <Customizer> (decisions/0002 v2): where the Customizer is the shared
 * parts-primitive in "pick ONE" mode (the shopper picks), ConfiguratorSetup is the same
 * primitive in "pick the ALLOWED SET" mode (the admin authors). For each slot on the base
 * piece it lets an admin:
 *   1. toggle "customer can change this" on/off,
 *   2. multi-select the allowed presets (constrained to real vocab — decisions/0001), and
 *   3. set the default the customer starts on,
 * and it emits the `customizable` meshMap block — the exact config-in the Customizer consumes.
 *
 * refrakt OWNS the component; the admin app embeds it in an admin screen and persists the
 * output on the product/design record. The package stays DB-agnostic — it emits, never fetches.
 *
 * A live 3D preview (the base <JewelryViewer>) sits alongside so the admin sees the piece while
 * authoring. Client-only (WebGL) — load it dynamically like the other surfaces:
 *   const ConfiguratorSetup = dynamic(() => import('@crittercodes/refrakt/ConfiguratorSetup'), { ssr: false })
 *
 * Props:
 *   glbUrl     {string}  the base piece (falls back to config.glbUrl)
 *   config     {object}  a JewelryViewer config (the base meshMap; existing `customizable`
 *                        blocks, if any, seed the initial authoring state)
 *   materials  {array}   optional tenant materials (merged over the baseline vocab)
 *   onChange   {fn}      (customizableMeshMap) => void — fires on every authoring change with the
 *                        FULL meshMap, each customizable slot carrying its `customizable` block.
 *                        This is the `viewer.customizable` block the admin persists + the
 *                        Customizer's config-in. Since 1.10.0, every METAL slot (customizable or
 *                        fixed) also carries a computed `volumeCm3` — the per-part metal volume
 *                        admin's live-pricing endpoint (decisions/0005 §6) prices from.
 *   modelUnit  {string}  'mm' | 'cm' | 'm' — the unit the source GLB is authored in (default 'cm',
 *                        matching admin's STL pipeline so an omitted unit stays consistent with the
 *                        whole-piece fallback — thread #137). Sets the model-unit³ → cm³ factor for
 *                        `volumeCm3`. refrakt never guesses the unit; the admin app states it.
 *   unitScale  {number}  optional explicit centimeters-per-model-unit; overrides modelUnit.
 */

import { useMemo, useState, useEffect, Suspense } from 'react'
import { useGLTF } from '@react-three/drei'

import JewelryViewer from '../JewelryViewer'
import { createRegistry } from '../core/registry'
import { computeSlotVolumes } from '../core/geometry'
import { optionId } from './selection'

// A slot is authorable when it targets a material (metal or gem); `ignore` slots are skipped.
const isMaterialSlot = (s) => s && (s.type === 'metal' || s.type === 'gem')

// Seed the per-slot authoring state from the base config: keep any existing `customizable`
// block (re-editing an already-authored piece), else start collapsed (not customizable).
function seedState(meshMap) {
  const st = {}
  for (const s of meshMap) {
    if (!isMaterialSlot(s)) continue
    const key = s.nameContains
    const base = s.type === 'gem' ? s.gemPreset : s.finish
    if (s.customizable) {
      const ids = (s.customizable.options ?? []).map(optionId).filter((x) => x != null)
      st[key] = {
        on: ids.length > 0,
        label: s.customizable.label ?? '',
        allowed: new Set(ids),
        default: s.customizable.default ?? base,
      }
    } else {
      st[key] = { on: false, label: '', allowed: new Set(base != null ? [base] : []), default: base }
    }
  }
  return st
}

// Build the emitted meshMap: each authored-on slot gets a `customizable` block; off slots are
// returned untouched (no `customizable` key). Options preserve the slot's material kind. Every
// METAL slot (customizable or fixed) also carries a computed `volumeCm3` when known — decisions/
// 0005 §6 prices per-part metal from it (fixed parts too), letting admin drop the whole-piece fallback.
function buildCustomizableMeshMap(meshMap, state, volumes = {}) {
  return meshMap.map((s) => {
    if (!isMaterialSlot(s)) return s
    // Geometry-derived; independent of the finish choice. Only meaningful for metal (gems price by stone).
    const vol = s.type === 'metal' ? volumes[s.nameContains] : undefined
    const withVol = (slot) => (typeof vol === 'number' ? { ...slot, volumeCm3: vol } : slot)
    const cur = state[s.nameContains]
    if (!cur || !cur.on || cur.allowed.size === 0) {
      // Not customizable → strip any prior block so the output is clean (but keep volumeCm3).
      if (s.customizable) { const { customizable, ...rest } = s; return withVol(rest) } // eslint-disable-line no-unused-vars
      return withVol(s)
    }
    const key = s.type === 'gem' ? 'gemPreset' : 'finish'
    const options = [...cur.allowed].map((id) => ({ [key]: id }))
    const def = cur.allowed.has(cur.default) ? cur.default : [...cur.allowed][0]
    const block = { options }
    if (cur.label && cur.label.trim()) block.label = cur.label.trim()
    if (def != null) block.default = def
    return withVol({ ...s, customizable: block })
  })
}

// Reads the (drei-cached) GLB scene JewelryViewer already loaded — no extra fetch — and reports
// signed per-slot volume up. Suspends on load, so it's mounted under its own <Suspense>.
function VolumeProbe({ glbUrl, meshMap, modelUnit, unitScale, onVolumes }) {
  const { scene } = useGLTF(glbUrl)
  useEffect(() => {
    if (!scene) return
    try { onVolumes(computeSlotVolumes(scene, meshMap, { modelUnit, unitScale })) }
    catch { /* geometry read is best-effort; pricing has a whole-piece fallback (0005 §6) */ }
  }, [scene, meshMap, modelUnit, unitScale, onVolumes])
  return null
}

export default function ConfiguratorSetup({ glbUrl, config = {}, materials, onChange, modelUnit = 'cm', unitScale, style, className }) {
  const registry = useMemo(() => createRegistry(materials), [materials])
  const meshMap = useMemo(() => config.meshMap ?? [], [config])
  // Per-slot geometry volume (cm³), measured from the loaded GLB by <VolumeProbe> below.
  const [volumes, setVolumes] = useState({})
  // Dedupe slots by nameContains for the authoring list (a base config may repeat a slot per mesh).
  const slots = useMemo(() => {
    const seen = new Set()
    return meshMap.filter((s) => {
      if (!isMaterialSlot(s) || seen.has(s.nameContains)) return false
      seen.add(s.nameContains)
      return true
    })
  }, [meshMap])

  const [state, setState] = useState(() => seedState(meshMap))
  // Re-seed if a different base config arrives.
  useEffect(() => { setState(seedState(meshMap)) }, [meshMap])

  // Emit the full customizable meshMap on every authoring change (+ when volumes resolve).
  useEffect(() => { onChange?.(buildCustomizableMeshMap(meshMap, state, volumes)) }, [state, meshMap, volumes]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (slot, fn) => setState((st) => ({ ...st, [slot]: fn(st[slot]) }))
  const toggleOn = (slot) => patch(slot, (s) => ({ ...s, on: !s.on }))
  const toggleAllowed = (slot, id) => patch(slot, (s) => {
    const allowed = new Set(s.allowed)
    if (allowed.has(id)) allowed.delete(id); else allowed.add(id)
    let def = s.default
    if (!allowed.has(def)) def = [...allowed][0]
    return { ...s, allowed, default: def }
  })
  const setDefault = (slot, id) => patch(slot, (s) => (s.allowed.has(id) ? { ...s, default: id } : s))
  const setLabel = (slot, label) => patch(slot, (s) => ({ ...s, label }))

  const src = glbUrl || config.glbUrl

  return (
    <div className={className} style={{ display: 'flex', gap: 20, width: '100%', minHeight: 560, color: '#f4f4f5', fontFamily: "'Geist', system-ui, sans-serif", ...style }}>
      {/* measure per-slot volume off the (cached) GLB — no render, no extra fetch */}
      <Suspense fallback={null}>
        {src && <VolumeProbe glbUrl={src} meshMap={meshMap} modelUnit={modelUnit} unitScale={unitScale} onVolumes={setVolumes} />}
      </Suspense>
      {/* live preview */}
      <div style={{ flex: '1 1 55%', minWidth: 0, borderRadius: 16, overflow: 'hidden', background: '#080808', minHeight: 560 }}>
        <JewelryViewer glbUrl={src} config={config} materials={materials} style={{ width: '100%', height: '100%', minHeight: 560 }} />
      </div>
      {/* authoring panel */}
      <div role="group" aria-label="Configurator options" style={{ flex: '1 1 45%', minWidth: 300, maxWidth: 480, overflowY: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '.18em', color: '#8a8a90', margin: '0 0 6px' }}>ADMIN · CONFIGURATOR SETUP</p>
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>What can customers change?</h2>
          <p style={{ color: '#9b9ba2', fontSize: 13, lineHeight: 1.55, margin: '8px 0 0' }}>For each part, turn on customization and choose the allowed presets. This emits the meshMap the storefront Customizer uses.</p>
        </div>

        {slots.length === 0 && (
          <p style={{ color: '#8a8a90', fontSize: 13 }}>This piece has no material slots to author.</p>
        )}

        {slots.map((s) => {
          const cur = state[s.nameContains] || { on: false, allowed: new Set(), default: null, label: '' }
          const isGem = s.type === 'gem'
          const pool = isGem ? registry.gems : registry.metals
          return (
            <section key={s.nameContains} style={{ border: '1px solid #26262b', borderRadius: 12, padding: 14, background: cur.on ? 'rgba(167,139,250,0.05)' : 'transparent' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={cur.on} onChange={() => toggleOn(s.nameContains)} aria-label={`Customer can change ${s.nameContains}`} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.nameContains}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: '#8a8a90', textTransform: 'uppercase', letterSpacing: '.1em' }}>{isGem ? 'stone' : 'metal'}</span>
              </label>

              {cur.on && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11.5, color: '#9b9ba2' }}>Customer-facing label</span>
                    <input type="text" value={cur.label} placeholder={isGem ? 'e.g. Center stone' : 'e.g. Metal'} onChange={(e) => setLabel(s.nameContains, e.target.value)}
                      style={{ background: '#0d0d0d', border: '1px solid #26262b', borderRadius: 7, padding: '7px 10px', color: '#f4f4f5', fontSize: 13 }} />
                  </label>

                  <div>
                    <span style={{ fontSize: 11.5, color: '#9b9ba2', display: 'block', marginBottom: 6 }}>Allowed presets</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
                      {pool.map((m) => {
                        const on = cur.allowed.has(m.id)
                        const isDef = cur.default === m.id
                        return (
                          <div key={m.id} style={{ position: 'relative' }}>
                            <button type="button" aria-pressed={on} onClick={() => toggleAllowed(s.nameContains, m.id)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                                border: on ? '1px solid #a78bfa' : '1px solid #26262b', background: on ? 'rgba(167,139,250,0.12)' : '#0d0d0d', color: '#f4f4f5' }}>
                              <span aria-hidden style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: m.swatch || '#888', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' }} />
                              <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                            </button>
                            {on && (
                              <button type="button" onClick={() => setDefault(s.nameContains, m.id)} title={isDef ? 'Default option' : 'Set as default'} aria-label={isDef ? `${m.label} is default` : `Set ${m.label} as default`}
                                style={{ position: 'absolute', top: 4, right: 4, fontSize: 9.5, lineHeight: 1, padding: '2px 5px', borderRadius: 5, cursor: 'pointer', border: 'none', background: isDef ? '#a78bfa' : 'rgba(255,255,255,0.08)', color: isDef ? '#0a0a0c' : '#9b9ba2', fontWeight: 700 }}>
                                {isDef ? 'DEFAULT' : 'SET'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {cur.allowed.size === 0 && (
                    <p style={{ color: '#f0b072', fontSize: 12, margin: 0 }}>Pick at least one preset, or turn customization off.</p>
                  )}
                </div>
              )}
            </section>
          )
        })}
        {/*
          PRICING (decisions/0002 §C): ConfiguratorSetup authors ONLY the allowed appearance set.
          It does NOT author prices. Live pricing is admin's separate pricing-engine pass (STL weight
          + Stuller gem prices) that the storefront calls with the Customizer's emitted RefraktSelection.
          TODO(pricing): if per-option display-hint authoring (priceDelta/availability) is ever wanted
          here, add it additively — but the authoritative price is always admin's engine, never this UI.
        */}
      </div>
    </div>
  )
}
