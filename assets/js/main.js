/* Limpiezas Luz de Luna V2 — interacciones del sitio */
(() => {
  document.documentElement.classList.add('js-ready');

  // Selector de idioma (dropdown), construido a partir del footer.
  // Vive dentro de .nav: en escritorio aparece al final de la barra de navegación;
  // en móvil queda integrado en el panel del menú hamburguesa (hay sitio de sobra).
  const navEl = document.querySelector('.nav');
  const footerSwitch = document.querySelector('footer .lang-switch');
  if (navEl && footerSwitch) {
    const links = Array.from(footerSwitch.querySelectorAll('a'));
    const languages = links.map(a => ({
      href: a.getAttribute('href'),
      flag: a.querySelector('img').getAttribute('src'),
      label: a.getAttribute('aria-label'),
      isCurrent: a.classList.contains('is-current'),
    }));
    const current = languages.find(l => l.isCurrent) || languages[0];

    const dropdown = document.createElement('div');
    dropdown.className = 'lang-dropdown';
    dropdown.setAttribute('aria-label', footerSwitch.getAttribute('aria-label') || 'Language selector');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lang-dropdown__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.setAttribute('aria-label', current.label);

    const toggleFlag = document.createElement('img');
    toggleFlag.src = current.flag;
    toggleFlag.alt = current.label;
    toggle.appendChild(toggleFlag);

    const caret = document.createElement('span');
    caret.className = 'lang-dropdown__caret';
    caret.setAttribute('aria-hidden', 'true');
    toggle.appendChild(caret);

    const menu = document.createElement('ul');
    menu.className = 'lang-dropdown__menu';
    menu.setAttribute('role', 'menu');

    languages.forEach(lang => {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      const a = document.createElement('a');
      a.href = lang.href;
      a.setAttribute('role', 'menuitem');
      if (lang.isCurrent) {
        a.classList.add('is-current');
        a.setAttribute('aria-current', 'true');
      }
      const img = document.createElement('img');
      img.src = lang.flag;
      img.alt = lang.label;
      const span = document.createElement('span');
      span.textContent = lang.label;
      a.appendChild(img);
      a.appendChild(span);
      li.appendChild(a);
      menu.appendChild(li);
    });

    dropdown.appendChild(toggle);
    dropdown.appendChild(menu);
    navEl.appendChild(dropdown);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
        dropdown.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const header = document.querySelector('.site-header');

  // Menú móvil
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      if (a.classList.contains('nav__link') && a.closest('.nav__item--dropdown')) return;
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // Cierra el menú móvil al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!nav || !navToggle) return;
    if (!nav.classList.contains('is-open')) return;
    if (e.target.closest('.nav') || e.target.closest('.nav-toggle')) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });

  // Dropdown desktop (click y hover)
  const dropdownItems = document.querySelectorAll('.nav__item--dropdown');
  dropdownItems.forEach(item => {
    const trigger = item.querySelector('.nav__link');
    const submenu = item.querySelector('.nav__submenu');
    if (!trigger || !submenu) return;

    const close = () => {
      item.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      submenu.classList.remove('is-open');
    };
    const open = () => {
      dropdownItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          const t = other.querySelector('.nav__link');
          const s = other.querySelector('.nav__submenu');
          if (t) t.setAttribute('aria-expanded', 'false');
          if (s) s.classList.remove('is-open');
        }
      });
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      submenu.classList.add('is-open');
    };

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.contains('is-open') ? close() : open();
    });

    let closeTimer = null;
    const scheduleClose = () => {
      if (!window.matchMedia('(min-width: 721px)').matches) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, 120);
    };
    const cancelClose = () => {
      clearTimeout(closeTimer);
    };

    item.addEventListener('mouseenter', () => {
      if (window.matchMedia('(min-width: 721px)').matches) {
        cancelClose();
        open();
      }
    });
    item.addEventListener('mouseleave', scheduleClose);
    submenu.addEventListener('mouseenter', cancelClose);
    submenu.addEventListener('mouseleave', scheduleClose);

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  });

  // Cierra dropdowns al clicar fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item--dropdown')) {
      dropdownItems.forEach(item => {
        item.classList.remove('is-open');
        const t = item.querySelector('.nav__link');
        const s = item.querySelector('.nav__submenu');
        if (t) t.setAttribute('aria-expanded', 'false');
        if (s) s.classList.remove('is-open');
      });
    }
  });

  // Header con sombra al hacer scroll
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 8) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Reveal on scroll (animación de entrada)
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  // Formulario de presupuesto — validación + mensaje de éxito
  const form = document.getElementById('budgetForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = form.querySelector('.form-success');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (success) {
        success.classList.add('is-visible');
        success.textContent = '¡Gracias! Hemos recibido tu solicitud. Te contactaremos lo antes posible.';
      }
      form.reset();
    });
  }
})();