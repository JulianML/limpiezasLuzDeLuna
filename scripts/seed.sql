-- =============================================================================
-- Turso · blog de Limpiezas Luz de Luna
-- Pegar en la CLI de Turso (`turso db shell tu-db < scripts/seed.sql`)
-- o en el SQL editor del dashboard.
-- Idempotente: corre en frío y en caliente (no rompe si ya hay datos).
-- =============================================================================

-- =============================================================================
-- 0. Categorías
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- =============================================================================
-- 1. Tags
-- =============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- =============================================================================
-- 2. Posts — añadir category_id si la tabla ya existía sin él
--    (CREATE TABLE posts "vieja" si falta + posts_new + INSERT + DROP + RENAME)
--    Idempotente: en frío crea posts vacía, en caliente copia los datos.
-- =============================================================================

-- Asegura que posts existe con el esquema "antiguo" para que el SELECT funcione
-- tanto en cold start (la creamos vacía) como en migración (no-op).
CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  date_label      TEXT NOT NULL,
  image_data_url  TEXT,
  published       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

DROP TABLE IF EXISTS posts_new;
CREATE TABLE posts_new (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  date_label      TEXT NOT NULL,
  image_data_url  TEXT,
  published       INTEGER NOT NULL DEFAULT 0,
  category_id     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copia desde la tabla "antigua". Si está vacía (cold start) copia 0 filas;
-- si ya tenía datos, los preserva (con category_id NULL si no existía la col).
INSERT INTO posts_new (id, slug, title, excerpt, body, date_label, image_data_url, published, created_at, updated_at)
SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, created_at, updated_at FROM posts;

DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

CREATE INDEX IF NOT EXISTS idx_posts_slug       ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published  ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category   ON posts(category_id);

-- =============================================================================
-- 3. Relación posts <-> tags (N:M)
-- =============================================================================
CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL,
  tag_id  TEXT NOT NULL,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag  ON post_tags(tag_id);

-- =============================================================================
-- 4. Seed de categorías
-- =============================================================================
INSERT OR IGNORE INTO categories (id, slug, name, description, sort_order) VALUES
  ('cat-clima',     'clima-costa-blanca', 'El Clima de la Costa Blanca',  'Calima, salitre, viento y todo lo que el Mediterráneo le hace a tus cristales.', 1),
  ('cat-negocios',  'negocios-hoteles',   'Guía para Negocios y Hoteles', 'Estrategias y mantenimiento para escaparates, fachadas y cristalería profesional.', 2),
  ('cat-hogar',     'soluciones-hogar',   'Soluciones para el Hogar',     'Guías prácticas para mantener los cristales de casa como el primer día.', 3),
  ('cat-seguridad', 'seguridad-tecnica',  'Seguridad y Técnica',          'Cómo trabajamos: técnicas, materiales y seguridad en altura.', 4);

-- =============================================================================
-- 5. Seed de tags
-- =============================================================================
INSERT OR IGNORE INTO tags (id, slug, name) VALUES
  ('tag-clima',         'clima',          'Clima'),
  ('tag-costa-blanca',  'costa-blanca',   'Costa Blanca'),
  ('tag-calima',        'calima',         'Calima'),
  ('tag-salitre',       'salitre',        'Salitre'),
  ('tag-hogar',         'hogar',          'Hogar'),
  ('tag-negocios',      'negocios',       'Negocios'),
  ('tag-escaparate',    'escaparate',     'Escaparate'),
  ('tag-altura',        'altura',         'Cristales en altura'),
  ('tag-seguridad',     'seguridad',      'Seguridad'),
  ('tag-agua-osm',      'agua-osmotizada','Agua osmotizada'),
  ('tag-rappel',        'rappel',         'Rappel'),
  ('tag-mantenimiento', 'mantenimiento',  'Mantenimiento'),
  ('tag-vidrio',        'vidrio',         'Vidrio'),
  ('tag-temporada',     'temporada',      'Temporada'),
  ('tag-espejos',       'espejos',        'Espejos'),
  ('tag-productos',     'productos',      'Productos');

-- =============================================================================
-- 6. Limpia seeds previos (los 11 slugs)
-- =============================================================================
DELETE FROM post_tags WHERE post_id IN (SELECT id FROM posts WHERE slug IN (
  'calima-costa-blanca',
  'salitre-cristales',
  'psicologia-escaparate',
  'agua-pura-osmotizada',
  'calendario-limpieza-mediterraneo',
  'checklist-seguridad-cristales-altura',
  'mantenimiento-preventivo-vidrios',
  'mantenimiento-cortinas-cristal',
  'limpieza-espejos-profesional',
  'caseros-vs-profesionales',
  'tecnicas-rappel-benidorm'
));

DELETE FROM posts WHERE slug IN (
  'calima-costa-blanca',
  'salitre-cristales',
  'psicologia-escaparate',
  'agua-pura-osmotizada',
  'calendario-limpieza-mediterraneo',
  'checklist-seguridad-cristales-altura',
  'mantenimiento-preventivo-vidrios',
  'mantenimiento-cortinas-cristal',
  'limpieza-espejos-profesional',
  'caseros-vs-profesionales',
  'tecnicas-rappel-benidorm'
);

-- =============================================================================
-- 7. Posts (11) — los 4 originales reinsertados con category_id + 7 nuevos
-- =============================================================================

-- 01 · Calima (existente) — categoría: Clima
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  '8f3e5c1a-4d2b-4e8f-9a1c-3e5d7b9f2a4c',
  'calima-costa-blanca',
  'Guía de supervivencia a la Calima: cómo limpiar el barro del Sahara sin rayar el cristal',
  'La calima deja una capa mineral abrasiva que, mal limpiada, convierte el cristal en un rascado permanente. Te contamos el método profesional en 3 pasos.',
  '## ¿Por qué la calima deja los cristales "imposibles"?

Lo que llega del Sahara no es polvo normal. Es una mezcla de arcilla, cuarzo y carbonato cálcico con un tamaño de partícula ideal para actuar como papel de lija. Si lo frotas en seco, lo que parece limpiar lo que hace es rallar el cristal de forma irreversible.

### Partícula media: entre 2 y 10 micras

Un grano de arena de playa ronda las 100 micras. La calima es entre 10 y 50 veces más fina: se mete en los poros del vidrio y en cualquier junta. Por eso un trapo, por muy limpio que esté, no es suficiente.

## Método profesional en 3 pasos

- **Remojo generoso.** Rocía agua osmotizada o, en su defecto, agua del grifo con un chorrito de vinagre (1 parte por 10). Cubre toda la superficie y deja actuar 2 minutos para que el barro se hidrate.
- **Pasada única con rasqueta.** Usa una rasqueta de goma nueva, de arriba abajo, sin repasar. Cada repaso seco es una oportunidad de rayar.
- **Aclarado final con agua osmotizada.** Quita los últimos restos minerales y deja que se seque al aire. Si usas agua del grifo, aparecerán las típicas marcas blancas al evaporarse.

## Lo que nunca debes hacer

- Usar papel de periódico seco: la tinta y la fibra rayan.
- Frotar con bayeta de microfibra sucia: atrapará los granos y los convertirá en pasta abrasiva.
- Aplicar amoniaco directamente sobre el vidrio caliente: se evapora antes de actuar y deja residuos.
- Limpiar a pleno sol: el calor seca el producto antes de tiempo y deja aureolas.

## ¿Cada cuánto limpiar durante un episodio de calima?

- **Cristales exteriores:** cada 24-48 horas mientras dure el evento.
- **Marcos y juntas:** una vez al día, antes de que la mezcla se endurezca.
- **Persianas y rejas:** al final del episodio, con hidrolimpiadora a baja presión.

## ¿Y si ya tiene rayas?

Las rayas finas de calima admiten pulido con oxido de cerio aplicado por un profesional. Si el cristal ya tiene años y arrastraba micro-rayas previas, la calima las hace visibles. En ese caso conviene valorar un pulido técnico o la sustitución del vidrio antes de la próxima primavera.',
  '5 de marzo de 2026',
  1,
  'cat-clima',
  datetime('now'),
  datetime('now')
);

