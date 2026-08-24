/* Backoffice — login + dashboard + editor */
(() => {
  const API = "/.netlify/functions";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }

  const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function isoToEsDate(iso) {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!MONTHS_ES[month - 1]) return iso;
    return `${day} de ${MONTHS_ES[month - 1]} de ${year}`;
  }

  function esDateToIso(text) {
    if (!text) return "";
    const t = String(text).trim().toLowerCase();
    const m = /^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i.exec(t);
    if (!m) return "";
    const day = Number(m[1]);
    const monthName = m[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const month = MONTHS_ES.findIndex((x) => x === monthName) + 1;
    const year = Number(m[3]);
    if (!month || !year || !day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      ...options,
    });
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) {
      const msg = (data && data.error) || `Error ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg, kind = "default") {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "toast" + (kind === "success" ? " toast--success" : kind === "error" ? " toast--error" : "");
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-visible");
      setTimeout(() => { toastEl.hidden = true; }, 250);
    }, 3200);
  }

  const SUPPORTED_LOCALES = ["es", "en", "fr", "de", "ru"];
  const LOCALE_LABELS = { es: "ES", en: "EN", fr: "FR", de: "DE", ru: "RU" };

  const state = {
    posts: [],
    categories: [],
    tags: [],
    filter: "all",
    search: "",
    editing: null,
    imageDataUrl: "",
  };

  const loginView = $("#loginView");
  const appView = $("#appView");
  const editorView = $("#editorView");

  function showLogin() {
    loginView.hidden = false;
    appView.hidden = true;
    setTimeout(() => $("#loginPassword")?.focus(), 50);
  }
  function showApp() {
    loginView.hidden = true;
    appView.hidden = false;
  }
  function showEditor() {
    editorView.hidden = false;
    editorView.setAttribute("aria-hidden", "false");
    setTimeout(() => $("#title")?.focus(), 60);
  }
  function hideEditor() {
    editorView.hidden = true;
    editorView.setAttribute("aria-hidden", "true");
    state.editing = null;
  }

  const loginForm = $("#loginForm");
  const loginError = $("#loginError");
  const loginSubmit = $("#loginSubmit");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    loginSubmit.disabled = true;
    const original = loginSubmit.textContent;
    loginSubmit.textContent = "Entrando…";
    try {
      const data = await api("/auth-login", {
        method: "POST",
        body: JSON.stringify({ password: $("#loginPassword").value }),
      });
      if (data && data.ok) {
        showApp();
        await loadPosts();
      }
    } catch (err) {
      loginError.textContent = err.message || "No se pudo iniciar sesión";
      loginError.hidden = false;
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = original;
    }
  });

  $$("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $("#" + btn.dataset.toggle);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  $("#logoutBtn").addEventListener("click", async () => {
    try {
      await api("/auth-logout", { method: "POST" });
    } catch { /* ignore */ }
    showLogin();
    $("#loginPassword").value = "";
  });

  const postsList = $("#postsList");
  const appSubtitle = $("#appSubtitle");
  const searchInput = $("#searchInput");
  const crudMenu = $$(".crud-menu__item");
  const countAll = $("#countAll");
  const countPublished = $("#countPublished");
  const countDraft = $("#countDraft");

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim().toLowerCase();
    renderPosts();
  });
  crudMenu.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.status;
      crudMenu.forEach((b) => b.classList.toggle("is-active", b === btn));
      renderPosts();
    });
  });

  async function loadPosts() {
    appSubtitle.textContent = "Cargando…";
    postsList.innerHTML = `<p class="posts-list__empty">Cargando entradas…</p>`;
    try {
      const data = await api("/posts-list", { method: "GET" });
      state.posts = Array.isArray(data.posts) ? data.posts : [];
      state.categories = Array.isArray(data.categories) ? data.categories : [];
      state.tags = Array.isArray(data.tags) ? data.tags : [];
      appSubtitle.textContent = `${state.posts.length} entrada${state.posts.length === 1 ? "" : "s"} en la base de datos`;
      updateCounts();
      renderPosts();
    } catch (err) {
      if (err.status === 401) {
        showLogin();
        return;
      }
      postsList.innerHTML = `<p class="posts-list__empty">${escapeHtml(err.message)}</p>`;
      appSubtitle.textContent = "Error";
    }
  }

  function updateCounts() {
    const total = state.posts.length;
    const published = state.posts.filter((p) => p.published).length;
    const drafts = total - published;
    if (countAll) countAll.textContent = total;
    if (countPublished) countPublished.textContent = published;
    if (countDraft) countDraft.textContent = drafts;
  }

  async function deletePost(id) {
    const post = state.posts.find((p) => p.id === id);
    if (!post) return;
    if (!confirm(`¿Eliminar la entrada «${post.title}»? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/posts-delete?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("Entrada eliminada", "success");
      if (state.editing && state.editing.id === id) hideEditor();
      await loadPosts();
    } catch (err) {
      toast(err.message || "No se pudo eliminar", "error");
    }
  }

  function categoryBadge(post) {
    if (post.category && post.category.name) {
      return `<span class="post-row__category" title="${escapeHtml(post.category.slug || "")}">${escapeHtml(post.category.name)}</span>`;
    }
    return `<span class="post-row__category post-row__category--empty">Sin categoría</span>`;
  }

  function localeBadge(post) {
    const code = String(post.locale || "es").toLowerCase();
    return `<span class="post-row__locale">${escapeHtml(LOCALE_LABELS[code] || code.toUpperCase())}</span>`;
  }

  function tagsBadges(post) {
    if (!post.tags || !post.tags.length) return "";
    return `<div class="post-row__tags">${post.tags
      .slice(0, 5)
      .map((t) => `<span class="post-row__tag">${escapeHtml(t.name)}</span>`)
      .join("")}${post.tags.length > 5 ? `<span class="post-row__tag post-row__tag--more">+${post.tags.length - 5}</span>` : ""}</div>`;
  }

  function renderPosts() {
    const filtered = state.posts.filter((p) => {
      if (state.filter === "published" && !p.published) return false;
      if (state.filter === "draft" && p.published) return false;
      if (state.search) {
        const tagNames = (p.tags || []).map((t) => t.name).join(" ");
        const catName = p.category ? p.category.name : "";
        const hay = `${p.title} ${p.slug} ${p.excerpt} ${catName} ${tagNames}`.toLowerCase();
        if (!hay.includes(state.search)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      const empty = state.search
        ? `No hay entradas que coincidan con «${escapeHtml(state.search)}».`
        : state.filter === "published"
          ? "No hay entradas activas todavía."
          : state.filter === "draft"
            ? "No tienes entradas inactivas."
            : "Aún no hay entradas. Pulsa «Nueva entrada» para crear la primera.";
      postsList.innerHTML = `<p class="posts-list__empty">${empty}</p>`;
      return;
    }

    postsList.innerHTML = filtered.map((p) => {
      const badge = p.published
        ? `<span class="post-row__badge">Activa</span>`
        : `<span class="post-row__badge post-row__badge--draft">Inactiva</span>`;
      const img = p.imageDataUrl
        ? `<div class="post-row__img" style="background-image:url('${escapeHtml(p.imageDataUrl)}')">${badge}</div>`
        : `<div class="post-row__img post-row__img--empty">${badge}<span>Sin imagen</span></div>`;
      return `
        <article class="post-row" data-id="${escapeHtml(p.id)}">
          ${img}
          <div class="post-row__body">
            <p class="post-row__meta">${escapeHtml(p.dateLabel || "Sin fecha")} · ${escapeHtml(formatDate(p.updatedAt || p.createdAt))}</p>
            <h3 class="post-row__title">${escapeHtml(p.title)}</h3>
            <div class="post-row__slugrow">
              <p class="post-row__slug">${escapeHtml(p.slug)}</p>
              ${localeBadge(p)}
            </div>
            <div class="post-row__cattags">
              ${categoryBadge(p)}
              ${tagsBadges(p)}
            </div>
            <p class="post-row__excerpt">${escapeHtml(p.excerpt || "")}</p>
            <div class="post-row__actions">
              <button type="button" class="btn btn--ghost btn--sm" data-action="edit" title="Editar entrada">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Editar
              </button>
              <button type="button" class="btn btn--ghost btn--sm" data-action="view" title="Ver en el blog">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                Ver
              </button>
              <button type="button" class="btn btn--danger-soft btn--sm" data-action="delete" title="Eliminar entrada">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    postsList.querySelectorAll(".post-row").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-action="edit"]').addEventListener("click", () => openEditor(id));
      row.querySelector('[data-action="view"]').addEventListener("click", () => {
        const post = state.posts.find((p) => p.id === id);
        if (post) window.open(`../blog/post/${encodeURIComponent(post.slug)}/`, "_blank", "noopener");
      });
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deletePost(id));
    });
  }

  const editorForm = $("#editorForm");
  const editorTitle = $("#editorTitle");
  const editorError = $("#editorError");
  const editorOk = $("#editorOk");
  const saveBtn = $("#saveBtn");
  const deleteBtn = $("#deleteBtn");
  const slugPreview = $("#slugPreview");
  const titleInput = $("#title");
  const slugInput = $("#slug");
  const bodyInput = $("#body");
  const bodyPreview = $("#bodyPreview");
  const imagePreview = $("#imagePreview");
  const imageFileInput = $("#imageFile");
  const imageClearBtn = $("#imageClearBtn");
  const publishedInput = $("#published");
  const publishedLabel = $("#publishedLabel");
  const categorySelect = $("#categoryId");
  const localeSelect = $("#locale");
  const tagsInput = $("#tagsInput");

  function currentLocale() {
    return localeSelect ? (localeSelect.value || "es") : "es";
  }

  // Solo muestra en el <select> las categorías del idioma actualmente
  // seleccionado en el editor — cada categoría existe una vez por idioma,
  // con id distinto, así que hay que refiltrar cada vez que cambia el idioma.
  function populateCategorySelect(preserveSelection) {
    if (!categorySelect) return;
    const previous = preserveSelection ? categorySelect.value : "";
    const locale = currentLocale();
    const cats = state.categories
      .filter((c) => (c.locale || "es") === locale)
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    categorySelect.innerHTML = `<option value="">— Sin categoría —</option>` +
      cats.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
    if (preserveSelection && cats.some((c) => c.id === previous)) {
      categorySelect.value = previous;
    }
  }

  if (localeSelect) {
    localeSelect.addEventListener("change", () => populateCategorySelect(false));
  }

  const tagsChips = $("#tagsChips");
  const tagsSuggestions = $("#tagsSuggestions");
  let draftTags = [];

  function normalizeTagName(s) {
    return String(s || "").trim().toLowerCase();
  }

  function renderTagsChips() {
    if (!tagsChips) return;
    if (!draftTags.length) {
      tagsChips.innerHTML = `<span class="tags-input__empty">Sin tags. Añade el primero abajo.</span>`;
      return;
    }
    tagsChips.innerHTML = draftTags.map((t) => `
      <span class="chip chip--removable" data-tag="${escapeHtml(t.name)}">
        ${escapeHtml(t.name)}
        <button type="button" class="chip__remove" aria-label="Quitar ${escapeHtml(t.name)}" data-remove-tag="${escapeHtml(t.name)}">✕</button>
      </span>
    `).join("");
  }

  function addTag(rawName) {
    const name = String(rawName || "").trim();
    if (!name) return false;
    const norm = normalizeTagName(name);
    if (draftTags.some((t) => normalizeTagName(t.name) === norm)) return false;
    if (draftTags.length >= 12) {
      toast("Máximo 12 tags por entrada", "error");
      return false;
    }
    draftTags.push({ name });
    renderTagsChips();
    return true;
  }

  function removeTag(name) {
    const norm = normalizeTagName(name);
    draftTags = draftTags.filter((t) => normalizeTagName(t.name) !== norm);
    renderTagsChips();
  }

  function renderSuggestions(query) {
    if (!tagsSuggestions) return;
    const q = normalizeTagName(query);
    if (!q || q.length < 1) {
      tagsSuggestions.hidden = true;
      tagsSuggestions.innerHTML = "";
      return;
    }
    const locale = currentLocale();
    const available = state.tags.filter((t) => {
      if ((t.locale || "es") !== locale) return false;
      if (normalizeTagName(t.name) === q) return false;
      if (draftTags.some((d) => normalizeTagName(d.name) === normalizeTagName(t.name))) return false;
      return normalizeTagName(t.name).includes(q);
    }).slice(0, 6);
    if (!available.length) {
      tagsSuggestions.hidden = true;
      tagsSuggestions.innerHTML = "";
      return;
    }
    tagsSuggestions.hidden = false;
    tagsSuggestions.innerHTML = available
      .map((t) => `<button type="button" class="tags-input__suggestion" data-suggest-tag="${escapeHtml(t.name)}">${escapeHtml(t.name)}</button>`)
      .join("");
  }

  function setTagsFromString(s) {
    draftTags = [];
    String(s || "").split(/[,;\n]/).map((t) => t.trim()).filter(Boolean).forEach((name) => {
      const norm = normalizeTagName(name);
      if (!draftTags.some((t) => normalizeTagName(t.name) === norm)) {
        draftTags.push({ name });
      }
    });
    renderTagsChips();
  }

  function suggestTagsHint() {
    if (!tagsInput) return;
    tagsInput.placeholder = state.tags.length
      ? "Escribe un tag y pulsa Enter…"
      : "calima, salitre, hogar…";
  }

  $("#newPostBtn").addEventListener("click", () => openEditor(null));
  $$("[data-close-editor]").forEach((el) => el.addEventListener("click", hideEditor));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !editorView.hidden) hideEditor();
  });

  function openEditor(id) {
    editorError.hidden = true;
    editorOk.hidden = true;
    state.editing = id ? state.posts.find((p) => p.id === id) : null;
    state.imageDataUrl = state.editing?.imageDataUrl || "";

    if (localeSelect) {
      localeSelect.value = (state.editing && state.editing.locale) || "es";
    }
    populateCategorySelect();
    suggestTagsHint();

    if (state.editing) {
      editorTitle.textContent = "Editar entrada";
      deleteBtn.hidden = false;
      titleInput.value = state.editing.title || "";
      slugInput.value = state.editing.slug || "";
      $("#excerpt").value = state.editing.excerpt || "";
      bodyInput.value = state.editing.body || "";
      $("#dateLabel").value = esDateToIso(state.editing.dateLabel) || "";
      publishedInput.checked = !!state.editing.published;
      if (categorySelect) categorySelect.value = state.editing.categoryId || (state.editing.category && state.editing.category.id) || "";
      setTagsFromString((state.editing.tags || []).map((t) => t.name).join(", "));
    } else {
      editorTitle.textContent = "Nueva entrada";
      deleteBtn.hidden = true;
      editorForm.reset();
      if (localeSelect) localeSelect.value = "es";
      populateCategorySelect();
      $("#dateLabel").value = todayIso();
      publishedInput.checked = false;
      if (categorySelect) categorySelect.value = "";
      setTagsFromString("");
    }

    updateSlugPreview();
    updatePublishedLabel();
    updateDateLabelPreview();
    updateImagePreview();
    renderBodyPreview();
    slugTouched = false;
    showEditor();
  }

  function closeEditor() { hideEditor(); }

  function updateSlugPreview() {
    slugPreview.textContent = slugInput.value || "—";
  }

  function updateDateLabelPreview() {
    const iso = $("#dateLabel").value;
    const preview = $("#dateLabelPreview");
    if (!preview) return;
    preview.textContent = iso ? (isoToEsDate(iso) || "—") : "—";
  }

  function updatePublishedLabel() {
    publishedLabel.textContent = publishedInput.checked ? "Activa" : "Inactiva";
  }

  let slugTouched = false;
  slugInput.addEventListener("input", () => {
    slugTouched = true;
    slugInput.value = slugify(slugInput.value);
    updateSlugPreview();
  });
  titleInput.addEventListener("input", () => {
    if (!slugTouched && !state.editing) {
      slugInput.value = slugify(titleInput.value);
      updateSlugPreview();
    }
  });

  publishedInput.addEventListener("change", updatePublishedLabel);

  const publishedTrack = $("#publishedTrack");
  if (publishedTrack) {
    const togglePublished = () => {
      publishedInput.checked = !publishedInput.checked;
      updatePublishedLabel();
    };
    publishedTrack.addEventListener("click", (e) => {
      e.preventDefault();
      togglePublished();
    });
    publishedTrack.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePublished();
      }
    });
  }

  bodyInput.addEventListener("input", renderBodyPreview);
  $("#dateLabel").addEventListener("input", updateDateLabelPreview);

  // Tags input — Enter o coma añade chip
  if (tagsInput) {
    tagsInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const v = tagsInput.value;
        if (addTag(v)) {
          tagsInput.value = "";
          renderSuggestions("");
        }
      } else if (e.key === "Backspace" && !tagsInput.value && draftTags.length) {
        // Backspace en input vacío quita el último chip
        const last = draftTags[draftTags.length - 1];
        removeTag(last.name);
      } else if (e.key === "Escape") {
        renderSuggestions("");
        tagsInput.blur();
      }
    });
    tagsInput.addEventListener("input", () => renderSuggestions(tagsInput.value));
    tagsInput.addEventListener("blur", () => {
      // Pequeño delay para que el click de sugerencia tenga tiempo
      setTimeout(() => renderSuggestions(""), 150);
    });
    tagsInput.addEventListener("focus", () => renderSuggestions(tagsInput.value));
  }
  // Click en ✕ de un chip
  if (tagsChips) {
    tagsChips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-tag]");
      if (!btn) return;
      removeTag(btn.dataset.removeTag);
    });
  }
  // Click en una sugerencia
  if (tagsSuggestions) {
    tagsSuggestions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-suggest-tag]");
      if (!btn) return;
      if (addTag(btn.dataset.suggestTag)) {
        if (tagsInput) tagsInput.value = "";
        renderSuggestions("");
        if (tagsInput) tagsInput.focus();
      }
    });
  }

  function renderBodyPreview() {
    const md = bodyInput.value || "";
    if (!md.trim()) {
      bodyPreview.innerHTML = `<p class="editor__preview-hint">La vista previa se actualiza al escribir.</p>`;
      return;
    }
    bodyPreview.innerHTML = markdownToHtml(md);
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
      if (h3) { close(); out.push(`<h3>${escapeHtml(h3[1])}</h3>`); continue; }
      const h2 = /^##\s+(.+)$/.exec(line);
      if (h2) { close(); out.push(`<h2>${escapeHtml(h2[1])}</h2>`); continue; }
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

  imageFileInput.addEventListener("change", () => {
    const file = imageFileInput.files && imageFileInput.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast("La imagen supera 4 MB. Se almacenará como data URL.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.imageDataUrl = String(reader.result || "");
      updateImagePreview();
    };
    reader.readAsDataURL(file);
  });
  imageClearBtn.addEventListener("click", () => {
    state.imageDataUrl = "";
    imageFileInput.value = "";
    updateImagePreview();
  });
  function updateImagePreview() {
    if (state.imageDataUrl) {
      imagePreview.style.backgroundImage = `url('${state.imageDataUrl.replace(/'/g, "\\'")}')`;
      imagePreview.innerHTML = "";
    } else {
      imagePreview.style.backgroundImage = "";
      imagePreview.innerHTML = `<span class="image-field__placeholder">Sin imagen</span>`;
    }
  }

  editorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editorError.hidden = true;
    editorOk.hidden = true;
    saveBtn.disabled = true;
    const btnLabel = saveBtn.querySelector(".btn__label");
    const originalLabel = btnLabel ? btnLabel.textContent : saveBtn.textContent;
    if (btnLabel) btnLabel.textContent = "Guardando…";
    else saveBtn.textContent = "Guardando…";

    const tagsArr = draftTags.map((t) => t.name).filter(Boolean);

    const payload = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      excerpt: $("#excerpt").value,
      body: bodyInput.value,
      dateLabel: isoToEsDate($("#dateLabel").value) || $("#dateLabel").value.trim(),
      imageDataUrl: state.imageDataUrl,
      published: !!publishedInput.checked,
      categoryId: categorySelect ? categorySelect.value || null : null,
      locale: currentLocale(),
      tags: tagsArr,
    };

    try {
      let result;
      if (state.editing) {
        result = await api(`/posts-update?id=${encodeURIComponent(state.editing.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        result = await api("/posts-create", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      editorOk.textContent = "Guardado.";
      editorOk.hidden = false;
      toast(state.editing ? "Entrada actualizada" : "Entrada creada", "success");
      hideEditor();
      slugTouched = false;
      await loadPosts();
      if (result && result.post) {
        const updated = state.posts.find((p) => p.id === result.post.id);
        if (updated) openEditor(updated.id);
      }
    } catch (err) {
      editorError.textContent = err.message || "No se pudo guardar";
      editorError.hidden = false;
      toast(editorError.textContent, "error");
    } finally {
      saveBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = originalLabel;
      else saveBtn.textContent = originalLabel;
    }
  });

  deleteBtn.addEventListener("click", async () => {
    if (!state.editing) return;
    if (!confirm(`¿Eliminar la entrada «${state.editing.title}»? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/posts-delete?id=${encodeURIComponent(state.editing.id)}`, { method: "DELETE" });
      toast("Entrada eliminada", "success");
      hideEditor();
      await loadPosts();
    } catch (err) {
      toast(err.message || "No se pudo eliminar", "error");
    }
  });

  async function boot() {
    renderTagsChips();
    try {
      const data = await api("/auth-check");
      if (data && data.authenticated) {
        showApp();
        await loadPosts();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
