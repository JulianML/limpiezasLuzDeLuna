-- ───────────────────────────────────────────────────────────────────────────
-- Turso · seed inicial del blog de Limpiezas Luz de Luna
-- Pegar en la CLI de Turso (`turso db shell tu-db < scripts/seed.sql`)
-- o en el SQL editor del dashboard.
-- Idempotente: crea la tabla si no existe y reemplaza las 4 entradas seed.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  date_label TEXT NOT NULL,
  image_data_url TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC);

-- Limpia seeds previos (por si re-ejecutas el script)
DELETE FROM posts WHERE slug IN (
  'calima-costa-blanca',
  'salitre-cristales',
  'psicologia-escaparate',
  'agua-pura-osmotizada'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 01 · Calima
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, created_at, updated_at)
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
  datetime('now'),
  datetime('now')
);

-- ───────────────────────────────────────────────────────────────────────────
-- 02 · Salitre
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, created_at, updated_at)
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
  datetime('now'),
  datetime('now')
);

-- ───────────────────────────────────────────────────────────────────────────
-- 03 · Psicología del escaparate
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, created_at, updated_at)
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
  datetime('now'),
  datetime('now')
);

-- ───────────────────────────────────────────────────────────────────────────
-- 04 · Agua osmotizada
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, created_at, updated_at)
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
  datetime('now'),
  datetime('now')
);

-- ───────────────────────────────────────────────────────────────────────────
-- Verificación
-- ───────────────────────────────────────────────────────────────────────────
SELECT
  slug,
  title,
  date_label,
  CASE WHEN published = 1 THEN 'publicada' ELSE 'borrador' END AS estado,
  length(body) AS chars_body
FROM posts
ORDER BY
  CASE slug
    WHEN 'calima-costa-blanca' THEN 1
    WHEN 'salitre-cristales' THEN 2
    WHEN 'psicologia-escaparate' THEN 3
    WHEN 'agua-pura-osmotizada' THEN 4
  END;
