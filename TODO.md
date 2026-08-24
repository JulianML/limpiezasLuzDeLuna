# TODO — Pendiente de cliente

## blog/index.html
- Títulos de artículos sugeridos (B8 hoja Blog) — registrados aquí, NO como enlaces hasta que existan destinos en `assets/js/blog.js` o en el CMS dinámico:
  - **El Clima de la Costa Blanca**
    - Guía de supervivencia a la Calima: Cómo limpiar el barro sin rayar el vidrio.
    - Salitre: El enemigo invisible de tus vistas al mar.
    - Calendario de limpieza: ¿Cada cuánto limpiar según la estación en el Mediterráneo?
  - **Guía para Negocios y Hoteles**
    - Psicología del Escaparate: Por qué un cristal sucio te hace perder un 20% de ventas.
    - Checklist de Seguridad: Qué exigir a una empresa de limpieza de cristales en altura.
    - Mantenimiento preventivo: Ahorra costes en la reposición de vidrios dañados.
  - **Soluciones para el Hogar**
    - Cortinas de cristal: Cómo mantener los carriles y el vidrio como el primer día.
    - Limpieza de espejos: El truco profesional para que no queden rastros.
    - Productos caseros vs. Profesionales: ¿Vale la pena el vinagre? (Spoiler: Te contamos por qué no).
  - **Seguridad y Técnica**
    - ¿Qué es el Agua Pura Osmonizada? La ciencia detrás de nuestra limpieza.
    - Plataformas Elevadoras y Pértigas: cómo trabajamos la limpieza en altura en Benidorm (sin descolgamientos, hasta 20 metros)

## contacto.html (y sus versiones en/, fr/, de/, ru/)
- ✅ Email resuelto: `limpiezas.luzdeluna@gmail.com` ya estaba puesto en las páginas legales (aviso legal, privacidad, accesibilidad, en todos los idiomas) y ahora también en la tarjeta "Email" de la propia página de contacto, en las 5 versiones de idioma.
- ✅ Mapa resuelto (2026-08-22): en vez de esperar la chincheta exacta del negocio, se ha añadido un mapa interactivo (Leaflet + OpenStreetMap, sin coste ni API key) en `assets/js/service-area-map.js` que delimita la zona de servicio con un polígono desde Finestrat hasta Calpe, incluyendo Callosa d'en Sarrià, Altea, Alfaz del Pi, La Nucía, Villajoyosa y Benidorm (con nota de que Benidorm incluye Levante, Poniente, Rincón de Loix, Centro, La Cala y Sierra Helada). Si el cliente da más adelante la dirección exacta de la base operativa, se puede añadir un marcador de "sede" sobre este mismo mapa.
- El listado de zonas SEO (Levante, Poniente, Rincón de Loix, Centro, La Cala, Sierra Helada, Altea, Alfaz del Pi, La Nucía, Villajoyosa, Finestrat) sigue en la página pero todavía no se ha enlazado a URLs internas. Se deja pendiente a propósito.

## nosotros.html
- B11 menciona "Foto Sugerida: Una foto del equipo uniformado frente a un rascacielos o con sus vehículos rotulados para humanizar la marca." — el cliente confirma (2026-08-22) que de momento NO la va a facilitar porque el personal cambia con frecuencia. Queda descartada hasta nuevo aviso; no usar fotos de stock ni inventadas como sustituto.
- Inconsistencia del "30 años" ya resuelta: se ha unificado en todo el sitio (todos los idiomas) al formato "+30 años" / "+30 years" / "+30 ans" / "+30 Jahre" / "+30 лет", salvo en las frases narrativas de la página "Nosotros" ("Hoy, 30 años después...") que se dejan literales porque se refieren a la fecha de fundación (1996), no a una cifra de marketing.
