import { SECTIONS } from "../constants";

export function SidebarNavigation() {
  return (
    <div className="hidden lg:block sticky top-6 h-fit w-1/6">
      <nav className="bg-card border border-border rounded-lg p-4 space-y-1.5">
        <h3 className="font-bold text-xs text-muted-foreground mb-3 uppercase tracking-wide">
          Sections
        </h3>
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="block px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {section.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
