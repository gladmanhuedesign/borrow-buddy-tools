## Goal

Replace the single freeform `description` field on tools with multiple structured sections, so tool pages are scannable and consistent.

## Proposed sections

Required core:
1. **Short description** — 1–2 sentence summary (shown in cards/search/feeds)
2. **Common uses** — bullet list of typical tasks the tool is good for
3. **How to use** — step-by-step usage / operating instructions (replaces today's "Usage Instructions")
4. **Common projects** — example projects/scenarios where this tool shines

Recommended additional sections (high value, low friction):
5. **Safety tips** — important PPE / hazards / things not to do
6. **What's included** — accessories, bits, batteries, attachments that come with this specific tool
7. **Tips & tricks** — owner's personal tips ("works best with X blade", "battery lasts ~30 min")

All sections except Short description are optional. Short description is required.

## Database changes

Add new columns to `tools` (all nullable except `short_description` stays nullable for backward-compat with existing rows):

- `short_description text`
- `common_uses text` (markdown / newline-separated bullets)
- `how_to_use text`
- `common_projects text`
- `safety_tips text`
- `whats_included text`
- `tips_and_tricks text`

Keep the existing `description` column for now as a fallback so old tools still render. A one-time backfill copies `description` into `short_description` where empty. We can deprecate `description` later.

## AI analysis update (`analyze-tool-image` edge function)

Extend the Gemini tool-call schema so the AI returns the new structured fields directly when scanning a tool image. New properties on `analyze_tool`:
- `short_description` (string, ~200 chars)
- `common_uses` (array of strings)
- `how_to_use` (array of strings, ordered steps)
- `common_projects` (array of strings)
- `safety_tips` (array of strings)
- `whats_included` (string, optional — usually the AI can't know this)
- `tips_and_tricks` (string, optional)

Arrays are joined into newline-prefixed bullets ("- item") on the client so they store as text and render through the existing `FormattedDescription` component (which already handles bullet blocks).

The legacy `description` field stays in the response (assembled from the sections) so anything still reading it keeps working.

## UI changes

**AddTool.tsx / EditTool.tsx**
- Replace the single Description textarea with a stacked set of labeled textareas: Short description, Common uses, How to use, Common projects, Safety tips, What's included, Tips & tricks.
- Each non-required section sits inside a collapsible "Add more details" group so the form doesn't feel overwhelming. Short description + Common uses are visible by default.
- AI scan auto-fills all sections it returned; user can edit any of them before saving.
- Batch-mode (multi-image) flow uses the same structured fields per draft.

**ToolDetail.tsx**
- Replace the current "Description of Use" + "Usage Instructions" blocks with a section list:
  - Short description (lead paragraph, larger text)
  - Common uses (bulleted)
  - How to use (numbered or bulleted steps)
  - Common projects (bulleted)
  - Safety tips (bulleted, with subtle warning accent)
  - What's included (bulleted)
  - Tips & tricks (paragraph)
- Each section only renders if it has content. Falls back to the legacy `description` when no new fields are populated.
- Uses existing `FormattedDescription` for bullet rendering; adds a small `ToolSection` wrapper component for the heading + content layout.

**Tool cards / search results / feeds**
- Switch any place currently showing `description` to prefer `short_description`, falling back to `description`.

## Technical details

Files touched:
- New migration: add 7 columns to `public.tools`, plus a one-time `UPDATE tools SET short_description = description WHERE short_description IS NULL AND description IS NOT NULL`.
- `supabase/functions/analyze-tool-image/index.ts` — extend tool schema + assemble fallback `description`.
- `supabase/functions/batch-analyze-tools/index.ts` — pass through new fields when updating tools.
- `src/types/index.ts` — add new optional fields to `Tool`.
- `src/types/toolDraft.ts` — extend `aiSuggestion` and `formData` shapes.
- `src/pages/tools/AddTool.tsx` — new form fields + AI populate logic.
- `src/pages/tools/EditTool.tsx` — same form structure for editing.
- `src/pages/tools/ToolDetail.tsx` — new sectioned layout.
- New: `src/components/tools/ToolSection.tsx` — small reusable heading+body wrapper.
- Card/search components that show `description` — fall back chain `short_description ?? description`.

No breaking changes for existing tools: legacy `description` is preserved and rendered when no structured sections exist.

## Out of scope (can be follow-ups)
- Removing the legacy `description` column.
- Dedicated structured types (e.g. true JSONB array per section) — sticking with text + bullet lines keeps it consistent with how content renders today.
- Per-section AI re-generation buttons.

## Question before I build

Are the 7 sections above the right set, or do you want to drop/add any (e.g. skip "What's included" and "Tips & tricks")? I'll proceed with all 7 unless you say otherwise.