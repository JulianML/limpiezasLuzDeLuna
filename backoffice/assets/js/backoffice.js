/* Backoffice — login + dashboard + editor */
(() => {
  const API = "/.netlify/functions";

  // ─────────── Helpers ───────────
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

  function todayLabel() {
    return new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

  // ─────────── Toast ───────────
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

  // ─────────── State ───────────
  const state = {
    posts: [],
    filter: "all",
    search: "",
    editing: null, // null = new, otherwise { id, ... }
    imageDataUrl: "",
  };

  // ─────────── View switching ───────────
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

  // ─────────── Login ───────────
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

  // Toggle password visibility
  $$("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $("#" + btn.dataset.toggle);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // ─────────── Logout ───────────
  $("#logoutBtn").addEventListener("click", async () => {
    try {
      await api("/auth-logout", { method: "POST" });
    } catch { /* ignore */ }
    showLogin();
    $("#loginPassword").value = "";
  });

  // ─────────── Posts list ───────────
  const postsList = $("#postsList");
  const appSubtitle = $("#appSubtitle");
  const searchInput = $("#searchInput");
  const statusFilter = $("#statusFilter");

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim().toLowerCase();
    renderPosts();
  });
  statusFilter.addEventListener("change", () => {
    state.filter = statusFilter.value;
    renderPosts();
  });

  async function loadPosts() {
    appSubtitle.textContent = "Cargando…";
    postsList.innerHTML = `<p class="posts-list__empty">Cargando entradas…</p>`;
    try {
      const data = await api("/posts-list", { method: "GET" });
      state.posts = Array.isArray(data.posts) ? data.posts : [];
      appSubtitle.textContent = `${state.posts.length} entrada${state.posts.length === 1 ? "" : "s"} en la base de datos`;
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

  function renderPosts() {
    const filtered = state.posts.filter((p) => {
      if (state.filter === "published" && !p.published) return false;
      if (state.filter === "draft" && p.published) return false;
      if (state.search) {
        const hay = `${p.title} ${p.slug} ${p.excerpt}`.toLowerCase();
        if (!hay.includes(state.search)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      postsList.innerHTML = `<p class="posts-list__empty">No hay entradas que coincidan con el filtro.</p>`;
      return;
    }

    postsList.innerHTML = filtered.map((p) => {
      const badge = p.published
        ? `<span class="post-row__badge">Publicada</span>`
        : `<span class="post-row__badge post-row__badge--draft">Borrador</span>`;
      const img = p.imageDataUrl
        ? `<div class="post-row__img" style="background-image:url('${escapeHtml(p.imageDataUrl)}')">${badge}</div>`
        : `<div class="post-row__img post-row__img--empty">${badge}<span>Sin imagen</span></div>`;
      return `
        <article class="post-row" data-id="${escapeHtml(p.id)}">
          ${img}
          <div class="post-row__body">
            <p class="post-row__meta">${escapeHtml(p.dateLabel || "Sin fecha")} · ${escapeHtml(formatDate(p.updatedAt || p.createdAt))}</p>
            <h3 class="post-row__title">${escapeHtml(p.title)}</h3>
            <p class="post-row__slug">${escapeHtml(p.slug)}</p>
            <p class="post-row__excerpt">${escapeHtml(p.excerpt || "")}</p>
            <div class="post-row__actions">
              <button type="button" class="btn btn--ghost btn--sm" data-action="edit">Editar</button>
              <button type="button" class="btn btn--ghost btn--sm" data-action="view">Ver</button>
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
        if (post) window.open(`../blog/post.html?slug=${encodeURIComponent(post.slug)}`, "_blank", "noopener");
      });
    });
  }

  // ─────────── Editor ───────────
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

    if (state.editing) {
      editorTitle.textContent = "Editar entrada";
      deleteBtn.hidden = false;
      titleInput.value = state.editing.title || "";
      slugInput.value = state.editing.slug || "";
      $("#excerpt").value = state.editing.excerpt || "";
      bodyInput.value = state.editing.body || "";
      $("#dateLabel").value = state.editing.dateLabel || "";
      publishedInput.checked = !!state.editing.published;
    } else {
      editorTitle.textContent = "Nueva entrada";
      deleteBtn.hidden = true;
      editorForm.reset();
      $("#dateLabel").value = todayLabel();
      publishedInput.checked = false;
    }

    updateSlugPreview();
    updatePublishedLabel();
    updateImagePreview();
    renderBodyPreview();
    showEditor();
  }

  function closeEditor() { hideEditor(); }

  function updateSlugPreview() {
    slugPreview.textContent = slugInput.value || "—";
  }

  function updatePublishedLabel() {
    publishedLabel.textContent = publishedInput.checked ? "Publicada" : "Borrador";
  }

  // Auto-slug desde título (solo si el usuario no lo ha editado)
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

  bodyInput.addEventListener("input", renderBodyPreview);

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

  // Image handling
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

  // Save
  editorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editorError.hidden = true;
    editorOk.hidden = true;
    saveBtn.disabled = true;
    const btnLabel = saveBtn.querySelector(".btn__label");
    const originalLabel = btnLabel ? btnLabel.textContent : saveBtn.textContent;
    if (btnLabel) btnLabel.textContent = "Guardando…";
    else saveBtn.textContent = "Guardando…";

    const payload = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      excerpt: $("#excerpt").value,
      body: bodyInput.value,
      dateLabel: $("#dateLabel").value.trim(),
      imageDataUrl: state.imageDataUrl,
      published: !!publishedInput.checked,
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

  // ─────────── Boot ───────────
  async function boot() {
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
