import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as cheerio from 'cheerio';
import Turndown from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import katex from 'katex';

const source = new URL(process.argv[2] ?? '');
const account = source.pathname.match(/^\/([^/]+)\/article\/list\/\d+\/?$/)?.[1];
if (source.hostname !== 'blog.csdn.net' || !account || !/^[\w-]+$/.test(account)) {
  throw new Error('请提供 CSDN 作者的文章列表地址。');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const work = path.join(root, 'output', 'csdn-import', account);
const postsDir = path.join(root, 'src', 'content', 'posts');
const assetsDir = path.join(root, 'public', 'images', 'posts');
const run = promisify(execFile);
const userAgent = process.env.CSDN_USER_AGENT || 'Mozilla/5.0';
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
await fs.mkdir(work, { recursive: true });
const state = { status: 'running', total: 0, completed: [], failed: [], started: new Date().toISOString() };
const saveState = async () => {
  // One queued writer keeps progress readable while the workers finish independently.
  const snapshot = JSON.stringify(state, null, 2) + '\n';
  await fs.writeFile(path.join(work, 'state.json.tmp'), snapshot);
  await fs.rename(path.join(work, 'state.json.tmp'), path.join(work, 'state.json'));
};

async function download(url, target, referer = source.href) {
  try { return await fs.readFile(target); } catch {}
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('不支持的资源协议');
  await fs.mkdir(path.dirname(target), { recursive: true });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await run('curl', ['--location', '--fail', '--silent', '--show-error', '--max-time', '30',
        '--user-agent', userAgent, '--referer', referer, '--proto', '=http,https',
        '--proto-redir', '=http,https', '--output', target + '.partial', url]);
      await fs.rename(target + '.partial', target);
      return await fs.readFile(target);
    } catch {
      await fs.rm(target + '.partial', { force: true });
      if (attempt === 3) throw new Error('下载失败：HTTP 错误或请求超时');
      await pause(1500 * (attempt + 1));
    }
  }
}

async function listPage(page) {
  const url = new URL(`/${account}/article/list/${page}${source.search}`, source);
  const file = path.join(work, `list-${page}.html`);
  const $ = cheerio.load((await download(url.href, file)).toString());
  const posts = $('.article-list .article-item-box').map((_, element) => {
    const item = $(element);
    return {
      id: item.attr('data-articleid'),
      title: item.find('h4 a').clone().children().remove().end().text().trim(),
      description: item.find('p.content').text().trim(),
      date: item.find('.date').text().trim(),
      type: item.find('.article-type').text().trim(),
    };
  }).get();
  if (!posts.length) { await fs.rm(file, { force: true }); throw new Error(`第 ${page} 页没有读取到文章列表`); }
  const html = $.html();
  return { posts, total: Number(html.match(/var\s+listTotal\s*=\s*(\d+)/)?.[1]), pageSize: Number(html.match(/var\s+pageSize\s*=\s*(\d+)/)?.[1]) };
}

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.subarray(0, 3).toString() === 'GIF') return 'gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (/^\s*(?:<\?xml[^>]+>\s*)?<svg\b/.test(bytes.toString())) return 'svg';
  throw new Error('图片内容不是支持的图片格式');
}

const normalizeMath = text => text.replace(/[\s\u200b-\u200d\u2060-\u2064]/g, '').replaceAll('−', '-');
const mathCache = new Map();
function recoverMath(element, $) {
  const explicit = $(element).find('annotation[encoding="application/x-tex"]').text();
  if (explicit) return explicit;
  const raw = $(element).find('.katex-mathml').text();
  if (!raw) return undefined;
  if (mathCache.has(raw)) return mathCache.get(raw);
  // Older CSDN pages flatten MathML and its TeX annotation into one text node.
  // Recover the split only when rendering the TeX reproduces the MathML prefix.
  for (let offset = 1; offset < raw.length; offset++) {
    const candidate = raw.slice(offset);
    try {
      const rendered = cheerio.load(katex.renderToString(candidate, { output: 'mathml', throwOnError: true, strict: false }), null, false);
      rendered('annotation').remove();
      if (normalizeMath(raw.slice(0, offset)) === normalizeMath(rendered('semantics').text())) {
        mathCache.set(raw, candidate); return candidate;
      }
    } catch {}
  }
  mathCache.set(raw, undefined);
  return undefined;
}

function dateValue(raw) {
  const value = /T.*(?:Z|[+-]\d\d:\d\d)$/.test(raw ?? '') ? raw : raw?.replace(' ', 'T') + '+08:00';
  if (!raw || Number.isNaN(new Date(value).valueOf())) throw new Error('缺少有效的原始发布时间');
  return value;
}