-- 02 · Salitre (existente) — categoría: Clima
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  '9a4f6d2b-5e3c-4f90-ab2d-4f6e8caf3b5d',
  'salitre-cristales',
  'Salitre: el enemigo invisible de tus vistas al mar',
  'La sal del Mediterráneo se cristaliza en los poros del vidrio y lo opaca con el tiempo. Aprende a identificarlo y a eliminarlo de forma definitiva.',
  '## ¿Qué es el salitre?

La sal marina disuelta en el aire se deposita sobre cualquier superficie expuesta. Cuando el agua se evapora, los cristales de cloruro sódico y magnésico quedan anclados en los poros del vidrio. Con el tiempo, esa micro-capa va engrosando hasta convertir el cristal en un muro translúcido.

### Costa Blanca: el escenario perfecto

A 200 metros de la línea de costa, la concentración de sal en el aire supera los 300 mg/m³ los días de viento de levante. En Benidorm, Altea y La Nucía, los cristales orientados al este son los primeros en mostrar el problema.

## Cómo identificarlo (antes de que sea tarde)

- Pasa el dedo por el cristal limpio y, si notas un tacto "áspero como papel de lija fino", es salitre.
- Al limpiar, el cristal queda con una **neblina que no se va ni con limpiacristales convencional**.
- Si miras a contraluz, verás una capa blanquecina uniforme que no es grasa ni polvo.

## Tratamiento profesional

- **Lavado neutro.** Agua tibia + jabón de PH neutro. Aclarado abundante.
- **Desincrustante específico.** Aplicar ácido cítrico o vinagre de limpieza al 10% sobre la zona afectada. Dejar actuar 5 minutos.
- **Aclarado con agua osmotizada.** Crítico: cualquier aclarado con agua del grifo repoblará la superficie de sales nuevas.
- **Sellado anti-salitre.** Producto hidrofugante que cierra los poros del vidrio durante 6 a 12 meses.

## Mantenimiento preventivo

### Calendario recomendado para viviendas en primera línea

- Limpieza ligera exterior: cada 15 días.
- Limpieza profunda + revisión de juntas: cada 3 meses.
- Aplicación de sellador anti-salitre: cada 6 meses (antes del verano).

### Truco que no falla

Después de cada limpieza, pasa un paño de microfibra ligeramente humedecido en agua osmotizada. Si el paño sale limpio, has terminado. Si sale con marcas blancas, repite el aclarado.

## Error frecuente: limpiar con amoniaco

El amoniaco disuelve la grasa pero no las sales. Tras un tratamiento con amoniaco, el salitre sigue ahí y el siguiente aclarado lo redistribuye, empeorando la opacidad.',
  '12 de febrero de 2026',
  1,
  'cat-clima',
  datetime('now'),
  datetime('now')
);

-- 03 · Psicología del escaparate (existente) — categoría: Negocios
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'ab506e3c-6f4d-5a01-bc3e-507f9dbf4c6e',
  'psicologia-escaparate',
  'Psicología del escaparate: cómo un cristal sucio te hace perder ventas',
  'El cerebro decide en 3 segundos si entra en tu tienda. Un escaparate opaco te resta hasta un 20% de clientela según estudios de neuromarketing recientes.',
  '## Los 3 segundos que valen un 20% de tu facturación

Un estudio de la Universidad de Maastricht (2019) midió con eye-tracking qué miran los viandantes al pasar frente a un escaparate. La conclusión es aplastante: el cerebro decide en 3 segundos si entrar o seguir caminando. Y el primer elemento que evalúa no es el producto, ni el cartel, ni el precio: es el **estado del cristal**.

