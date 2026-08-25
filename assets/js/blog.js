/* Blog — list + detail rendering */

const API_BASE = "/.netlify/functions";
const PLACEHOLDER_IMG = "../assets/img/illustrations/blog-placeholder.svg";

const BLOG_STRINGS = {
  "es-ES": {
    loadingPosts: "Cargando entradas…",
    noPosts: "Aún no hay entradas publicadas.",
    loadError: "No se pudieron cargar las entradas. Inténtalo de nuevo más tarde.",
    emptyForFilter: "No hay entradas en esta categoría.",
    postsCount: (n) => `${n} entrada${n === 1 ? "" : "s"}`,
    errorMeta: "Error al cargar",
    readMore: "Leer entrada",
    tocEmpty: "Aún no hay entradas publicadas.",
    tocError: "Error al cargar el índice.",
    tocLoading: "Cargando…",
    postLoading: "Cargando entrada…",
    postMissing: "Falta el identificador de la entrada.",
    postNotFound: "La entrada solicitada no existe o ya no está disponible.",
    postLoadError: "No se pudo cargar la entrada.",
    postEmptySections: "Esta entrada no tiene secciones.",
    backToBlog: "← Volver al blog",
    filterAll: "Todas",
    filterClear: "Quitar filtro",
    ctaTitle: "¿Necesitas limpiar tus cristales?",
    ctaText: "Te pasamos presupuesto sin compromiso en menos de 24 h. Más de 35 años limpiando cristales en la Costa Blanca.",
    ctaButton: "Más información",
  },
  "en-GB": {
    loadingPosts: "Loading posts…",
    noPosts: "No posts published yet.",
    loadError: "The posts could not be loaded. Please try again later.",
    emptyForFilter: "No posts in this category.",
    postsCount: (n) => `${n} post${n === 1 ? "" : "s"}`,
    errorMeta: "Error loading",
    readMore: "Read post",
    tocEmpty: "No posts published yet.",
    tocError: "Error loading the index.",
    tocLoading: "Loading…",
    postLoading: "Loading post…",
    postMissing: "Missing post identifier.",
    postNotFound: "The requested post does not exist or is no longer available.",
    postLoadError: "The post could not be loaded.",
    postEmptySections: "This post has no sections.",
    backToBlog: "← Back to the blog",
    filterAll: "All",
    filterClear: "Clear filter",
    ctaTitle: "Need to clean your windows?",
    ctaText: "Get a no-obligation quote within 24 h. 35+ years cleaning windows on the Costa Blanca.",
    ctaButton: "More info",
  },
  "fr-FR": {
    loadingPosts: "Chargement des articles…",
    noPosts: "Aucun article publié pour le moment.",
    loadError: "Les articles n'ont pas pu être chargés. Veuillez réessayer plus tard.",
    emptyForFilter: "Aucun article dans cette catégorie.",
    postsCount: (n) => `${n} article${n === 1 ? "" : "s"}`,
    errorMeta: "Erreur de chargement",
    readMore: "Lire l'article",
    tocEmpty: "Aucun article publié pour le moment.",
    tocError: "Erreur de chargement de l'index.",
    tocLoading: "Chargement…",
    postLoading: "Chargement de l'article…",
    postMissing: "Identifiant de l'article manquant.",
    postNotFound: "L'article demandé n'existe pas ou n'est plus disponible.",
    postLoadError: "L'article n'a pas pu être chargé.",
    postEmptySections: "Cet article n'a pas de sections.",
    backToBlog: "← Retour au blog",
    filterAll: "Toutes",
    filterClear: "Réinitialiser",
    ctaTitle: "Besoin de nettoyer vos vitres\u00a0?",
    ctaText: "Devis gratuit sous 24 h. Plus de 35 ans à nettoyer les vitres sur la Costa Blanca.",
    ctaButton: "Plus d'infos",
  },
  "ru-RU": {
    loadingPosts: "Загрузка статей…",
    noPosts: "Статьи пока не опубликованы.",
    loadError: "Не удалось загрузить статьи. Повторите попытку позже.",
    emptyForFilter: "В этой категории пока нет статей.",
    postsCount: (n) => `${n} ${n === 1 ? "статья" : "статьи"}`,
    errorMeta: "Ошибка загрузки",
    readMore: "Читать статью",
    tocEmpty: "Статьи пока не опубликованы.",
    tocError: "Ошибка загрузки указателя.",
    tocLoading: "Загрузка…",
    postLoading: "Загрузка статьи…",
    postMissing: "Не указан идентификатор статьи.",
    postNotFound: "Запрошенная статья не существует или больше недоступна.",
    postLoadError: "Не удалось загрузить статью.",
    postEmptySections: "У этой статьи нет разделов.",
    backToBlog: "← Вернуться в блог",
    filterAll: "Все",
    filterClear: "Сбросить",
    ctaTitle: "Нужно помыть стёкла?",
    ctaText: "Бесплатный расчёт за 24 ч. Более 35 лет моем стёкла на Коста-Бланке.",
    ctaButton: "Подробнее",
  },
  "de-DE": {
    loadingPosts: "Beiträge werden geladen…",
    noPosts: "Es wurden noch keine Beiträge veröffentlicht.",
    loadError: "Die Beiträge konnten nicht geladen werden. Bitte versuchen Sie es später erneut.",
    emptyForFilter: "In dieser Kategorie sind keine Beiträge.",
    postsCount: (n) => `${n} Beitrag${n === 1 ? "" : "e"}`,
    errorMeta: "Fehler beim Laden",
    readMore: "Beitrag lesen",
    tocEmpty: "Es wurden noch keine Beiträge veröffentlicht.",
    tocError: "Fehler beim Laden des Inhaltsverzeichnisses.",
    tocLoading: "Lädt…",
    postLoading: "Beitrag wird geladen…",
    postMissing: "Beitrags-ID fehlt.",
    postNotFound: "Der angeforderte Beitrag existiert nicht oder ist nicht mehr verfügbar.",
    postLoadError: "Der Beitrag konnte nicht geladen werden.",
    postEmptySections: "Dieser Beitrag enthält keine Abschnitte.",
    backToBlog: "← Zurück zum Blog",
    filterAll: "Alle",
    filterClear: "Filter löschen",
    ctaTitle: "Fenster müssen gereinigt werden?",
    ctaText: "Kostenloses Angebot innerhalb von 24 h. Über 35 Jahre Erfahrung an der Costa Blanca.",
    ctaButton: "Mehr Info",
  },
};

