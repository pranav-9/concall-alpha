"use client";

import { useState } from "react";

interface ExpandableTextProps {
  text: string;
  className?: string;
  buttonClassName?: string;
  previewLines?: number;
}

export function ExpandableText({
  text,
  className = "",
  buttonClassName = "",
  previewLines = 2,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const clampClass =
    previewLines === 2
      ? "line-clamp-2"
      : previewLines === 3
        ? "line-clamp-3"
        : "line-clamp-2";

  return (
    <div className="max-w-4xl">
      <p className={`${className} ${isExpanded ? "" : clampClass}`.trim()}>{text}</p>
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className={`mt-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground ${buttonClassName}`.trim()}
      >
        {isExpanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
