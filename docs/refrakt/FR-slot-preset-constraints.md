# Feature request — per-slot **preset constraints** (Studio + Customizer)

**From:** efd-admin (gem-linked jewelry designs)
**For:** REFRAKT lead
**Status:** request
**Prior art:** FR-gem-size-and-cut (1.11), FR-gem-creation-natural-lab (1.12), FR-gem-size-control (1.13)

---

## 1. What we need

Jewelry designs can now be **linked to an in-house gemstone design**: a specific mesh slot in the
jewelry GLB is declared to BE the cutter's stone, and the cutter's variants define which species
that stone may be. The chain must be *preventive*: when an artisan configures a variant's look in
the **Studio**, the linked slot's gem-preset picker should only offer what the cutter actually
cuts — never "sapphire" when the gem design has no sapphire variant. Same constraint later applies
to the shopper in the **Customizer**.

Add an optional per-slot constraint input:

```js
slotConstraints: [
  {
    nameContains: 'Amethyst', match: 'exact',   // same slot-identity rules as meshMap
    allowedGemPresets: ['amethyst', 'garnet'],  // host-computed; ONLY these presets offered
    reason: 'Linked to gem design “Solstice Cut” — species come from its active variants',
  },
]
```

Behavior when a slot matches a constraint:
- **Studio**: the gem-preset picker for that slot is filtered to `allowedGemPresets` (plus a hint
  showing `reason`). If the slot's current preset is not allowed (stale config), show it flagged
  invalid rather than silently keeping it.
- **Customizer**: customizable options for that slot are intersected with `allowedGemPresets` —
  the shopper can never pick a species the cutter doesn't offer.
- No constraint for a slot = today's behavior (full vocabulary). Purely additive.

## 2. Why REFRAKT and not the host

The host CAN validate after the fact (and will, as a backstop on save), but the point is
**prevention in the picker** — that UI lives in the Studio/Customizer. REFRAKT stays ignorant of
gem designs and rates: the host computes `allowedGemPresets` from its own data (the gem design's
active variants, species normalized to preset ids / tenant material ids) and passes a plain list.
Slot identity reuses `meshMatchesSlot` — no new matching machinery.

## 3. Notes

- Presets may include **tenant material ids** (the `materials` prop / registry) for species
  without a builtin preset — constraints should filter across both builtin GEMS and tenant
  materials uniformly.
- Constraints can change between sessions (the cutter retires a variant): re-opening a saved
  config re-applies the CURRENT constraint list, flagging now-invalid selections — the host
  re-validates at order time regardless.
- Non-goal: REFRAKT resolving which mesh corresponds to a linked gem design — the host does that
  (geometric fingerprint match using the 1.11 `measureMesh` exports) and hands over slot rules.

## 4. Acceptance

- A GLB with a constrained slot shows only the allowed presets in the Studio picker for that slot
  (others filtered), with the `reason` hint; unconstrained slots unchanged.
- A saved config whose constrained slot carries a disallowed preset renders a visible "no longer
  offered" flag when reopened.
- Customizer options for constrained slots are intersected with `allowedGemPresets`.
- Emitted selections never contain a disallowed preset for a constrained slot.
