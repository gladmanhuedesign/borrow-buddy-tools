interface FormattedDescriptionProps {
  text?: string | null;
}

/**
 * Renders a tool description that may contain section headings (e.g. "Common uses:")
 * followed by lines starting with "-" as proper bullet lists.
 */
export const FormattedDescription = ({ text }: FormattedDescriptionProps) => {
  if (!text) return null;

  // Split into blocks separated by blank lines
  const blocks = text.split(/\n\s*\n/);

  return (
    <div className="mt-1 space-y-3 text-muted-foreground">
      {blocks.map((block, blockIdx) => {
        const lines = block.split("\n").map((l) => l.trimEnd()).filter(Boolean);
        if (lines.length === 0) return null;

        // Detect a heading like "Common uses:" on its own line
        const first = lines[0];
        const headingMatch = /^[A-Z][^-•:]{0,40}:$/.test(first);
        const heading = headingMatch ? first : null;
        const body = headingMatch ? lines.slice(1) : lines;

        // Identify bullet lines (start with - or •)
        const bulletLines = body.filter((l) => /^[-•]\s+/.test(l));
        const isBulletBlock = bulletLines.length > 0 && bulletLines.length === body.length;

        return (
          <div key={blockIdx} className="space-y-1.5">
            {heading && (
              <p className="font-medium text-foreground">{heading.replace(/:$/, "")}</p>
            )}
            {isBulletBlock ? (
              <ul className="list-disc space-y-1 pl-5 marker:text-primary/70">
                {body.map((l, i) => (
                  <li key={i}>{l.replace(/^[-•]\s+/, "")}</li>
                ))}
              </ul>
            ) : (
              body.map((l, i) =>
                /^[-•]\s+/.test(l) ? (
                  <ul key={i} className="list-disc pl-5 marker:text-primary/70">
                    <li>{l.replace(/^[-•]\s+/, "")}</li>
                  </ul>
                ) : (
                  <p key={i}>{l}</p>
                )
              )
            )}
          </div>
        );
      })}
    </div>
  );
};
