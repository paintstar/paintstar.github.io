import rss from '@astrojs/rss';
import { allPosts, postUrl } from '../lib/posts';
import { site } from '../site.mjs';
export async function GET() {
  return rss({
    title: site.name,
    description: site.description,
    site: site.url,
    items: (await allPosts()).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post),
    })),
    customData: `<language>${site.language}</language>`,
  });
}
