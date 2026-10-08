type BrowserState = { topic: string; category: string; page: number };

const browser = document.querySelector<HTMLElement>('[data-article-browser]');
if (browser) {
  const rows = [...browser.querySelectorAll<HTMLElement>('.post-row')].map((element) => ({
    element,
    topic: element.dataset.topic!,
    categories: JSON.parse(element.dataset.categories!) as string[],
  }));
  const pageSize = Number(browser.dataset.pageSize);
  const base = new URL(browser.dataset.baseUrl!, location.origin);
  const initialTopic = browser.dataset.initialTopic ?? '';
  const initialCategory = browser.dataset.initialCategory ?? '';
  const results = browser.querySelector<HTMLElement>('[data-article-results]')!;
  const pagination = browser.querySelector<HTMLElement>('[data-browser-pagination]')!;
  const paginationStatus = pagination.querySelector<HTMLElement>('.pagination-status')!;
  const paginationLinks = pagination.querySelector<HTMLElement>('.pagination-links')!;
  const topics = new Set(rows.map((row) => row.topic));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const heading = document.querySelector<HTMLElement>('[data-browser-heading]')!;
  heading.tabIndex = -1;

  function normalize(state: BrowserState): BrowserState {
    const topic = topics.has(state.topic) ? state.topic : '';
    const topicRows = rows.filter((row) => !topic || row.topic === topic);
    const category = topic && topicRows.some((row) => row.categories.includes(state.category)) ? state.category : '';
    const count = topicRows.filter((row) => !category || row.categories.includes(category)).length;
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    const page = Number.isInteger(state.page) ? Math.max(1, Math.min(state.page, pageCount)) : 1;
    return { topic, category, page };
  }

  function readState(): BrowserState {
    const query = new URLSearchParams(location.search);
    const relativePath = location.pathname.slice(base.pathname.length);
    const pathPage = relativePath.match(/^page\/(\d+)\/?$/)?.[1];
    return normalize({
      topic: query.get('topic') ?? initialTopic,
      category: query.get('category') ?? initialCategory,
      page: Number(query.get('page') ?? pathPage ?? 1),
    });
  }

  function stateUrl(next: BrowserState) {
    const address = new URL(base);
    if (next.topic !== initialTopic || next.category !== initialCategory) {
      if (next.topic !== initialTopic) address.searchParams.set('topic', next.topic);
      if (next.category !== initialCategory) address.searchParams.set('category', next.category);
      if (next.page > 1) address.searchParams.set('page', String(next.page));
    } else if (next.page > 1) {
      address.pathname += `page/${next.page}/`;
    }
    return address.pathname + address.search;
  }

  let state = readState();

  function pageLink(label: string, page: number, className: string, relation?: string) {
    const link = document.createElement('a');
    link.className = className;
    link.textContent = label;
    link.href = stateUrl({ ...state, page });
    link.dataset.browserPage = String(page);
    if (relation) link.rel = relation;
    else {
      link.setAttribute('aria-label', `第 ${page} 页`);
      if (page === state.page) link.setAttribute('aria-current', 'page');
    }
    return link;
  }

  function disabledStep(label: string) {
    const span = document.createElement('span');
    span.className = 'pagination-step disabled';
    span.setAttribute('aria-disabled', 'true');
    span.textContent = label;
    return span;
  }

  function render(animate = false) {
    const oldHeight = results.getBoundingClientRect().height;
    results.getAnimations().forEach((animation) => animation.cancel());
    const matches = rows.filter((row) =>
      (!state.topic || row.topic === state.topic) && (!state.category || row.categories.includes(state.category)),
    );
    const start = (state.page - 1) * pageSize;
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    browser!.querySelector<HTMLElement>('[data-browser-empty]')!.hidden = matches.length > 0;
    rows.forEach((row) => { row.element.hidden = true; });
    matches.forEach((row, index) => {
      row.element.hidden = index < start || index >= start + pageSize;
      row.element.querySelector<HTMLElement>('.post-number')!.textContent = String(index + 1).padStart(2, '0');
    });
    browser!.querySelectorAll<HTMLElement>('[data-browser-year]').forEach((group) => {
      const count = group.querySelectorAll('.post-row:not([hidden])').length;
      group.hidden = count === 0;
      group.querySelector<HTMLElement>('[data-browser-year-count]')!.textContent = `本页 ${count} 篇`;
    });
    browser!.querySelectorAll<HTMLButtonElement>('button[data-topic-filter]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.topicFilter === state.topic));
    });
    browser!.querySelectorAll<HTMLElement>('[data-topic-subcategories]').forEach((group) => {
      group.hidden = group.dataset.topicSubcategories !== state.topic;
      group.querySelectorAll<HTMLButtonElement>('[data-subcategory-filter]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.subcategoryFilter === state.category));
      });
    });
    document.querySelector<HTMLElement>('[data-browser-title]')!.textContent = state.category || state.topic || browser!.dataset.defaultTitle!;
    document.querySelector<HTMLElement>('[data-browser-count]')!.textContent = String(matches.length).padStart(2, '0');
    browser!.querySelector<HTMLElement>('[data-browser-status]')!.textContent =
      `${state.category || state.topic || '全部文章'}，共 ${matches.length} 篇，第 ${state.page} / ${pageCount} 页。`;
    pagination.hidden = pageCount <= 1;
    paginationStatus.textContent = `共 ${matches.length} 篇 · 第 ${state.page} / ${pageCount} 页`;
    paginationLinks.replaceChildren();
    paginationLinks.append(state.page > 1
      ? pageLink('上一页', state.page - 1, 'pagination-step', 'prev') : disabledStep('上一页'));
    const numbers = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (number) => number === 1 || number === pageCount || Math.abs(number - state.page) <= 1,
    );
    numbers.forEach((number, index) => {
      if (index > 0 && number - numbers[index - 1] > 1) {
        const gap = document.createElement('span');
        gap.className = 'pagination-gap';
        gap.textContent = '…';
        paginationLinks.append(gap);
      }
      paginationLinks.append(pageLink(String(number), number, 'pagination-number mono'));
    });
    paginationLinks.append(state.page < pageCount
      ? pageLink('下一页', state.page + 1, 'pagination-step', 'next') : disabledStep('下一页'));
    if (animate && !reducedMotion.matches) {
      results.animate([
        { height: `${oldHeight}px`, opacity: 0.4, transform: 'translateY(4px)' },
        { height: `${results.getBoundingClientRect().height}px`, opacity: 1, transform: 'translateY(0)' },
      ], { duration: 200, easing: 'ease-out' });
    }
  }

  function handleClick(event: MouseEvent) {
    if (!(event.target instanceof Element) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const control = event.target.closest<HTMLElement>('[data-topic-filter], [data-subcategory-filter], [data-browser-page], [data-browser-reset]');
    if (!control) return;
    event.preventDefault();
    const next = normalize(control.hasAttribute('data-browser-reset')
      ? { topic: '', category: '', page: 1 }
      : control.hasAttribute('data-topic-filter')
      ? { topic: control.dataset.topicFilter!, category: '', page: 1 }
      : control.hasAttribute('data-subcategory-filter')
        ? { ...state, category: control.dataset.subcategoryFilter!, page: 1 }
        : { ...state, page: Number(control.dataset.browserPage) });
    if (state.topic === next.topic && state.category === next.category && state.page === next.page) return;
    state = next;
    history.pushState(null, '', stateUrl(state));
    render(true);
    if (control.hasAttribute('data-browser-page') || control.classList.contains('topic-label')) {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }
  }
  browser.addEventListener('click', handleClick);
  // The archive's "all articles" control resets its filters in place.
  if (base.pathname === `${import.meta.env.BASE_URL}archives/`) {
    document.querySelector<HTMLElement>('[data-browser-reset]')?.addEventListener('click', handleClick);
  }
  addEventListener('popstate', () => {
    state = readState();
    render(true);
  });
  render();
}
