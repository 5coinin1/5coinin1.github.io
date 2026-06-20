import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** All published posts, newest first. (drafts hidden in production) */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Map of category -> posts */
export async function getCategories(): Promise<Map<string, Post[]>> {
  const map = new Map<string, Post[]>();
  for (const p of await getPosts()) {
    const c = p.data.category;
    map.set(c, [...(map.get(c) ?? []), p]);
  }
  return map;
}

/** Map of tag -> posts */
export async function getTags(): Promise<Map<string, Post[]>> {
  const map = new Map<string, Post[]>();
  for (const p of await getPosts()) {
    for (const t of p.data.tags) map.set(t, [...(map.get(t) ?? []), p]);
  }
  return map;
}

/** Posts grouped by year, descending. */
export async function getByYear(): Promise<[number, Post[]][]> {
  const map = new Map<number, Post[]>();
  for (const p of await getPosts()) {
    const y = p.data.date.getFullYear();
    map.set(y, [...(map.get(y) ?? []), p]);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

/** URL-safe slug for a category / tag name. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
