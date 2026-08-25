#!/usr/bin/env node
/**
 * Render — genera HTML estático por cada entrada publicada del blog,
 * para cada idioma soportado (es, en, fr, de, ru).
 *
 * Para cada post `published = 1` con slug `x` y locale `L`, produce
 *   _site/<L>/blog/post/x/index.html   (o _site/blog/post/x/index.html si L = es)
 * tomando como plantilla `<L>/blog/post.html`, sustituyendo
 * `#postRoot` y `#postTocList` por el contenido real
 * y rellenando <title>, meta description y OG tags.
 *
 * Nota: el redirect dinámico de netlify.toml (`force = true`) hace que en
 * producción este HTML pre-renderizado nunca se sirva realmente — el blog
 * siempre se pinta en cliente vía blog.js. Este script es solo un "nice to
 * have" de consistencia (SEO/fallback sin JS), no una ruta crítica.
 *
 * Si no hay variables TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en el entorno
 * (p. ej. CI sin secretos), se omite silenciosamente.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// Un locale por carpeta de idioma (raíz = español). Cada uno tiene su propia
// plantilla `*/blog/post.html`, su página de presupuesto/devis y sus textos
// fijos (CTA, "volver al blog", etc.).
const LOCALES = [
  { code: "es", dir: "" },
  { code: "en", dir: "en" },
  { code: "fr", dir: "fr" },
  { code: "de", dir: "de" },
  { code: "ru", dir: "ru" },
];

const BUDGET_PAGE = { es: "presupuesto.html", en: "budget.html", fr: "devis.html", de: "budget.html", ru: "budget.html" };

const STRINGS = {
  es: {
    ctaTitle: "¿Necesitas limpiar tus cristales?",
    ctaText: "Te pasamos presupuesto sin compromiso en menos de 24 h. Más de 35 años limpiando cristales en la Costa Blanca.",
    ctaButton: "Más información",
    backToBlog: "← Volver al blog",
    emptySections: "Esta entrada no tiene secciones.",
  },
  en: {
    ctaTitle: "Need to clean your windows?",
    ctaText: "Get a no-obligation quote within 24 h. 35+ years cleaning windows on the Costa Blanca.",
    ctaButton: "More info",
    backToBlog: "← Back to the blog",
    emptySections: "This post has no sections.",
  },
  fr: {
    ctaTitle: "Besoin de nettoyer vos vitres ?",
    ctaText: "Devis gratuit sous 24 h. Plus de 35 ans à nettoyer les vitres sur la Costa Blanca.",
    ctaButton: "Plus d'infos",
    backToBlog: "← Retour au blog",
    emptySections: "Cet article n'a pas de sections.",
  },
  de: {
    ctaTitle: "Fenster müssen gereinigt werden?",
    ctaText: "Kostenloses Angebot innerhalb von 24 h. Über 35 Jahre Erfahrung an der Costa Blanca.",
    ctaButton: "Mehr Info",
    backToBlog: "← Zurück zum Blog",
    emptySections: "Dieser Beitrag enthält keine Abschnitte.",
  },
  ru: {
    ctaTitle: "Нужно помыть стёкла?",
    ctaText: "Бесплатный расчёт за 24 ч. Более 35 лет моем стёкла на Коста-Бланке.",
    ctaButton: "Подробнее",
    backToBlog: "← Вернуться в блог",
    emptySections: "У этой статьи нет разделов.",
  },
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncate(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function markdownToHtml(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  let inUl = false;
  let inP = false;
  const close = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inP) { out.push("</p>"); inP = false; }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { close(); continue; }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) { close(); out.push(`<h3 id="${escapeHtml(slugify(h3[1]))}">${escapeHtml(h3[1])}</h3>`); continue; }
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) { close(); out.push(`<h2 id="${escapeHtml(slugify(h2[1]))}">${escapeHtml(h2[1])}</h2>`); continue; }
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
  close();
  return out.join("\n");
}

function buildPostTocHtml(bodyMd, locale) {
  const S = STRINGS[locale] || STRINGS.es;
  const headings = [];
  const lines = String(bodyMd || "").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) headings.push({ level: 2, text: h2[1], id: slugify(h2[1]) });
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) headings.push({ level: 3, text: h3[1], id: slugify(h3[1]) });
  }

  if (!headings.length) {
    return `<p class="blog-toc__empty">${escapeHtml(S.emptySections)}</p>`;
  }

  const h2s = headings.filter((h) => h.level === 2);
  return h2s.map((h, i) => {
    const num = String(i + 1).padStart(2, "0");
    const sub = headings[headings.indexOf(h) + 1] && headings[headings.indexOf(h) + 1].level === 3
      ? headings[headings.indexOf(h) + 1].text
      : "";
    return `
      <a class="blog-toc__link" href="#${escapeHtml(h.id)}">
        <span class="blog-toc__num">${num}</span>
        <h2 class="blog-toc__heading">${escapeHtml(h.text)}</h2>
        <h3 class="blog-toc__sub">${escapeHtml(truncate(sub, 90))}</h3>
      </a>
    `;
  }).join("");
}

function buildPostBodyHtml(post, locale) {
  const S = STRINGS[locale] || STRINGS.es;
  const budgetPage = BUDGET_PAGE[locale] || BUDGET_PAGE.es;
  const parts = [];
  if (post.dateLabel) {
    parts.push(`<p class="post-page__meta">${escapeHtml(post.dateLabel)}</p>`);
  }
  parts.push(`<h1>${escapeHtml(post.title)}</h1>`);

  const catLink = post.category
    ? `<a class="post-page__category" href="../index.html?category=${encodeURIComponent(post.category.slug)}">${escapeHtml(post.category.name)}</a>`
    : "";
  const tagsList = post.tags && post.tags.length
    ? `<div class="post-page__tags">${post.tags.map((t) => `<a class="post-page__tag" href="../index.html?tag=${encodeURIComponent(t.slug)}">${escapeHtml(t.name)}</a>`).join("")}</div>`
    : "";
  if (catLink || tagsList) {
    parts.push(`<div class="post-page__cattags">${catLink}${tagsList}</div>`);
  }

  if (post.imageDataUrl) {
    parts.push(`<img class="post-page__img" src="${escapeHtml(post.imageDataUrl)}" alt="${escapeHtml(post.title)}">`);
  }
  parts.push(`<div class="post-page__body">${markdownToHtml(post.body)}</div>`);

  parts.push(`<aside class="post-cta">
        <div class="post-cta__body">
          <h3 class="post-cta__title">${escapeHtml(S.ctaTitle)}</h3>
          <p class="post-cta__text">${escapeHtml(S.ctaText)}</p>
        </div>
        <a class="post-cta__btn" href="../../../${escapeHtml(budgetPage)}">
          ${escapeHtml(S.ctaButton)}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>
      </aside>`);

  parts.push(`<a class="post-page__back" href="../../index.html">${escapeHtml(S.backToBlog)}</a>`);
  return parts.join("\n");
}

function buildAbsoluteUrls(post, origin, dir) {
  const path = dir ? `${dir}/blog/post/${post.slug}/` : `blog/post/${post.slug}/`;
  return {
    canonical: `${origin}/${path}`,
    og: `${origin}/${path}`,
    image: post.imageDataUrl || `${origin}/assets/img/og-default.webp`,
  };
}

function renderHtml(template, post, locale, dir) {
  const siteOrigin = process.env.SITE_URL || "https://limpiezasluzdeluna.com";
  const urls = buildAbsoluteUrls(post, siteOrigin.replace(/\/$/, ""), dir);
  const description = truncate(post.excerpt || "", 160);
  const bodyHtml = buildPostBodyHtml(post, locale);
  const tocHtml = buildPostTocHtml(post.body, locale);
  const safeTitle = `${escapeHtml(post.title)} · Blog Limpiezas Luz de Luna`;

  let out = template;

  // Los templates de cada idioma no siempre son consistentes en cuántos
  // "../" anteponen a assets/ (depende de si el archivo referenciado vive
  // a una o dos carpetas de profundidad respecto a la plantilla). Aceptamos
  // cualquier número de "../" para no depender de esa convención.
  out = out
    .replace(/href="(?:\.\.\/)+assets\/img\/favicon\.webp"/g, 'href="/assets/img/favicon.webp"')
    .replace(/src="(?:\.\.\/)+assets\/img\/flags\//g, 'src="/assets/img/flags/')
    .replace(/href="(?:\.\.\/)+assets\/css\/styles\.css"/g, 'href="/assets/css/styles.css"')
    .replace(/src="(?:\.\.\/)+assets\/js\/main\.js"/g, 'src="/assets/js/main.js"')
    .replace(/src="(?:\.\.\/)+assets\/js\/blog\.js"/g, 'src="/assets/js/blog.js"');

  out = out.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
  out = out.replace(/<meta\s+name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}">`);
  if (!out.includes('name="description"')) {
    out = out.replace("</head>", `<meta name="description" content="${escapeHtml(description)}">\n</head>`);
  }

  let ogTags = `
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${urls.og}">
    <meta property="og:image" content="${escapeHtml(urls.image)}">
    <meta property="og:site_name" content="Limpiezas Luz de Luna">
    <meta property="article:published_time" content="${escapeHtml(post.updatedAt || post.createdAt || "")}">
    <link rel="canonical" href="${urls.canonical}">
  `;
  if (post.category && post.category.slug) {
    ogTags += `<meta property="article:section" content="${escapeHtml(post.category.name)}">`;
  }
  if (post.tags && post.tags.length) {
    for (const tag of post.tags) {
      ogTags += `<meta property="article:tag" content="${escapeHtml(tag.name)}">`;
    }
  }
  if (out.includes("</head>")) {
    out = out.replace("</head>", `${ogTags}</head>`);
  }

  out = out.replace(
    /<nav id="postTocList"[^>]*>[\s\S]*?<\/nav>/,
    `<nav id="postTocList" class="blog-toc__nav" aria-label="Secciones de la entrada">${tocHtml}</nav>`
  );

  out = out.replace(
    /<div id="postRoot"><\/div>/,
    bodyHtml
  );

  return out;
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.warn("[render-posts] Sin TURSO_DATABASE_URL/TURSO_AUTH_TOKEN — se omite el pre-renderizado.");
    return;
  }

  const client = createClient({ url, authToken: token });

  // Detección defensiva: si la BD aún no tiene category_id/locale ni las
  // tablas nuevas, salimos silenciosamente. El cliente debe correr
  // `npm run init:db -- --seed` (o `turso db shell ... < scripts/seed.sql`)
  // antes del primer build.
  const cols = await client.execute(`PRAGMA table_info(posts)`);
  const hasCategory = cols.rows.some((r) => r.name === "category_id");
  const hasLocale = cols.rows.some((r) => r.name === "locale");
  const tablesResult = await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('categories', 'tags', 'post_tags')`);
  const tableNames = new Set(tablesResult.rows.map((r) => r.name));
  if (!hasCategory || !tableNames.has("categories") || !tableNames.has("tags") || !tableNames.has("post_tags")) {
    console.warn("[render-posts] El schema de Turso aún no incluye categorías/tags. Ejecuta `npm run init:db -- --seed` o `turso db shell ... < scripts/seed.sql` y vuelve a desplegar. Se omite el pre-renderizado.");
    return;
  }

  // Categorías y tags no se filtran por idioma aquí: los ids son únicos
  // globalmente y cada post solo referencia los de su propio locale.
  const categoriesResult = await client.execute({
    sql: `SELECT id, slug, name FROM categories`,
    args: [],
  });
  const categoriesById = new Map(categoriesResult.rows.map((r) => [r.id, { id: r.id, slug: r.slug, name: r.name }]));

  const tagResult = await client.execute({
    sql: `SELECT pt.post_id, t.id, t.slug, t.name
          FROM post_tags pt
          INNER JOIN tags t ON t.id = pt.tag_id
          ORDER BY t.name ASC`,
    args: [],
  });
  const tagsByPost = new Map();
  for (const row of tagResult.rows) {
    const list = tagsByPost.get(row.post_id) || [];
    list.push({ id: row.id, slug: row.slug, name: row.name });
    tagsByPost.set(row.post_id, list);
  }

  let totalCount = 0;

  for (const { code, dir } of LOCALES) {
    const templatePath = join(ROOT, dir, "blog", "post.html");
    const outputBase = join(ROOT, "_site", dir, "blog", "post");

    if (!existsSync(templatePath)) {
      console.warn(`[render-posts] (${code}) No existe la plantilla ${templatePath}, se omite este idioma.`);
      continue;
    }

    const template = readFileSync(templatePath, "utf-8");

    // Si la columna locale todavía no existe (BD no migrada), tratamos todo
    // el contenido como español y solo renderizamos ese idioma.
    const sql = hasLocale
      ? `SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, created_at, updated_at
         FROM posts WHERE published = 1 AND locale = ?
         ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`
      : `SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, created_at, updated_at
         FROM posts WHERE published = 1
         ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`;
    if (!hasLocale && code !== "es") continue;

    const result = await client.execute({ sql, args: hasLocale ? [code] : [] });

    if (existsSync(outputBase)) rmSync(outputBase, { recursive: true, force: true });
    mkdirSync(outputBase, { recursive: true });

    let count = 0;
    for (const row of result.rows) {
      const post = {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt || "",
        body: row.body || "",
        dateLabel: row.date_label,
        imageDataUrl: row.image_data_url || "",
        published: !!row.published,
        categoryId: row.category_id || null,
        category: row.category_id ? (categoriesById.get(row.category_id) || null) : null,
        tags: tagsByPost.get(row.id) || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      const html = renderHtml(template, post, code, dir);
      const postDir = join(outputBase, post.slug);
      mkdirSync(postDir, { recursive: true });
      writeFileSync(join(postDir, "index.html"), html, "utf-8");
      count++;
    }

    totalCount += count;
    console.log(`✓ render-posts (${code}): ${count} entrada${count === 1 ? "" : "s"} pre-renderizada${count === 1 ? "" : "s"} en _site/${dir ? dir + "/" : ""}blog/post/`);
  }

  console.log(`✓ render-posts: ${totalCount} entrada${totalCount === 1 ? "" : "s"} en total.`);
}

main().catch((err) => {
  console.error("[render-posts] Error:", err);
  process.exit(1);
});
