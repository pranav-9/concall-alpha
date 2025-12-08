import { SECTIONS } from "../constants";

export function SidebarNavigation() {
  return (
    <div className="hidden lg:block sticky top-6 h-fit w-1/6">
      <nav className="bg-gray-900 rounded-lg p-4 space-y-1.5">
        <h3 className="font-bold text-xs text-gray-300 mb-3 uppercase tracking-wide">
          Sections
        </h3>
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="block px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            {section.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