function getStrings() {
  const lang = document.documentElement.lang || "es-ES";
  return BLOG_STRINGS[lang] || BLOG_STRINGS["es-ES"];
}

// Mapeo de document.documentElement.lang (p. ej. "en-GB") al código corto
// de idioma que espera la API (p. ej. "en").
const API_LOCALE_MAP = {
  "es-ES": "es",
  "en-GB": "en",
  "fr-FR": "fr",
  "de-DE": "de",
  "ru-RU": "ru",
};

function getApiLocale() {
  const lang = document.documentElement.lang || "es-ES";
  return API_LOCALE_MAP[lang] || "es";
}

// Página de presupuesto/devis correcta según el idioma del sitio.
const BUDGET_PAGE_MAP = {
  "es-ES": "presupuesto.html",
  "en-GB": "budget.html",
  "fr-FR": "devis.html",
  "de-DE": "budget.html",
  "ru-RU": "budget.html",
};

function getBudgetPage() {
  const lang = document.documentElement.lang || "es-ES";
  return BUDGET_PAGE_MAP[lang] || "presupuesto.html";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifySlug(slug) {
  return String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function markdownToHtml(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  let inUl = false;
  let inP = false;

  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inP)  { out.push("</p>");  inP  = false; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeLists(); continue; }

    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) { closeLists(); out.push(`<h3 id="${escapeHtml(slugifySlug(h3[1]))}">${escapeHtml(h3[1])}</h3>`); continue; }

    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) { closeLists(); out.push(`<h2 id="${escapeHtml(slugifySlug(h2[1]))}">${escapeHtml(h2[1])}</h2>`); continue; }

    const li = /^[-*]\s+(.+)$/.exec(line);
    if (li) {
      if (inP) { out.push("</p>"); inP = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${escapeHtml(li[1])}</li>`);
      continue;
    }

    if (!inP) { out.push("<p>"); inP = true; } else { out.push(" "); }
    out.push(escapeHtml(line));
  }
  closeLists();
  return out.join("\n");
}

function truncate(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function categoryBadgeHtml(post) {
  if (post.category && post.category.name) {
    return `<a class="post-card__category" href="?category=${encodeURIComponent(post.category.slug)}" data-filter-category="${escapeHtml(post.category.slug)}">${escapeHtml(post.category.name)}</a>`;
  }
  return "";
}

function tagsBadgesHtml(post) {
  if (!post.tags || !post.tags.length) return "";
  const items = post.tags.slice(0, 4).map((t) =>
    `<a class="post-card__tag" href="?tag=${encodeURIComponent(t.slug)}" data-filter-tag="${escapeHtml(t.slug)}">${escapeHtml(t.name)}</a>`
  ).join("");
  return `<div class="post-card__tags">${items}</div>`;
}

function buildIndexToc(posts) {
  const nav = document.getElementById("blogTocList");
  if (!nav) return;

  if (!posts.length) {
    const S = getStrings();
    nav.innerHTML = `<p class="blog-toc__empty">${S.tocEmpty}</p>`;
    return;
  }

  nav.innerHTML = posts.map((p, i) => {
    const num = String(i + 1).padStart(2, "0");
    const sub = truncate(p.excerpt || "", 90);
    const safeId = `post-${slugifySlug(p.slug)}`;
    return `
      <a class="blog-toc__link" href="#${escapeHtml(safeId)}" data-target="${escapeHtml(safeId)}">
        <span class="blog-toc__num">${num}</span>
        <h2 class="blog-toc__heading">${escapeHtml(p.title)}</h2>
        <h3 class="blog-toc__sub">${escapeHtml(sub)}</h3>
      </a>
    `;
  }).join("");

  setupTocScrollSpy(nav, posts.map((p) => `post-${slugifySlug(p.slug)}`));
  setupTocMobileToggle();
}

function buildPostToc() {
  const nav = document.getElementById("postTocList");
  const body = document.querySelector(".post-page__body");
  if (!nav || !body) return;

  const headings = body.querySelectorAll("h2[id]");
  if (!headings.length) {
    const S = getStrings();
    nav.innerHTML = `<p class="blog-toc__empty">${S.postEmptySections}</p>`;
    setupTocMobileToggle();
    return;
  }

  nav.innerHTML = Array.from(headings).map((h, i) => {
    const num = String(i + 1).padStart(2, "0");
    const title = h.textContent || "";
    const sub = (h.nextElementSibling && /^H3$/i.test(h.nextElementSibling.tagName))
      ? h.nextElementSibling.textContent
      : "";
    return `
      <a class="blog-toc__link" href="#${escapeHtml(h.id)}" data-target="${escapeHtml(h.id)}">
        <span class="blog-toc__num">${num}</span>
        <h2 class="blog-toc__heading">${escapeHtml(title)}</h2>
        <h3 class="blog-toc__sub">${escapeHtml(truncate(sub, 90))}</h3>
      </a>
    `;
  }).join("");

  setupTocScrollSpy(nav, Array.from(headings).map((h) => h.id));
  setupTocMobileToggle();
}

function setupTocScrollSpy(nav, targetIds) {
  const links = new Map();
  nav.querySelectorAll(".blog-toc__link").forEach((a) => {
    links.set(a.getAttribute("data-target"), a);
  });

  const targets = targetIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!targets.length) return;

  let active = null;
  const setActive = (id) => {
    if (active === id) return;
    active = id;
    links.forEach((a, key) => {
      a.classList.toggle("is-active", key === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) setActive(visible[0].target.id);
    },
    { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
  );
  targets.forEach((t) => observer.observe(t));

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("data-target");
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
      const toc = document.querySelector(".blog-toc");
      if (toc && toc.classList.contains("is-open")) {
        toc.classList.remove("is-open");
        const toggle = toc.querySelector(".blog-toc__toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function setupTocMobileToggle() {
  const toc = document.querySelector(".blog-toc");
  const toggle = toc && toc.querySelector(".blog-toc__toggle");
  if (!toc || !toggle) return;

  toggle.addEventListener("click", () => {
    const open = toc.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function getActiveFilters() {
  const params = new URLSearchParams(location.search);
  return {
    category: params.get("category") || "",
    tag: params.get("tag") || "",
  };
}

function buildPublicUrl(filters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  const q = params.toString();
  return q ? `?${q}` : "";
}

function renderCategoryChips(categories, filters) {
  const wrap = document.getElementById("categoryChips");
  if (!wrap) return;

  const S = getStrings();
  const allActive = !filters.category && !filters.tag;
  const items = [];
  items.push(`
    <a class="chip chip--all${allActive ? " is-active" : ""}" href="index.html" data-filter-category="">
      ${S.filterAll}
    </a>
  `);

  for (const cat of categories) {
    const isActive = cat.slug === filters.category;
    const href = filters.category === cat.slug ? "index.html" : `?category=${encodeURIComponent(cat.slug)}`;
    items.push(`
      <a class="chip${isActive ? " is-active" : ""}" href="${href}" data-filter-category="${escapeHtml(cat.slug)}">
        ${escapeHtml(cat.name)}
      </a>
    `);
  }

  if (filters.tag) {
    items.push(`<a class="chip chip--clear" href="${filters.category ? `?category=${encodeURIComponent(filters.category)}` : "index.html"}">${S.filterClear} #${escapeHtml(filters.tag)}</a>`);
  }

  wrap.innerHTML = items.join("");
}