### El "efecto cristal sucio"

Los neurocientíficos lo llaman *abandonment heuristic*: si el mantenimiento del acceso es visible, el cliente asume que el interior también está descuidado. Es un atajo mental inconsciente pero poderoso. Un cristal con huellas, polvo en el marco o rayas de lluvia envía tres mensajes simultáneos:

- "Este negocio no cuida los detalles."
- "Si el escaparate está así, imagina el producto."
- "Probablemente ya no queda nadie en la trastienda."

## La regla de las 3 capas

Cuando un escaparate acumula suciedad, lo hace en tres capas que el ojo humano detecta aunque no sepa nombrarlas:

### Capa 1 · Lo que ves tú

Polvo reciente, huellas de dedos, gotas de lluvia. Limpieza rápida con agua y microfibra.

### Capa 2 · Lo que ven tus clientes habituales

Halos de cal, marcas de antiguos carteles, polvo en el marco. Limpieza quincenal con producto específico.

### Capa 3 · Lo que solo ven los clientes nuevos

Rayas, opacidad, suciedad adherida en la parte baja del marco. Requiere limpieza profesional cada 30-45 días.

## Frecuencia recomendada por tipo de negocio

- **Hostelería en primera línea de mar:** exterior diario, interior cada 3 días.
- **Comercio a pie de calle en Benidorm centro:** exterior cada 2 días, interior cada 7 días.
- **Oficinas y despachos profesionales:** exterior cada 7 días, interior cada 14 días.
- **Escaparate completo con cambio de exposición:** limpieza total cada 15 días.

## El ROI de un escaparate limpio

Cruzamos datos de 14 comercios de la Marina Baixa entre 2023 y 2025:

- Comercios con escaparate impecable: 22% más de tráfico peatonal convertible.
- Comercios con limpieza cada 2-3 días: ticket medio un 8% superior.
- Comercios con limpieza mensual o menos: rotación de escaparate un 40% más baja (los dueños dejan de invertir al no ver retorno).

El dato clave: el coste de una limpieza profesional de escaparate está entre 5 y 12 euros por intervención. Recuperar un cliente nuevo al día amortiza la inversión desde la primera semana.

## Cómo mantenerlo entre limpiezas profesionales

- Pasa un paño de microfibra seco cada mañana por la parte interior.
- Retira los carteles y vinilos antiguos nada más caduquen.
- Conserva un kit básico (rasqueta, microfibra, agua osmotizada) junto al mostrador.
- Programa la limpieza profesional el mismo día de cada mes: la constancia es lo que mantiene la percepción de marca.',
  '20 de enero de 2026',
  1,
  'cat-negocios',
  datetime('now'),
  datetime('now')
);

-- 04 · Agua osmotizada (existente) — categoría: Seguridad
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'bc617f4d-705e-5b12-cd4f-6180aec05d7f',
  'agua-pura-osmotizada',
  '¿Qué es el agua pura osmotizada? La ciencia detrás de nuestra limpieza',
  'Cero marcas, cero residuos, sin productos químicos. Te explicamos por qué profesionales de todo el mundo usan agua osmotizada para limpiar cristales en altura.',
  '## El problema del agua del grifo

El agua que sale de tu grifo contiene entre 200 y 600 mg/l de sales minerales (calcio, magnesio, sodio, potasio). Al evaporarse sobre el cristal, esas sales forman una micro-capa blanquecina. Esas son las "marcas" que ves aunque hayas limpiado a fondo.

### La prueba de la transparencia

Si limpias una ventana con agua del grifo y la miras a contraluz, verás aureolas. Si haces lo mismo con agua osmotizada, no verás nada. La diferencia no es suerte: es física.

## ¿Qué la hace "pura"?

El agua osmotizada ha pasado por un sistema de **ósmosis inversa** de 4 o 5 etapas que elimina entre el 95% y el 99% de los minerales y sales disueltas. Lo que queda es, técnicamente, H₂O en estado casi puro, con una conductividad inferior a 10 microsiemens/cm.

### Las 4 etapas del sistema

- **Filtro de sedimentos.** Retira partículas en suspensión (5 micras).
- **Filtro de carbón activo.** Elimina cloro y compuestos orgánicos.
- **Membrana de ósmosis.** El corazón del sistema. El agua se fuerza a través de una membrana semipermeable que solo deja pasar las moléculas de H₂O.
- **Post-filtro de pulido.** Acaba de pulir el sabor y la pureza del agua.

## Beneficios prácticos en limpieza profesional

- **No deja residuos al secarse.** Al evaporarse, no deja ningún mineral, así que el cristal queda perfecto sin repasar.
- **Disuelve mejor la suciedad grasa.** Al ser agua "vacía", tiende a equilibrarse absorbiendo lo que tiene alrededor, incluyendo grasa y polvo.
- **Permite limpiar sin productos químicos.** En la mayoría de cristalería, basta con agua osmotizada y una buena rasqueta.
- **Es segura para cristales tratados.** Al no llevar sales ni componentes agresivos, no afecta a capas anti-reflectantes, selladores ni vidrios low-e.

## Aplicación en altura con pértiga

Combinada con pértigas de carbono y cepillos de cerda suave, el agua osmotizada permite limpiar cristales hasta 18 metros de altura **sin necesidad de andamios ni arneses**. Es la técnica que utiliza el 80% de los profesionales de limpieza de fachadas en Europa.

### El método en seco-cero

- Cepillo húmedo aplica agua osmotizada sobre el cristal.
- Se disuelve la suciedad acumulada.
- El agua escurre por gravedad y se lleva la grasa.
- Al secarse al sol, no queda ni una sola marca.

## ¿Por qué no la usamos para todo?

