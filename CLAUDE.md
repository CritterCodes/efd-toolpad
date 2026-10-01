# Claude project context

Before continuing EFD production catalog, Drops, Collections, Designs, Pieces, casting, or custom-order work, read:

- `docs/manufacturing/CLAUDE_HANDOFF_2026-07-17.md`
- `docs/manufacturing/README.md`
- `docs/manufacturing/data-model.md`
- `docs/manufacturing/PRODUCTION_PIPELINE_VISION.md`

The July 17 handoff contains newer owner decisions that supersede older assumptions in parts of the manufacturing docs, especially:

- Drops and Collections are separate.
- Do not treat "concept" as a separate admin/customer object.
- Products nav should be Catalog, Drops, Collections, Gemstones.
- Production nav should currently expose Casting.
- BARF is parked for broad EFD work; use a direct engineering loop.


Newer (2026-09-01): for Drops work specifically, also read `docs/manufacturing/DROPS_STATE_AND_FACELIFT.md` — the current-state audit and the owner's sequencing (UI facelift → listing polish → brief/open-call → release engine).

Newer (2026-09-10): before ANY product/listing/catalog work, read `docs/manufacturing/PRODUCTS_ARE_PROJECTIONS.md` — owner ruling: nobody ever authors a Product; Designs (MTO/customizer) + Pieces (RTS) are the catalog and product docs are machine-maintained projections. Never add manual product-authoring routes or UI.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- `graphify-out/` is gitignored and there is no commit hook (it would not run in worktrees, where sessions work). In a fresh worktree with no `graphify-out/graph.json`, run `graphify update .` once (~90 s, local, nothing leaves the machine). Installed 2026-09-30, scoped to this repo only (owner).