function renderTagChips(tags, filters) {
  const wrap = document.getElementById("tagChips");
  if (!wrap || !tags.length) return;
  const items = tags.map((t) => {
    const isActive = t.slug === filters.tag;
    const href = filters.tag === t.slug
      ? (filters.category ? `?category=${encodeURIComponent(filters.category)}` : "index.html")
      : (filters.category ? `?category=${encodeURIComponent(filters.category)}&tag=${encodeURIComponent(t.slug)}` : `?tag=${encodeURIComponent(t.slug)}`);
    return `<a class="chip chip--tag${isActive ? " is-active" : ""}" href="${href}" data-filter-tag="${escapeHtml(t.slug)}">${escapeHtml(t.name)}</a>`;
  }).join("");
  wrap.innerHTML = items;
}

async function loadList() {
  const grid = document.getElementById("postGrid");
  const meta = document.getElementById("postMeta");
  const tocNav = document.getElementById("blogTocList");
  if (!grid) return;

  const S = getStrings();
  const filters = getActiveFilters();

  grid.innerHTML = `<p class="blog-empty">${S.loadingPosts}</p>`;
  if (tocNav) tocNav.innerHTML = `<p class="blog-toc__empty">${S.tocLoading}</p>`;

  const params = new URLSearchParams();
  params.set("locale", getApiLocale());
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  const url = `${API_BASE}/posts-public${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { posts, categories } = await res.json();

    renderCategoryChips(categories || [], filters);

    const allTags = new Map();
    for (const p of posts) {
      for (const t of (p.tags || [])) {
        if (!allTags.has(t.slug)) allTags.set(t.slug, t);
      }
    }
    renderTagChips(Array.from(allTags.values()), filters);

    if (!posts.length) {
      const empty = filters.category || filters.tag ? S.emptyForFilter : S.noPosts;
      grid.innerHTML = `<p class="blog-empty">${empty}</p>`;
      if (meta) meta.textContent = S.postsCount(0);
      buildIndexToc([]);
      return;
    }

    grid.innerHTML = posts.map((p, i) => {
      const num = String(i + 1).padStart(2, "0");
      const safeId = `post-${slugifySlug(p.slug)}`;
      const desc = truncate(p.excerpt || "", 80);
      const imgUrl = p.imageDataUrl || PLACEHOLDER_IMG;
      return `
        <article class="post-card" id="${escapeHtml(safeId)}">
          <div class="post-card__img" style="background-image:url('${escapeHtml(imgUrl)}')" role="img" aria-label="${escapeHtml(p.title)}">
            <span class="post-card__num">${num}</span>
          </div>
          <div class="post-card__body">
            <p class="post-card__meta">${escapeHtml(p.dateLabel)}</p>
            <h2 class="post-card__title">${escapeHtml(p.title)}</h2>
            <h3 class="post-card__desc">${escapeHtml(desc)}</h3>
            <p class="post-card__excerpt">${escapeHtml(p.excerpt || "")}</p>
            <div class="post-card__cattags">
              ${categoryBadgeHtml(p)}
              ${tagsBadgesHtml(p)}
            </div>
            <div class="post-card__foot">
              <a class="post-card__more" href="post/${encodeURIComponent(p.slug)}/">
                ${S.readMore}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </a>
              <span class="post-card__author">Limpiezas Luz de Luna</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    if (meta) meta.textContent = S.postsCount(posts.length);
    buildIndexToc(posts);
  } catch (err) {
    grid.innerHTML = `<p class="blog-error">${S.loadError}</p>`;
    if (meta) meta.textContent = S.errorMeta;
    if (tocNav) tocNav.innerHTML = `<p class="blog-toc__empty">${S.tocError}</p>`;
    console.error("Blog list error:", err);
  }
}