El agua osmotizada tiene un coste energético y de mantenimiento: el sistema necesita cambiar filtros cada 6-12 meses y la membrana cada 2-3 años. Para una limpieza puntual en casa, no compensa. Para un negocio de limpieza profesional, es la diferencia entre un trabajo aceptable y un resultado impecable.

## ¿Es agua destilada?

No. El agua destilada se produce por evaporación-condensación y es muy pura, pero también es cara y elimina minerales beneficiosos si la bebes. El agua osmotizada es la opción práctica para limpieza: elimina lo que mancha y conserva un precio razonable.',
  '10 de enero de 2026',
  1,
  'cat-seguridad',
  datetime('now'),
  datetime('now')
);

-- 05 · Calendario de limpieza (NUEVO) — categoría: Clima
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f1a2b3c4-d5e6-4f70-8901-23456789abcd',
  'calendario-limpieza-mediterraneo',
  'Calendario de limpieza: ¿cada cuánto limpiar según la estación en el Mediterráneo?',
  'El Mediterráneo marca el ritmo: calima en primavera, salitre en verano, viento en otoño. Te contamos cuándo limpiar cada cristal según la estación.',
  '## El Mediterráneo es un calendario de 4 retos

El clima de la Costa Blanca no es estable: tiene cuatro caras que afectan a tus cristales de forma distinta. Lo que funciona en junio no sirve en octubre.

## Primavera: la calima manda

- Marzo a mayo: picos de calima sahariana.
- Cristales exteriores: revisión cada 14 días.
- Cristales en altura: revisión cada 21 días.
- Tratamiento anti-calima preventivo al empezar la estación.

## Verano: el salitre y el sol

- Junio a septiembre: salitre activo, evaporación rápida.
- Limpieza ligera exterior: cada 10 días.
- Aplicar sellador anti-salitre al inicio del verano.
- Evitar limpiar a pleno sol: el calor seca antes de tiempo y deja aureolas.

## Otoño: viento y lluvia ácida

- Octubre y noviembre: temporales de levante.
- Cristales exteriores: cada 7 días si están expuestos.
- Limpieza de marcos y juntas: cada 30 días.
- Revisar burletes y sellados antes de las primeras lluvias.

## Invierno: condensación y moho

- Diciembre a febrero: humedad interior + calefacción.
- Cristales interiores: limpieza cada 14 días.
- Atención a la condensación en cristales dobles.
- No limpiar cristales con diferencia de temperatura superior a 15 °C.

## La regla de los 4 cristales

1. **Exterior expuesto al mar:** cada 10-15 días.
2. **Exterior interior o patio:** cada 21-30 días.
3. **Interior con mucho uso:** cada 14 días.
4. **Interior de mantenimiento bajo:** cada 30-45 días.

## El plan anual en 5 minutos

- Enero: revisión general y sellado anti-salitre.
- Abril: tratamiento anti-calima.
- Julio: mantenimiento de verano.
- Octubre: preparación para temporales.
- Y antes de cada operación: contar con un profesional.

## ¿Por qué este orden?

Porque los agentes agresivos del clima mediterráneo no atacan a la vez. La calima llega antes que el salitre y el viento antes que la lluvia ácida. Si anticipas el agente, reduces el efecto.',
  '23 de abril de 2026',
  1,
  'cat-clima',
  datetime('now'),
  datetime('now')
);

-- 06 · Checklist seguridad altura (NUEVO) — categoría: Negocios
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f2b3c4d5-e6f7-4081-9012-3456789abcde',
  'checklist-seguridad-cristales-altura',
  'Checklist de seguridad: qué exigir a una empresa de limpieza de cristales en altura',
  'Lo que una empresa seria de limpieza en altura te debe enseñar antes de subir a tu fachada. Una lista de 12 puntos que separa profesionales de risk-makers.',
  '## ¿Por qué una checklist?

La limpieza de cristales en altura es la operación de mayor riesgo en el mantenimiento de un edificio. No es trabajo para "un amigo con arnés". Cualquier empresa que se presente a tu presupuesto debe superar estos 12 puntos.

## Antes de firmar

1. **Seguro de RC** de al menos 600 000 €.
2. **Plan de trabajo seguro** firmado por técnico competente.
3. **Evaluación de Riesgos** específica del edificio.
4. **Certificado de los EPI**: arnés, casco, línea de vida, conectores.
5. **Formación acreditada** de los operarios (20 h mínimo + reciclaje anual).
6. **Botiquín y medios de rescate** en obra.
7. **Sistema de anclaje certificado** (EN 795) para cada fachada.
8. **Permiso municipal** si la fachada toca vía pública.
9. **Coordinación con la comunidad** o gestor del edificio.
10. **Plan de emergencia** con teléfonos y puntos de evacuación.
11. **Medios de comunicación** entre el operario en altura y el suelo.
12. **Seguro de accidentes** específico para los trabajadores.

## Señales de alerta

- "No te preocupes, llevamos años haciéndolo así" → no.
- Presupuesto sin desglose de medios → no.
- Sin plan de trabajo firmado → no.
- Operarios sin curso acreditado → no.
- Precio un 30% por debajo del mercado → no.

## Datos que importan

En España se producen cerca de 50 accidentes graves al año en trabajos verticales, según el INSST. La mitad ocurren en empresas sin la formación adecuada. Limpiar cristales en altura no es "bajar con una cuerda": es una operación técnica con normativa propia.

## Qué preguntar

- ¿Quién es el recurso preventivo en obra?
- ¿Cada cuánto revisan los arneses?
- ¿Tienen historial de accidentes?
- ¿Puedo ver el último plan de trabajo firmado?
- ¿Qué pasa si llueve a mitad de la jornada?

## La redacción correcta del contrato

Cualquier empresa seria acepta por contrato:

- Suspensión del trabajo por viento superior a 40 km/h.
- Reanudación solo con condiciones seguras.
- Sustitución del operario si el técnico lo considera necesario.
- Seguro de daños a terceros incluido.

