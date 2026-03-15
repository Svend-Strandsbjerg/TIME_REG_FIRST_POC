# AI Enrichment (Future)

The Activity Graph prepares an extension point for AI-assisted planning without coupling AI logic into UI components.

## Future opportunities

- Suggest activities based on calendar patterns.
- Propose `ActivityInstance` duration based on history.
- Rank candidate blocks for planning priority.
- Propose PSP/project metadata before draft creation.

## Architectural rule

AI enrichment should produce or enrich `Activity` / `ActivityInstance` data. Core placement rules and queue dispatch responsibilities remain unchanged.