function getPostSlug() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("slug");
  if (fromQuery) return fromQuery;
  const match = location.pathname.match(/\/blog\/post\/([^/]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

async function loadPost() {
  const root = document.getElementById("postRoot");
  if (!root) return;

  const slug = getPostSlug();
  if (!slug) {
    const S = getStrings();
    root.innerHTML = `<p class="blog-empty">${S.postMissing}</p>`;
    return;
  }

  const S = getStrings();
  root.innerHTML = `<p class="blog-empty">${S.postLoading}</p>`;

  try {
    const res = await fetch(`${API_BASE}/posts-get?slug=${encodeURIComponent(slug)}&locale=${encodeURIComponent(getApiLocale())}`, { cache: "no-store" });
    if (res.status === 404) {
      root.innerHTML = `<p class="blog-empty">${S.postNotFound}</p>`;
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { post } = await res.json();

    document.title = `${post.title} · Blog Limpiezas Luz de Luna`;

    const catLink = post.category
      ? `<a class="post-page__category" href="../index.html?category=${encodeURIComponent(post.category.slug)}">${escapeHtml(post.category.name)}</a>`
      : "";
    const tagsList = (post.tags && post.tags.length)
      ? `<div class="post-page__tags">${post.tags.map((t) => `<a class="post-page__tag" href="../index.html?tag=${encodeURIComponent(t.slug)}">${escapeHtml(t.name)}</a>`).join("")}</div>`
      : "";

    root.innerHTML = `
      <p class="post-page__meta">${escapeHtml(post.dateLabel)}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-page__cattags">${catLink}${tagsList}</div>
      ${post.imageDataUrl ? `<img class="post-page__img" src="${escapeHtml(post.imageDataUrl)}" alt="${escapeHtml(post.title)}">` : ""}
      <div class="post-page__body">${markdownToHtml(post.body)}</div>
      <aside class="post-cta">
        <div class="post-cta__body">
          <h3 class="post-cta__title">${escapeHtml(S.ctaTitle)}</h3>
          <p class="post-cta__text">${escapeHtml(S.ctaText)}</p>
        </div>
        <a class="post-cta__btn" href="../${escapeHtml(getBudgetPage())}">
          ${escapeHtml(S.ctaButton)}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>
      </aside>
      <a class="post-page__back" href="index.html">${S.backToBlog}</a>
    `;

    buildPostToc();
  } catch (err) {
    root.innerHTML = `<p class="blog-error">${S.postLoadError}</p>`;
    console.error("Blog post error:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("postGrid")) loadList();
  if (document.getElementById("postRoot")) loadPost();
});