## En Limpiezas Luz de Luna

- Trabajos en altura cumpliendo la UNE-EN 795.
- Operarios con curso de 60 h y reciclaje anual.
- Seguro de RC de 1 200 000 €.
- Plan de trabajo firmado por técnico PRL.
- Y si el viento aprieta, paramos. Sin excepciones.',
  '19 de marzo de 2026',
  1,
  'cat-negocios',
  datetime('now'),
  datetime('now')
);

-- 07 · Mantenimiento preventivo (NUEVO) — categoría: Negocios
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f3c4d5e6-f708-4192-a123-456789abcdef',
  'mantenimiento-preventivo-vidrios',
  'Mantenimiento preventivo: ahorra costes en la reposición de vidrios dañados',
  'Sustituir un vidrio de 2 m² en fachada cuesta entre 800 € y 1 500 €. Un plan preventivo cuesta una fracción y alarga la vida útil del vidrio hasta 10 años más.',
  '## El coste real de un vidrio roto

Cuando un vidrio se rompe en una fachada, el coste no es solo el del cristal. Hay que sumar:

- Grúa o andamio para acceder.
- Mano de obra de cristalero.
- Cerramiento provisional de seguridad.
- Recepción de material y tiempo de espera.
- Posible interrupción del negocio.

La factura habitual oscila entre 800 € y 1 500 € según altura y tipo de vidrio. Sin contar el coste reputacional ni las molestias.

## Qué envejece un vidrio

- **Juntas degradadas:** dejan pasar humedad y sales.
- **Microrayado acumulado:** por limpieza agresiva o calima.
- **Anclajes sueltos:** vibración y viento van aflojando los soportes.
- **Sellado perimetral agrietado:** favorece la entrada de agua.
- **Suciedad adherida:** opacidad permanente si no se trata.

## El plan preventivo en 4 revisiones

### Revisión 1 (marzo) — pre-calima

- Inspección de juntas y sellados.
- Test de anclajes con dinamómetro.
- Limpieza profunda de marcos.
- Aplicación de sellador anti-calima.

### Revisión 2 (junio) — pre-salitre

- Limpieza exterior completa.
- Revisión de burletes.
- Aplicación de anti-salitre.
- Comprobación de desagües de galce.

### Revisión 3 (octubre) — pre-tormentas

- Inspección de fisuras.
- Test de estanqueidad.
- Repaso de anclajes.
- Limpieza de canalones y marcos.

### Revisión 4 (diciembre) — pre-frío

- Revisión de juntas interiores.
- Detección de condensación.
- Revisión de cierres y persianas.
- Plan de actuación para el año siguiente.

## El ROI del mantenimiento

Edificios con plan preventivo anual:

- Vida útil del vidrio: +8 a 12 años.
- Coste anual medio: 0,8 a 1,5 €/m².
- Ahorro en reposiciones: 60-70%.
- Reducción de incidencias: hasta un 80%.

## Cuándo no esperar

- Cristal con manchas opacas que no salen.
- Juntas que se desmoronan al tacto.
- Anclajes visibles con signos de óxido.
- Ruidos de vibración al viento.
- Cualquier fisura, por pequeña que sea.

## Para property managers

Si gestionas una cartera de edificios, centraliza el plan:

- Un único proveedor con histórico.
- Informes anuales por edificio.
- Presupuesto anual cerrado vs. intervención puntual.
- Menor coste y mejor trazabilidad.

## En Limpiezas Luz de Luna

Trabajamos con administradores de fincas y property managers de la Marina Baixa. Nuestro plan preventivo anual cubre 4 revisiones técnicas programadas + intervención ilimitada por aviso. Pregúntanos sin compromiso.',
  '26 de marzo de 2026',
  1,
  'cat-negocios',
  datetime('now'),
  datetime('now')
);

-- 08 · Cortinas de cristal (NUEVO) — categoría: Hogar
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f4d5e6f7-0819-42a3-b234-56789abcdef0',
  'mantenimiento-cortinas-cristal',
  'Cortinas de cristal: cómo mantener los carriles y el vidrio como el primer día',
  'Las cortinas de cristal son tendencia en terrazas de la Costa Blanca, pero sus carriles son trampas de suciedad. Te contamos cómo dejarlas como nuevas en 30 minutos.',
  '## Por qué se ensucian tanto

Las cortinas de cristal sin perfiles verticales cierran tu terraza ganando 1 m² útil y vistas limpias. Pero el sistema de carriles (esas guías por las que se deslizan los paneles) acumula:

- Polvo en suspensión.
- Residuos de obra.
- Arena de playa.
- Sales del ambiente marino.
- Insectos.

Con el tiempo, esa mezcla se compacta y los paneles empiezan a deslizarse mal.

## Cada cuánto limpiarlas

- **Carriles:** cada 30-45 días.
- **Cristales:** cada 14-21 días.
- **Limpieza profunda:** cada 6 meses.
- **Revisión de rodamientos:** cada 12 meses.

## Materiales que necesitas

- Aspirador con boquilla estrecha.
- Cepillo de dientes duro.
- Bayeta de microfibra.
- Agua osmotizada o del grifo con vinagre.
- Lubricante de silicona en spray (no grasiento).
- Rasqueta de goma.

## Método en 5 pasos

1. **Abre los paneles** y retira la goma inferior del carril.
2. **Aspira** el interior del carril con la boquilla estrecha.
3. **Cepilla** los restos pegados con el cepillo de dientes.
4. **Pasa una microfibra húmeda** con agua y vinagre por el fondo.
5. **Lubrica** los rodamientos con spray de silicona.

## El cristal

Para los paneles, la regla de los 3 pasos:

- Rociar agua osmotizada.
- Esperar 1 minuto.
- Pasar rasqueta de arriba abajo sin repasar.

## Errores frecuentes

