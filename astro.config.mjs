import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { site } from './src/site.mjs';

// Keep content asset links valid when moving the blog under a subdirectory.
function contentLinks() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element') {
        if (node.properties?.className?.includes('katex-error')) {
          throw new Error('数学公式渲染失败，请检查文章中的 LaTeX 语法。');
        }
        for (const key of ['src', 'href']) {
          const value = node.properties?.[key];
          if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
            node.properties[key] = `${site.base.replace(/\/$/, '')}${value}`;
          }
        }
        if (node.tagName === 'img') node.properties.loading = 'lazy';
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  site: site.url,
  base: site.base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      smartypants: false,
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeKatex, { strict: 'error', throwOnError: true, trust: false }],
        contentLinks,
      ],
      shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, wrap: false },
    }),
  },
});
