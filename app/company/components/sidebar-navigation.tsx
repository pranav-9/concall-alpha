import { SECTIONS } from "../constants";

export function SidebarNavigation() {
  return (
    <div className="hidden lg:block sticky top-8 h-fit w-1/6">
      <nav className="bg-gray-900 rounded-xl p-6 space-y-2">
        <h3 className="font-bold text-sm text-gray-300 mb-4 uppercase tracking-wide">
          Sections
        </h3>
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            {section.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
