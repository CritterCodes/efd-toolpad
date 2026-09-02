# variants.md — design theses for the My-Bench run

Each variant gets ONE thesis. The point is *diversity* — four genuinely different bets, not
four reskins. Branch naming: `ux-lab/my-bench/v1-bench-tablet`, `v2-triage-density`, etc.

## v1 — Bench tablet, tap-first
Optimize for a jeweler standing at the bench with a tablet and a barcode scanner.
- Large touch targets; the primary action on each card is one big tap.
- Scan-to-claim is the hero of the screen, not a row buried in the header.
- Collapse secondary actions behind an overflow so the common path is uncluttered.
- Assume gloves/imperfect taps: generous spacing, no tiny icon-only buttons for key actions.

## v2 — Triage density
Optimize for a jeweler with 30+ work orders who needs to scan and act fast.
- Replace big cards with compact, scannable rows (still tappable).
- Surface the decision-critical signal first: rush, due date, queue, who it's assigned to.
- Keyboard/scanner-friendly: act on the top item without hunting.
- More work visible per screen without feeling cramped.

## v3 — "Next job" focus
Reduce decision fatigue — tell the jeweler the single most important thing to do next.
- A prominent "Next up" surface (most overdue / rush / oldest in-progress) above the grid.
- Minimize tab-hopping: bring the few items that need action to the top regardless of tab.
- One-glance answer to "what should I touch right now."

## v4 — Status-stream / lanes
Reframe the queue tabs as a horizontal flow the jeweler can see at once.
- Show Unclaimed → In Progress → QC as lanes/columns instead of one-tab-at-a-time.
- Make movement between states feel like moving a card along the flow.
- Keep it usable on a narrow tablet (lanes can stack/scroll on small screens).

---

Add or swap theses freely between nights. Winners from a prior night can seed a new set of
theses (e.g. "v2 won — now explore three variations of triage density").
