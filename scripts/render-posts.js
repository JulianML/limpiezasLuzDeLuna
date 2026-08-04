#!/usr/bin/env node
/**
 * Render — genera HTML estático por cada entrada publicada del blog.
 *
 * Para cada post `published = 1` con slug `x`, produce
 *   _site/blog/post/x/index.html
 * tomando como plantilla `blog/post.html`, sustituyendo
 * `#postRoot` y `#postTocList` por el contenido real
 * y rellenando <title>, meta description y OG tags.
 *
 * Si no hay variables TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en el entorno
 * (p. ej. CI sin secretos), se omite silenciosamente.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_PATH = join(ROOT, "blog", "post.html");
const OUTPUT_BASE = join(ROOT, "_site", "blog", "post");

const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

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

function buildPostTocHtml(bodyMd) {
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
    return `<p class="blog-toc__empty">Esta entrada no tiene secciones.</p>`;
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

function buildPostBodyHtml(post) {
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
          <h3 class="post-cta__title">¿Necesitas limpiar tus cristales?</h3>
          <p class="post-cta__text">Te pasamos presupuesto sin compromiso en menos de 24 h. Más de 30 años limpiando cristales en la Costa Blanca.</p>
        </div>
        <a class="post-cta__btn" href="../../presupuesto.html">
          Más información
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>
      </aside>`);

  parts.push(`<a class="post-page__back" href="../../index.html">← Volver al blog</a>`);
  return parts.join("\n");
}

function buildAbsoluteUrls(post, origin) {
  return {
    canonical: `${origin}/blog/post/${post.slug}/`,
    og: `${origin}/blog/post/${post.slug}/`,
    image: post.imageDataUrl || `${origin}/assets/img/og-default.webp`,
  };
}

function renderHtml(template, post) {
  const siteOrigin = process.env.SITE_URL || "https://limpiezasluzdeluna.com";
  const urls = buildAbsoluteUrls(post, siteOrigin.replace(/\/$/, ""));
  const description = truncate(post.excerpt || "", 160);
  const bodyHtml = buildPostBodyHtml(post);
  const tocHtml = buildPostTocHtml(post.body);
  const safeTitle = `${escapeHtml(post.title)} · Blog Limpiezas Luz de Luna`;

  let out = template;

  out = out
    .replace(/href="\.\.\/assets\/img\/favicon\.webp"/g, 'href="/assets/img/favicon.webp"')
    .replace(/src="\.\.\/assets\/img\/flags\//g, 'src="/assets/img/flags/')
    .replace(/href="\.\.\/assets\/css\/styles\.css"/g, 'href="/assets/css/styles.css"')
    .replace(/src="\.\.\/assets\/js\/main\.js"/g, 'src="/assets/js/main.js"')
    .replace(/src="\.\.\/assets\/js\/blog\.js"/g, 'src="/assets/js/blog.js"');

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
  if (!existsSync(TEMPLATE_PATH)) {
    console.warn(`[render-posts] No existe la plantilla ${TEMPLATE_PATH}`);
    return;
  }

  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const client = createClient({ url, authToken: token });

  // Detección defensiva: si la BD aún no tiene category_id ni las tablas nuevas,
  // salimos silenciosamente. El cliente debe correr `npm run init:db -- --seed`
  // (o `turso db shell ... < scripts/seed.sql`) antes del primer build.
  const cols = await client.execute(`PRAGMA table_info(posts)`);
  const hasCategory = cols.rows.some((r) => r.name === "category_id");
  const tablesResult = await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('categories', 'tags', 'post_tags')`);
  const tableNames = new Set(tablesResult.rows.map((r) => r.name));
  if (!hasCategory || !tableNames.has("categories") || !tableNames.has("tags") || !tableNames.has("post_tags")) {
    console.warn("[render-posts] El schema de Turso aún no incluye categorías/tags. Ejecuta `npm run init:db -- --seed` o `turso db shell ... < scripts/seed.sql` y vuelve a desplegar. Se omite el pre-renderizado.");
    return;
  }

  const result = await client.execute({
    sql: `SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, created_at, updated_at
          FROM posts WHERE published = 1
          ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`,
    args: [],
  });

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

  if (existsSync(OUTPUT_BASE)) rmSync(OUTPUT_BASE, { recursive: true, force: true });
  mkdirSync(OUTPUT_BASE, { recursive: true });

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

    const html = renderHtml(template, post);
    const dir = join(OUTPUT_BASE, post.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html, "utf-8");
    count++;
  }

  console.log(`✓ render-posts: ${count} entrada${count === 1 ? "" : "s"} pre-renderizada${count === 1 ? "" : "s"} en _site/blog/post/`);
}

main().catch((err) => {
  console.error("[render-posts] Error:", err);
  process.exit(1);
});
