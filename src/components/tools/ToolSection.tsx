import { ReactNode } from "react";
import { FormattedDescription } from "./FormattedDescription";
import { cn } from "@/lib/utils";

interface ToolSectionProps {
  title: string;
  text?: string | null;
  icon?: ReactNode;
  variant?: "default" | "warning";
  className?: string;
}

/**
 * Renders one structured tool section (heading + formatted body).
 * Returns null when there's nothing to show, so parent layouts can
 * just stack a list of <ToolSection /> instances unconditionally.
 */
export const ToolSection = ({
  title,
  text,
  icon,
  variant = "default",
  className,
}: ToolSectionProps) => {
  if (!text || !text.trim()) return null;

  return (
    <section
      className={cn(
        "space-y-1.5",
        variant === "warning" &&
          "rounded-lg bg-destructive/10 p-4",
        className
      )}
    >
      <h2
        className={cn(
          "flex items-center gap-2 font-medium",
          variant === "warning" ? "text-destructive" : "text-foreground"
        )}
      >
        {icon}
        {title}
      </h2>
      <FormattedDescription text={text} />
    </section>
  );
};
