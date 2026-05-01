export function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

  return slug || "item";
}

export async function makeUniqueSlug(
  value: string,
  exists: (slug: string) => Promise<boolean>,
) {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (await exists(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