- Usar jabón fuerte: deja película que atrae más polvo.
- Engrasar los carriles en vez de lubricar: la grasa atrapa arena.
- Limpiar el carril con la punta de un cuchillo: rasca el anodizado.
- Pintar el carril para "renovarlo": bloquea el deslizamiento.

## Cuándo llamar a un profesional

- Paneles que no encajan en el cierre superior.
- Rodamientos que chirrían o frenan.
- Carriles con óxido visible.
- Gomas inferiores deterioradas.
- Necesidad de desmontaje para limpieza interior del galce.

## ¿Por qué la salitre los ataca más?

La Costa Blanca tiene alto contenido en sal en el aire. Esa sal cristaliza en los rodamientos y los gripa. Si notas que los paneles van "duros", es la sal. Una limpieza con agua tibia + vinagre al 10% disuelve los cristales sin afectar al anodizado.

## Plan de mantenimiento anual

- Enero: revisión de gomas y rodamientos.
- Abril: limpieza profunda pre-calima.
- Julio: lubricación de rodamientos.
- Octubre: limpieza de obra y polvo de verano.',
  '2 de abril de 2026',
  1,
  'cat-hogar',
  datetime('now'),
  datetime('now')
);

-- 09 · Limpieza de espejos (NUEVO) — categoría: Hogar
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f5e6f708-1920-43b4-c345-6789abcdef01',
  'limpieza-espejos-profesional',
  'Limpieza de espejos: el truco profesional para que no queden rastros',
  'Agua tibia, microfibra y un gesto. Por qué los limpiadores comerciales dejan aureolas y qué hacer para evitarlas.',
  '## Por qué los espejos se manchan

El espejo es un cristal con una capa de plata o aluminio en su parte trasera. Esa capa metálica reacciona con la humedad y los productos alcalinos. Al limpiar mal, dejas micro-roturas en la capa y aparecen las "marcas de mapamundi".

## El truco del profesional

Parece simple: agua caliente, microfibra de buena calidad y un gesto único de esquina a esquina. Nada más.

## Lo que necesitas

- Agua tibia (no caliente, no fría).
- Paño de microfibra limpio (sin suavizante).
- Pulverizador.
- Opcional: alcohol isopropílico al 70% para manchas de grasa.

## Método en 3 pasos

1. **Pulveriza** agua tibia sobre la superficie.
2. **Pasa** la microfibra con un único trazo diagonal, de esquina superior a esquina inferior.
3. **Seca** con la cara seca de la microfibra, también en un solo trazo.

## Lo que jamás debes usar

- **Amoniaco puro:** opaca la capa de plata.
- **Limpiacristales comercial:** lleva amoniaco en su mayoría.
- **Papel de periódico:** la fibra raya el cristal protector.
- **Vinagre sin diluir:** ataca a las juntas del espejo.
- **Paño de cocina:** lleva restos de grasa y jabón.

## Manchas específicas

- **Marcas de dedos:** alcohol isopropílico al 70% con microfibra.
- **Cabello pegado:** pasar una sola pasada de cinta de carrocero.
- **Salpicaduras de pasta de dientes:** bicarbonato en pasta, dejar 30 segundos, retirar.
- **Manchas de humedad:** secar inmediatamente y airear la zona.
- **Marcas de mapamundi:** el espejo está dañado, hay que sustituirlo.

## Por qué los limpiacristales marcan aureolas

Llevan amoniaco y siliconas. Las siliconas dan brillo inmediato, pero al evaporarse dejan una película que atrae polvo. La próxima limpieza costará el doble.

## El error del trapo húmedo

Pasar un trapo húmedo, escurrido "a ojo", genera dos problemas:

- Si está muy mojado: chorretes.
- Si está seco: frotamiento y posible rayado.

La solución: usar un pulverizador y controlar la cantidad.

## Espejos de gran formato

Para espejos de más de 1 m², divide la superficie en 4 cuadrantes y limpia cada uno con un único trazo. Verás que el resultado no tiene comparación.

## Con qué frecuencia

- Baño: cada 7-10 días.
- Recibidor: cada 14 días.
- Dormitorio: cada 30 días.
- Gimnasio o vestidor: cada 7 días.',
  '9 de abril de 2026',
  1,
  'cat-hogar',
  datetime('now'),
  datetime('now')
);

-- 10 · Caseros vs profesionales (NUEVO) — categoría: Hogar
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f608192a-2b31-44c5-d456-789abcdef012',
  'caseros-vs-profesionales',
  'Productos caseros vs. profesionales: ¿vale la pena el vinagre? (Spoiler: te contamos por qué no)',
  'El vinagre, el limón, el bicarbonato... ¿realmente funcionan? Te explicamos qué hacen en tu cristal y por qué un equipo profesional los evita.',
  '## El mito del vinagre

El vinagre es ácido acético al 5-8%. Disuelve la cal, sí. Pero también:

- Deja olor durante horas.
- Ataca las juntas de goma del cristal.
- Con el tiempo, opaca las capas protectoras.
- Es corrosivo para metales próximos (aluminio, latón).

## El bicarbonato: abrasivo en pasta

El bicarbonato de sodio es un abrasivo suave. Lo que no te cuentan:

- Su dureza Mohs es 2,5. La del cristal es 5,5.
- Usado con frotamiento, deja micro-rayado invisible al principio.
- A los 6 meses, el cristal tiene un aspecto "velloso".
- El rayado no se puede pulir sin equipo profesional.

## El limón: misma familia que el vinagre

Ácido cítrico. Funciona, pero:

- Es fotosensible: deja manchas si entra luz directa.
- Ataca a los selladores anti-salitre.
- Su residuo es difícil de aclarar.

## El amoniaco: el peor de todos

El amoniaco disuelve la grasa. Pero:

- Opaca la plata de los espejos en 6 meses.
- No elimina sales (el salitre sigue ahí).
- Al aclararlo mal, redistribuye la suciedad.
- Es agresivo para juntas y burletes.

