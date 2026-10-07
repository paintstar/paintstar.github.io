import { allPosts, dateLabel, postUrl } from '../lib/posts';
export async function GET() {
  const posts = await allPosts();
  return Response.json(
    posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      topic: post.data.topic,
      tags: post.data.tags,
      url: postUrl(post),
      date: dateLabel(post.data.date),
      body: (post.body ?? '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' '),
    })),
  );
}
