/**
 * Helpers for the structured description sections on tools.
 *
 * Sections are stored as plain text in the database (one column per section).
 * Bulleted sections (common uses, how to use, etc.) use lines prefixed with
 * "- " so they render as proper bullet lists via <FormattedDescription />.
 */

export interface ToolSections {
  short_description?: string | null;
  common_uses?: string | null;
  how_to_use?: string | null;
  common_projects?: string | null;
  safety_tips?: string | null;
  whats_included?: string | null;
  tips_and_tricks?: string | null;
}

/** Convert an array of bullet strings into newline-separated "- item" lines. */
export const arrayToBullets = (items?: string[] | null): string => {
  if (!items || items.length === 0) return "";
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("-") || s.startsWith("•") ? s : `- ${s}`))
    .join("\n");
};

/** True when the tool has at least one populated structured section. */
export const hasAnyStructuredSection = (t: ToolSections): boolean => {
  return Boolean(
    t.short_description ||
      t.common_uses ||
      t.how_to_use ||
      t.common_projects ||
      t.safety_tips ||
      t.whats_included ||
      t.tips_and_tricks
  );
};

/** Pick the best summary string for cards/search/feeds. */
export const pickSummary = (
  shortDescription?: string | null,
  legacyDescription?: string | null
): string => {
  return (shortDescription?.trim() || legacyDescription?.trim() || "").trim();
};
