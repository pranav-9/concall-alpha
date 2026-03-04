import ConcallScore from "@/components/concall-score";
import type { CompanySidebarSectionItem } from "../constants";

type SidebarNavigationProps = {
  sections: CompanySidebarSectionItem[];
};

export function SidebarNavigation({ sections }: SidebarNavigationProps) {
  return (
    <div className="hidden lg:block sticky top-6 h-fit w-1/6">
      <nav className="bg-card border border-border rounded-lg p-4 space-y-1.5">
        <h3 className="font-bold text-xs text-muted-foreground mb-3 uppercase tracking-wide">
          Sections
        </h3>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="min-w-0 truncate">{section.label}</span>
            {section.meta ? (
              section.meta.kind === "score" ? (
                typeof section.meta.score === "number" ? (
                  <ConcallScore
                    score={section.meta.score}
                    size="sm"
                    className="h-6 w-6 text-[10px] ring-2"
                  />
                ) : (
                  <span className="shrink-0 rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    —
                  </span>
                )
              ) : section.meta.kind === "count" ? (
                <span className="shrink-0 rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {section.meta.count}
                  {section.meta.suffix ? ` ${section.meta.suffix}` : ""}
                </span>
              ) : (
                <span className="max-w-[8rem] shrink-0 truncate rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {section.meta.text}
                </span>
              )
            ) : null}
          </a>
        ))}
      </nav>
    </div>
  );
}
