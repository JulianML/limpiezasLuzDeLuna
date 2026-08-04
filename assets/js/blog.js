/* Blog — list + detail rendering */

const API_BASE = "/.netlify/functions";

const BLOG_STRINGS = {
  "es-ES": {
    loadingPosts: "Cargando entradas…",
    noPosts: "Aún no hay entradas publicadas.",
    loadError: "No se pudieron cargar las entradas. Inténtalo de nuevo más tarde.",
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
  },
  "en-GB": {
    loadingPosts: "Loading posts…",
    noPosts: "No posts published yet.",
    loadError: "The posts could not be loaded. Please try again later.",
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
  },
  "fr-FR": {
    loadingPosts: "Chargement des articles…",
    noPosts: "Aucun article publié pour le moment.",
    loadError: "Les articles n'ont pas pu être chargés. Veuillez réessayer plus tard.",
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
  },
  "ru-RU": {
    loadingPosts: "Загрузка статей…",
    noPosts: "Статьи пока не опубликованы.",
    loadError: "Не удалось загрузить статьи. Повторите попытку позже.",
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
  },
  "de-DE": {
    loadingPosts: "Beiträge werden geladen…",
    noPosts: "Es wurden noch keine Beiträge veröffentlicht.",
    loadError: "Die Beiträge konnten nicht geladen werden. Bitte versuchen Sie es später erneut.",
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
  },
};

function getStrings() {
  const lang = document.documentElement.lang || "es-ES";
  return BLOG_STRINGS[lang] || BLOG_STRINGS["es-ES"];
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

async function loadList() {
  const grid = document.getElementById("postGrid");
  const meta = document.getElementById("postMeta");
  const tocNav = document.getElementById("blogTocList");
  if (!grid) return;

  const S = getStrings();
  grid.innerHTML = `<p class="blog-empty">${S.loadingPosts}</p>`;
  if (tocNav) tocNav.innerHTML = `<p class="blog-toc__empty">${S.tocLoading}</p>`;

  try {
    const res = await fetch(`${API_BASE}/posts-public`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { posts } = await res.json();

    if (!posts.length) {
      grid.innerHTML = `<p class="blog-empty">${S.noPosts}</p>`;
      if (meta) meta.textContent = S.postsCount(0);
      buildIndexToc([]);
      return;
    }

    grid.innerHTML = posts.map((p, i) => {
      const num = String(i + 1).padStart(2, "0");
      const safeId = `post-${slugifySlug(p.slug)}`;
      const desc = truncate(p.excerpt || "", 140);
      return `
        <article class="post-card" id="${escapeHtml(safeId)}">
          <div class="post-card__img" style="background-image:url('${escapeHtml(p.imageDataUrl || "")}')" role="img" aria-label="${escapeHtml(p.title)}">
            <span class="post-card__num">${num}</span>
          </div>
          <div class="post-card__body">
            <p class="post-card__meta">${escapeHtml(p.dateLabel)}</p>
            <h2 class="post-card__title">${escapeHtml(p.title)}</h2>
            <h3 class="post-card__desc">${escapeHtml(desc)}</h3>
            <p class="post-card__excerpt">${escapeHtml(p.excerpt || "")}</p>
            <div class="post-card__foot">
              <a class="post-card__more" href="post.html?slug=${encodeURIComponent(p.slug)}">
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

async function loadPost() {
  const root = document.getElementById("postRoot");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  if (!slug) {
    const S = getStrings();
    root.innerHTML = `<p class="blog-empty">${S.postMissing}</p>`;
    return;
  }

  const S = getStrings();
  root.innerHTML = `<p class="blog-empty">${S.postLoading}</p>`;

  try {
    const res = await fetch(`${API_BASE}/posts-get?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (res.status === 404) {
      root.innerHTML = `<p class="blog-empty">${S.postNotFound}</p>`;
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { post } = await res.json();

    document.title = `${post.title} · Blog Limpiezas Luz de Luna`;

    root.innerHTML = `
      <p class="post-page__meta">${escapeHtml(post.dateLabel)}</p>
      <h1>${escapeHtml(post.title)}</h1>
      ${post.imageDataUrl ? `<img class="post-page__img" src="${escapeHtml(post.imageDataUrl)}" alt="${escapeHtml(post.title)}">` : ""}
      <div class="post-page__body">${markdownToHtml(post.body)}</div>
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