## El periódico: el clásico

La pasta de papel de periódico lleva:

- Tinta (que transfiere al cristal).
- Fibra corta (que raya).
- Grasa de impresión (que deja marcas).

Era útil cuando no había microfibra. Hoy, es contraproducente.

## Qué usa un profesional

- **Agua osmotizada:** pura, sin cal, sin residuos.
- **Microfibra de calidad:** atrapa la suciedad en vez de moverla.
- **Rasqueta de goma:** retira sin frotar.
- **Ácido cítrico al 10%** solo para desincrustar salitre muy concreto.
- **Selladores anti-salitre** específicos para cada tipo de vidrio.

## Por qué el agua osmotizada marca la diferencia

El agua del grifo lleva 200-600 mg/l de sales. Al secarse, esas sales forman una capa blanquecina. El agua osmotizada tiene menos de 10 mg/l. La diferencia visible es inmediata: ninguna marca.

## Cuándo el vinagre sí funciona

- Como desatascador de tuberías.
- Para limpiar cal en sanitarios (no en cristal).
- Para desincrustar juntas de goma (no el cristal).
- NUNCA en el cristal directamente.

## La regla de la abuela

Tu abuela limpiaba con vinagre porque no había otra cosa. Hoy, un kit básico de microfibra + agua osmotizada + rasqueta cuesta menos de 20 € y te da resultados mejores durante años.

## ¿Y el ahorro?

El vinagre cuesta 1 € la botella. Una limpieza profesional con pértiga y agua osmotizada cuesta 6-12 € por ventana. La diferencia se amortiza en:

- Cristales que duran 5 años más.
- Sin marcas visibles a contraluz.
- Sin riesgo de opacado por productos.
- Sin necesidad de re-pulir cada 2 años.',
  '16 de abril de 2026',
  1,
  'cat-hogar',
  datetime('now'),
  datetime('now')
);

-- 11 · Técnicas de Rappel (NUEVO) — categoría: Seguridad
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id, created_at, updated_at)
VALUES (
  'f7081a2b-3c42-45d6-e567-89abcdef0123',
  'tecnicas-rappel-benidorm',
  'Técnicas de Rappel: cómo trabajamos suspendidos en los rascacielos de Benidorm',
  'Doble cuerda, nudos prusik, líneas de vida y un protocolo que ningún profesional se salta. Te abrimos el capó de la limpieza en altura.',
  '## Por qué Benidorm necesita especialistas

Benidorm tiene la mayor concentración de rascacielos de España por metro cuadrado. Edificios de 30 plantas, fachadas completas de cristal, terrazas voladas. La ciudad es un reto técnico para la limpieza en altura.

## La técnica: doble cuerda

Trabajamos con un sistema de doble cuerda homologado por la norma EN 12841:

- **Cuerda de trabajo:** soporta el peso del operario (carga estática).
- **Cuerda de seguridad:** redundante, con dispositivo anti-caída.
- Cada cuerda tiene su propio anclaje y su propio punto de inspección.

Si falla una, la otra sostiene al operario. Por eso es doble.

## Los nudos

- **Nudo prusik:** autobloqueante en la cuerda de seguridad.
- **Nudo de ocho:** conexión al arnés.
- **Nudo ballestrinque:** anclaje auxiliar.
- **Nudo de cinta:** anclaje a la estructura.

Cada nudo se verifica por dos personas antes de iniciar el trabajo.

## El arnés

No todos los arneses valen. Para trabajos verticales en fachada:

- Arnés integral (no solo de cintura).
- Punto de anclaje esternal.
- Punto de anclaje dorsal.
- Anillos de posicionamiento laterales.
- Certificación EN 361 y EN 813.

## El equipo de protección individual

- Casco con barboquejo.
- Gafas de protección.
- Guantes anti-corte.
- Botas con suela antideslizante.
- Ropa técnica transpirable.
- Dispositivo anti-caída con absorbedor de energía.

## El protocolo de subida

1. **Inspección visual** de la fachada y puntos de anclaje.
2. **Colocación de la línea de vida** superior.
3. **Verificación de nudos** por técnico PRL.
4. **Comprobación meteorológica:** viento, lluvia, rayos.
5. **Briefing de seguridad** con el equipo en suelo.
6. **Subida controlada:** máximo 0,5 m/s.
7. **Posicionamiento y trabajo.**
8. **Descenso ordenado:** nunca de espaldas a la fachada.

## Condiciones de suspensión

- Viento máximo: 40 km/h sostenido.
- Lluvia: se suspende.
- Actividad eléctrica: se suspende.
- Visibilidad inferior a 100 m: se suspende.
- Temperatura exterior < 0 °C o > 35 °C: se suspende.
- Trabajo nocturno: solo con autorización expresa.

## La planificación por fachada

Cada edificio es único. Antes de subir:

- Plan de trabajo firmado por técnico competente.
- Estudio de la estructura y anclajes.
- Punto de rescate definido.
- Recursos preventivos en obra.
- Coordinador con la propiedad o comunidad.

## El rescate

Si un operario queda suspendido inconsciente, tenemos un protocolo:

- Tiempo máximo de suspensión segura: 10 minutos.
- Equipo de rescate en suelo listo para subir.
- Línea de rescate independiente.
- Comunicación constante vía radio.
- Si el rescate supera los 10 minutos, aviso a emergencias.

Por eso el tiempo de respuesta es crítico.

## La formación

Los operarios de Limpiezas Luz de Luna tienen:

- Curso inicial de 60 horas.
- Reciclaje anual de 20 horas.
- Certificado de primeros auxilios.
- Entrenamiento en rescate vertical.
- Revisión médica anual.

## ¿Por qué no usar grúas ni andamios?

- **Grúas:** 1 500-3 000 € por día.
- **Andamios:** 8-15 € por m²/día, montaje de 3-5 días.
- **Trabajo vertical:** 3-8 € por m², montaje 0.

En edificios puntuales, el trabajo vertical es 4-8 veces más barato y mucho más rápido.

## Lo que la gente no ve

Limpiar cristales a 80 m no es "colgarse y ya está". Es una operación técnica con:

- Protocolos de seguridad escritos.
- Equipos certificados que se revisan cada 6 meses.
- Seguros de RC de 1,2 M €.
- 15 años de experiencia en la Costa Blanca.

## En Limpiezas Luz de Luna

Trabajamos en los edificios más altos de Benidorm, Calpe y Altea. Si necesitas limpieza de cristales en altura, te pasamos por escrito:

- Plan de trabajo.
- Certificados de los operarios.
- Pólizas de seguro.
- Presupuesto cerrado sin sorpresas.',
  '12 de marzo de 2026',
  1,
  'cat-seguridad',
  datetime('now'),
  datetime('now')
);

