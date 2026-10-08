type SearchPost = {
  title: string;
  description: string;
  tags: string[];
  topic: string;
  categories: string[];
  body: string;
  url: string;
  date: string;
};
const root = document.documentElement;
const themePicker = document.querySelector<HTMLDetailsElement>('#theme-picker');
function updateTheme() {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeOption === root.dataset.theme));
  });
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
}
document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((button) => {
  button.addEventListener('click', () => {
    root.dataset.theme = button.dataset.themeOption;
    try {
      localStorage.setItem('shin-theme', root.dataset.theme!);
    } catch {}
    updateTheme();
    if (themePicker) themePicker.open = false;
    themePicker?.querySelector('summary')?.focus();
  });
});
document.addEventListener('click', (event) => {
  if (themePicker && !themePicker.contains(event.target as Node)) themePicker.open = false;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && themePicker?.open) {
    themePicker.open = false;
    themePicker.querySelector('summary')?.focus();
  }
});
updateTheme();

// Keep the hierarchy links usable on direct visits and without JavaScript.
// A visit from another page on this site can also return to its original scroll position.
if (document.referrer && history.length > 1) {
  const previous = new URL(document.referrer);
  if (
    previous.origin === location.origin &&
    previous.pathname.startsWith(import.meta.env.BASE_URL) &&
    previous.pathname !== location.pathname
  ) {
    document.querySelectorAll<HTMLAnchorElement>('[data-return-link]').forEach((link) => {
      link.href = previous.href;
      link.textContent = '← 返回上一页';
      link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        history.back();
      });
    });
  }
}

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-input');
const results = document.querySelector<HTMLDivElement>('#search-results');
const searchStatus = document.querySelector<HTMLParagraphElement>('#search-status');
let index: SearchPost[] | undefined;
let indexRequest: Promise<SearchPost[]> | undefined;
let selected = -1;
let searchVersion = 0;
async function loadIndex() {
  if (index) return index;
  indexRequest ??= fetch(dialog!.dataset.indexUrl!)
    .then((response) => {
      if (!response.ok) throw new Error('Search index unavailable');
      return response.json() as Promise<SearchPost[]>;
    })
    .then((data) => (index = data))
    .catch((error) => {
      indexRequest = undefined;
      throw error;
    });
  return indexRequest;
}
async function search() {
  if (!input || !results || !searchStatus) return;
  const version = ++searchVersion;
  const query = input.value.trim().toLocaleLowerCase();
  results.replaceChildren();
  selected = -1;
  if (!query) {
    searchStatus.textContent = '搜索文章标题、标签和正文。';
    return;
  }
  searchStatus.textContent = '正在搜索…';
  try {
    const posts = await loadIndex();
    if (version !== searchVersion) return;
    const terms = query.split(/\s+/);
    const matches = posts
      .map((post) => {
        const title = post.title.toLocaleLowerCase();
        const labels = `${post.categories.join(' ')} ${post.tags.join(' ')}`.toLocaleLowerCase();
        const text = `${title} ${labels} ${post.description} ${post.body}`.toLocaleLowerCase();
        return {
          post,
          score: terms.every((term) => text.includes(term))
            ? terms.reduce(
                (score, term) => score + (title.includes(term) ? 4 : labels.includes(term) ? 2 : 1),
                0,
              )
            : 0,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    searchStatus.textContent = matches.length
      ? `找到 ${matches.length} 篇笔记`
      : '没有找到相关笔记，试试其他关键词。';
    for (const { post } of matches) {
      const link = document.createElement('a');
      link.href = post.url;
      link.className = 'search-result';
      const meta = document.createElement('span');
      meta.className = 'post-meta';
      meta.textContent = `${post.topic} / ${post.date}`;
      const title = document.createElement('strong');
      title.textContent = post.title;
      const description = document.createElement('p');
      description.textContent = post.description;
      link.append(meta, title, description);
      results.append(link);
    }
  } catch {
    if (version === searchVersion)
      searchStatus.textContent = '搜索暂时无法加载，请重试。你也可以在归档中浏览文章。';
  }
}
function openSearch() {
  if (!dialog || dialog.open) return;
  dialog.showModal();
  input?.focus();
  void search();
}
document.querySelector('#open-search')?.addEventListener('click', openSearch);
document.querySelector('#close-search')?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (
    event.target === dialog &&
    (event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom)
  )
    dialog.close();
});
input?.addEventListener('input', () => {
  void search();
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
  if (!dialog?.open || !results) return;
  const links = [...results.querySelectorAll<HTMLAnchorElement>('a')];
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && links.length) {
    event.preventDefault();
    selected =
      selected === -1
        ? event.key === 'ArrowDown'
          ? 0
          : links.length - 1
        : (selected + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    links.forEach((link, i) => link.classList.toggle('selected', i === selected));
    links[selected].focus();
  }
  if (event.key === 'Enter' && selected >= 0 && document.activeElement === input)
    links[selected]?.click();
});

document.querySelectorAll<HTMLPreElement>('.prose pre').forEach((pre) => {
  const button = document.createElement('button');
  button.className = 'copy-code';
  button.textContent = '复制';
  button.setAttribute('aria-label', '复制代码');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
      button.textContent = '已复制';
    } catch {
      button.textContent = '复制失败';
    }
    setTimeout(() => {
      button.textContent = '复制';
    }, 1800);
  });
  pre.append(button);
});

const progress = document.querySelector<HTMLElement>('.reading-progress');
if (progress) {
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}
const tocLinks = document.querySelectorAll<HTMLAnchorElement>('.toc a');
if (tocLinks.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        tocLinks.forEach((link) => {
          const active = decodeURIComponent(link.hash.slice(1)) === entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    },
    { rootMargin: '-12% 0px -65% 0px' },
  );
  document.querySelectorAll('.prose :is(h2,h3,h4)').forEach((heading) => observer.observe(heading));
}
