import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site.mjs';

export type Post = CollectionEntry<'posts'>;
export const url = (path = '') =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const postUrl = (post: Post) => url(`posts/${post.id}/`);
export const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: site.timezone }).format(date);
export const categorySlug = (name: string) => name.replace(/[\\/\s]+/g, '-');
export const tagSlug = categorySlug;
export const categoryUrl = (name: string) =>
  url(`categories/${encodeURIComponent(categorySlug(name))}/`);
// The main topic is also a category; additional categories may overlap.
export const postCategories = (post: Post) =>
  [...new Set([post.data.topic, ...post.data.categories])];
export const postTopics = (posts: Post[]) =>
  [...new Set(posts.map((post) => post.data.topic))].sort((a, b) => {
    const rank = (name: string) => {
      const index = site.topics.indexOf(name);
      return index < 0 ? site.topics.length : index;
    };
    return rank(a) - rank(b) || a.localeCompare(b, site.language);
  });
export const readingTime = (post: Post) => {
  const text = (post.body ?? '').replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '');
  const characters = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = text.match(/[a-zA-Z0-9]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(characters / 350 + words / 220));
};
export const allPosts = async () =>
  (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
