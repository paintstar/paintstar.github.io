import { site } from '../site.mjs';
import { url, type Post } from './posts';

export interface PostPage {
  posts: Post[];
  collection: Post[];
  total: number;
  currentPage: number;
  pageCount: number;
  startIndex: number;
  basePath: string;
}

export const pageUrl = (basePath: string, page: number) =>
  url(`${basePath}${page > 1 ? `page/${page}/` : ''}`);

// Each collection is filtered before it is split into static pages.
export function postPages(posts: Post[], basePath: string): PostPage[] {
  if (!Number.isInteger(site.pageSize) || site.pageSize < 1) {
    throw new Error('pageSize 必须是正整数。');
  }
  const pageCount = Math.max(1, Math.ceil(posts.length / site.pageSize));
  return Array.from({ length: pageCount }, (_, index) => ({
    posts: posts.slice(index * site.pageSize, (index + 1) * site.pageSize),
    collection: posts,
    total: posts.length,
    currentPage: index + 1,
    pageCount,
    startIndex: index * site.pageSize,
    basePath,
  }));
}
