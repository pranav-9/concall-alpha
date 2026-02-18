import React from "react";
import { Badge } from "@/components/ui/badge"; // adjust path if needed

type Size = "sm" | "md" | "lg";

export const categoryFor = (score: number) => {
  if (score >= 9.5)
    return {
      label: "Exceptional Bullish",
      bg: "bg-emerald-300",
      ring: "ring-emerald-200/75",
    };
  if (score >= 9)
    return {
      label: "Very Strongly Bullish",
      bg: "bg-emerald-300",
      ring: "ring-emerald-300/55",
    };
  if (score >= 8.5)
    return {
      label: "Strongly Bullish",
      bg: "bg-emerald-400",
      ring: "ring-emerald-700/28",
    };
  if (score >= 7.5)
    return {
      label: "Mildly Bullish",
      bg: "bg-green-500",
      ring: "ring-green-700/25",
    };
  if (score > 6.5)
    return { label: "Neutral", bg: "bg-amber-400", ring: "ring-amber-700/25" };
  if (score >= 5)
    return {
      label: "Mildly Bearish",
      bg: "bg-orange-500",
      ring: "ring-orange-700/25",
    };
  return {
    label: "Strongly Bearish",
    bg: "bg-red-500",
    ring: "ring-red-700/25",
  };
};

interface ConcallScoreProps {
  score: number | string;
  size?: Size; // "sm" | "md" | "lg"
  showLabel?: boolean; // show text label next to the badge
  className?: string;
}

const sizeMap: Record<Size, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

const ConcallScore: React.FC<ConcallScoreProps> = ({
  score,
  size = "md",
  showLabel = false,
  className = "",
}) => {
  const n = Number(score) || 0;
  const cat = categoryFor(n);

  return (
    <div className="inline-flex items-center gap-2">
      <Badge
        aria-label={`Concall sentiment ${n.toFixed(1)} — ${cat.label}`}
        title={cat.label}
        className={[
          "rounded-full aspect-square grid place-items-center font-extrabold text-black",
          "shadow-sm ring-4",
          sizeMap[size],
          cat.bg,
          cat.ring,
          className,
        ].join(" ")}
      >
        {n.toFixed(1)}
      </Badge>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{cat.label}</span>
      )}
    </div>
  );
};

export default ConcallScore;

// Optional skeleton for loading states
export const ConcallScoreSkeleton = () => (
  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
);