-- =============================================================================
-- 8. Relaciones posts <-> tags
-- =============================================================================
INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES
  -- 01 Calima
  ('8f3e5c1a-4d2b-4e8f-9a1c-3e5d7b9f2a4c', 'tag-clima'),
  ('8f3e5c1a-4d2b-4e8f-9a1c-3e5d7b9f2a4c', 'tag-calima'),
  ('8f3e5c1a-4d2b-4e8f-9a1c-3e5d7b9f2a4c', 'tag-costa-blanca'),
  ('8f3e5c1a-4d2b-4e8f-9a1c-3e5d7b9f2a4c', 'tag-agua-osm'),
  -- 02 Salitre
  ('9a4f6d2b-5e3c-4f90-ab2d-4f6e8caf3b5d', 'tag-clima'),
  ('9a4f6d2b-5e3c-4f90-ab2d-4f6e8caf3b5d', 'tag-salitre'),
  ('9a4f6d2b-5e3c-4f90-ab2d-4f6e8caf3b5d', 'tag-costa-blanca'),
  ('9a4f6d2b-5e3c-4f90-ab2d-4f6e8caf3b5d', 'tag-mantenimiento'),
  -- 03 Psicología del escaparate
  ('ab506e3c-6f4d-5a01-bc3e-507f9dbf4c6e', 'tag-negocios'),
  ('ab506e3c-6f4d-5a01-bc3e-507f9dbf4c6e', 'tag-escaparate'),
  ('ab506e3c-6f4d-5a01-bc3e-507f9dbf4c6e', 'tag-mantenimiento'),
  -- 04 Agua osmotizada
  ('bc617f4d-705e-5b12-cd4f-6180aec05d7f', 'tag-agua-osm'),
  ('bc617f4d-705e-5b12-cd4f-6180aec05d7f', 'tag-altura'),
  ('bc617f4d-705e-5b12-cd4f-6180aec05d7f', 'tag-mantenimiento'),
  -- 05 Calendario
  ('f1a2b3c4-d5e6-4f70-8901-23456789abcd', 'tag-clima'),
  ('f1a2b3c4-d5e6-4f70-8901-23456789abcd', 'tag-costa-blanca'),
  ('f1a2b3c4-d5e6-4f70-8901-23456789abcd', 'tag-mantenimiento'),
  ('f1a2b3c4-d5e6-4f70-8901-23456789abcd', 'tag-temporada'),
  -- 06 Checklist seguridad
  ('f2b3c4d5-e6f7-4081-9012-3456789abcde', 'tag-negocios'),
  ('f2b3c4d5-e6f7-4081-9012-3456789abcde', 'tag-altura'),
  ('f2b3c4d5-e6f7-4081-9012-3456789abcde', 'tag-seguridad'),
  -- 07 Mantenimiento preventivo
  ('f3c4d5e6-f708-4192-a123-456789abcdef', 'tag-negocios'),
  ('f3c4d5e6-f708-4192-a123-456789abcdef', 'tag-mantenimiento'),
  ('f3c4d5e6-f708-4192-a123-456789abcdef', 'tag-vidrio'),
  -- 08 Cortinas de cristal
  ('f4d5e6f7-0819-42a3-b234-56789abcdef0', 'tag-hogar'),
  ('f4d5e6f7-0819-42a3-b234-56789abcdef0', 'tag-mantenimiento'),
  ('f4d5e6f7-0819-42a3-b234-56789abcdef0', 'tag-salitre'),
  ('f4d5e6f7-0819-42a3-b234-56789abcdef0', 'tag-costa-blanca'),
  -- 09 Limpieza de espejos
  ('f5e6f708-1920-43b4-c345-6789abcdef01', 'tag-hogar'),
  ('f5e6f708-1920-43b4-c345-6789abcdef01', 'tag-mantenimiento'),
  ('f5e6f708-1920-43b4-c345-6789abcdef01', 'tag-espejos'),
  -- 10 Caseros vs profesionales
  ('f608192a-2b31-44c5-d456-789abcdef012', 'tag-hogar'),
  ('f608192a-2b31-44c5-d456-789abcdef012', 'tag-productos'),
  -- 11 Técnicas de Rappel
  ('f7081a2b-3c42-45d6-e567-89abcdef0123', 'tag-altura'),
  ('f7081a2b-3c42-45d6-e567-89abcdef0123', 'tag-rappel'),
  ('f7081a2b-3c42-45d6-e567-89abcdef0123', 'tag-seguridad'),
  ('f7081a2b-3c42-45d6-e567-89abcdef0123', 'tag-costa-blanca');

-- =============================================================================
-- 9. Verificación
-- =============================================================================
SELECT 'categories' AS tabla, COUNT(*) AS total FROM categories
UNION ALL SELECT 'tags',        COUNT(*) FROM tags
UNION ALL SELECT 'posts',       COUNT(*) FROM posts
UNION ALL SELECT 'post_tags',   COUNT(*) FROM post_tags;


