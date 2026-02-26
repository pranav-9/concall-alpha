export const normalizeSectorKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

export const slugifySector = (name: string) =>
  normalizeSectorKey(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const findSectorBySlug = (slug: string, sectors: string[]) => {
  const target = slug.trim().toLowerCase();
  for (const sector of sectors) {
    if (slugifySector(sector) === target) return sector;
  }
  return null;
};