function topicFor(title, tags, category) {
  const labels = `${title} ${tags.join(' ')} ${category ?? ''}`;
  if (/物理|磁场|大物|dl转化/i.test(labels)) return '学习记录';
  if (/算法|单调队列|codefor[ce]*es|\bpta\b|\bhdu\b|ICPC|蓝桥|并查集|贪心|归并|动态规划|欧几里得|二分|\bdp\b|素数|素因子/i.test(labels)) return '算法';
  return '工程实践';
}

async function importPost(item, knownIds) {
  const sourceUrl = new URL(`/${account}/article/details/${item.id}`, source).href;
  const cache = path.join(work, 'articles', `${item.id}.html`);
  const $ = cheerio.load((await download(sourceUrl, cache)).toString());
  const body = $('#content_views');
  const title = $('.title-article').text().trim();
  if (!body.length || !title) { await fs.rm(cache, { force: true }); throw new Error('无法读取完整正文'); }
  const meta = name => $(`meta[property="${name}"]`).attr('content');
  const date = dateValue(meta('article:published_time') || $('.blog-postTime').attr('data-time') || item.date);
  const updated = meta('article:modified_time');
  const tags = [...new Set((meta('article:tag') ?? '').split(/[,，]/).map(tag => tag.trim()).filter(Boolean))];
  const category = meta('article:section')?.trim();
  body.find('button,style,svg[style*="display: none"],.toc,.hljs-button,.code-toolbar .toolbar,.line-numbers-rows').remove();
  body.find('iframe').each((_, element) => {
    const src = $(element).attr('src');
    $(element).replaceWith(src ? $('<a></a>').attr('href', src).text('视频') : '');
  });
  const math = [];
  let keptMath = 0;
  const addMath = (expression, display) => {
    const token = `CSDNIMPORTMATH${math.length}END`;
    const value = expression.trim();
    math.push(display ? `$$\n${value}\n$$` : `$${value.replace(/\s*\r?\n\s*/g, ' ')}$`);
    return token;
  };
  body.find('.katex--display,.katex-display,.katex--inline').each((_, element) => {
    const expression = recoverMath(element, $);
    if (expression) $(element).replaceWith(addMath(expression, !$(element).hasClass('katex--inline')));
    else { keptMath++; $(element).attr('data-keep-math', 'true'); }
  });
  body.find('.katex').each((_, element) => {
    if ($(element).parents('[data-keep-math]').length) return;
    const expression = recoverMath(element, $);
    if (expression) $(element).replaceWith(addMath(expression, false));
    else { keptMath++; $(element).attr('data-keep-math', 'true'); }
  });
  body.find('script[type^="math/tex"]').each((_, element) => {
    $(element).replaceWith(addMath($(element).text(), /mode=display/.test($(element).attr('type'))));
  });
  body.find('script,.MathJax_Preview').remove();

  const images = new Map();
  for (const element of body.find('img').toArray()) {
    const node = $(element);
    const src = node.attr('data-src') || node.attr('src');
    if (!src) throw new Error('文章配图缺少地址');
    if (!images.has(src)) {
      const number = String(images.size + 1).padStart(2, '0');
      let bytes;
      if (src.startsWith('data:image/')) {
        const match = src.match(/^data:image\/[^;]+;base64,(.+)$/s);
        if (!match) throw new Error('不支持的内嵌图片编码');
        bytes = Buffer.from(match[1], 'base64');
      } else {
        const original = new URL(src, sourceUrl).href;
        bytes = await download(original, path.join(work, 'images', `${item.id}-${number}.bin`), sourceUrl);
      }
      const name = `image-${number}.${imageType(bytes)}`;
      const directory = path.join(assetsDir, `csdn-${item.id}`);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, name), bytes);
      images.set(src, `/images/posts/csdn-${item.id}/${name}`);
    }
    node.attr('src', images.get(src)).removeAttr('data-src').removeAttr('srcset');
    if (!node.attr('alt')) node.attr('alt', '文章配图');
  }

  body.find('a[href]').each((_, element) => {
    const node = $(element);
    try {
      const link = new URL(node.attr('href'), sourceUrl);
      const id = link.pathname.match(new RegExp(`^/${account}/article/details/(\\d+)`))?.[1];
      if (link.hostname === source.hostname && knownIds.has(id)) node.attr('href', `/posts/csdn-${id}/${link.hash}`);
    } catch {}
  });
  const first = body.find('h1,h2,h3,h4,h5,h6').first();
  if (first.text().replace(/[\s:：]/g, '') === title.replace(/[\s:：]/g, '')) first.remove();
  const headings = body.find('h1,h2,h3,h4,h5,h6').toArray();
  const minDepth = Math.min(...headings.map(element => Number(element.tagName.slice(1))));
  for (const heading of headings) heading.tagName = `h${Math.min(6, Number(heading.tagName.slice(1)) - minDepth + 2)}`;
  const fallback = body.clone().find('pre,[data-keep-math]').remove().end().find('p').map((_, element) => $(element).text().trim()).get().find(text => text.length > 15) || title;
  const description = [...(item.description || fallback).replace(/\s+/g, ' ').trim()].slice(0, 150).join('');
  const td = new Turndown({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
  td.use(gfm);
  td.addRule('code', {
    filter: node => node.nodeName === 'PRE',
    replacement: (_, node) => {
      const code = node.querySelector('code');
      const rawLang = code?.className?.match(/language-([\w+-]+)/)?.[1] ?? 'text';
      const lang = ({ py: 'python', plaintext: 'text', js: 'javascript', cplusplus: 'cpp', shell: 'bash', mysql: 'sql' })[rawLang] ?? rawLang;
      const value = (code?.textContent ?? node.textContent).replace(/\n$/, '');
      const fence = '`'.repeat(Math.max(3, ...(value.match(/`+/g) ?? []).map(part => part.length + 1)));
      return `\n\n${fence}${lang}\n${value}\n${fence}\n\n`;
    },
  });
  td.addRule('anchor', {
    filter: node => node.nodeName === 'A' && node.hasAttribute('id') && !node.getAttribute('href'),
    replacement: (_, node) => node.outerHTML.replace(/\s+class="[^"]*"/g, ''),
  });
  td.addRule('renderedMath', {
    filter: node => node.hasAttribute?.('data-keep-math'),
    replacement: (_, node) => node.outerHTML.replace(' data-keep-math="true"', ''),
  });
  let markdown = td.turndown(body.html());
  math.forEach((expression, index) => {
    const token = `CSDNIMPORTMATH${index}END`;
    markdown = markdown.replace(new RegExp(`^([ \\t]*)${token}`, 'gm'), (_, indent) => indent + expression.replace(/\n/g, '\n' + indent));
    markdown = markdown.replaceAll(token, () => expression);
  });
  const data = { title, description, date, ...(updated ? { updated: dateValue(updated) } : {}), tags, ...(category ? { category } : {}), topic: topicFor(title, tags, category) };
  const frontmatter = Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
  const destination = path.join(postsDir, `csdn-${item.id}.md`);
  // Existing blog content is never overwritten by a repeated import.
  try { await fs.writeFile(destination, `---\n${frontmatter}\n---\n\n${markdown}\n`, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return { id: item.id, title, date, images: images.size, codeBlocks: body.find('pre').length, formulas: math.length, keptMath };
}

try {
  const first = await listPage(1);
  if (!first.total || !first.pageSize) throw new Error('无法确认文章总数和分页大小');
  const discovered = [...first.posts];
  for (let page = 2; page <= Math.ceil(first.total / first.pageSize); page++) discovered.push(...(await listPage(page)).posts);
  const posts = [...new Map(discovered.map(item => [item.id, item])).values()];
  if (posts.length !== first.total) throw new Error('文章列表数量不一致，停止导入以避免遗漏');
  await fs.writeFile(path.join(work, 'articles.json'), JSON.stringify(posts, null, 2));
  state.total = posts.length;
  await saveState();
  console.log(`文章列表读取完成：${posts.length} 篇`);
  const knownIds = new Set(posts.map(item => item.id));
  let cursor = 0;
  let writes = Promise.resolve();
  async function worker() {
    while (cursor < posts.length) {
      const item = posts[cursor++];
      try { state.completed.push(await importPost(item, knownIds)); }
      catch (error) { state.failed.push({ id: item.id, title: item.title, reason: error.message }); }
      writes = writes.then(saveState);
      await writes;
      console.log(`进度 ${state.completed.length + state.failed.length}/${state.total}；成功 ${state.completed.length}，失败 ${state.failed.length}`);
      await pause(300);
    }
  }
  await Promise.all([worker(), worker()]);
  state.status = state.failed.length ? 'needs-attention' : 'complete';
  state.finished = new Date().toISOString();
  await saveState();
  console.log(`导入结束：成功 ${state.completed.length}/${state.total}；图片 ${state.completed.reduce((sum, item) => sum + item.images, 0)} 张`);
  if (state.failed.length) process.exitCode = 1;
} catch (error) {
  state.status = 'failed'; state.error = error.message;
  await saveState();
  console.error(error.message); process.exitCode = 1;
}
