# Limpiezas Luz de Luna — Web + Backoffice del blog

Sitio estático HTML + Netlify Functions + Turso para el blog dinámico y su panel de gestión.

## Estructura

```
.
├── netlify/
│   └── functions/         # 9 funciones (auth + posts CRUD + lectura pública)
├── lib/
│   ├── db.js              # Cliente Turso (compartido)
│   └── auth.js            # JWT + password + cookies (compartido)
├── backoffice/
│   ├── index.html         # Login + dashboard + editor (todo en uno)
│   └── assets/
│       ├── css/backoffice.css
│       └── js/backoffice.js
├── scripts/
│   └── init-db.js         # Crea el schema y opcionalmente siembra 4 entradas
├── blog/
│   ├── index.html         # Blog público (consume /posts-public)
│   └── post.html          # Entrada individual (consume /posts-get)
├── assets/                # CSS, JS, imágenes del sitio
├── netlify.toml           # Config de Netlify (funciones + headers)
├── package.json           # Dependencias: @libsql/client, jose
└── .env.example           # Plantilla de variables de entorno
```

## 1. Turso · una sola vez

1. Crea cuenta en [turso.tech](https://turso.tech) y una base de datos (`limpiezas-luz-de-luna`).
2. Genera un token con permisos de lectura/escritura.
3. Apunta:
   - `TURSO_DATABASE_URL` → `libsql://limpiezas-luz-de-luna.turso.io`
   - `TURSO_AUTH_TOKEN` → `eyJhbGciOi...`

## 2. Variables de entorno

Crea un `.env` local (no se sube al repo) y configura las mismas variables en **Netlify → Site settings → Environment variables**:

| Variable | Descripción |
|---|---|
| `TURSO_DATABASE_URL` | URL libsql de tu DB |
| `TURSO_AUTH_TOKEN` | Token de Turso |
| `ADMIN_PASSWORD` | Contraseña para entrar al backoffice |
| `JWT_SECRET` | Secreto para firmar las sesiones (≥32 chars aleatorios) |
| `SITE_URL` | (opcional) URL del sitio, para CORS si separas el backoffice |

Genera un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 3. Instalar dependencias y crear el schema

```bash
npm install
npm run init:db           # solo crea el schema
npm run init:db -- --seed # además inserta 4 entradas de ejemplo
```

Con la CLI de Netlify (lee las vars del dashboard):

```bash
netlify env:exec -- node scripts/init-db.js --seed
```

## 4. Desarrollo local

```bash
npm run dev          # usa netlify dev (recomendado: detecta .env automáticamente)
# o, sin instalar netlify-cli:
npm run dev:simple   # http-server plano; las funciones NO funcionan, solo el front
```

`netlify dev` arranca en `http://localhost:8888`. Carga el `.env` automáticamente.

## 5. Despliegue

1. Sube el repo a GitHub/GitLab.
2. En Netlify: **Add new site → Import from Git**.
3. Netlify lee `netlify.toml`:
   - `command = "node scripts/build.js"` → solo copia la web pública a `_site/`
   - `functions = "netlify/functions"` → descubre y empaqueta las 9 funciones
   - **No hace falta** cambiar build command ni publish directory.
4. Configura las variables de entorno en **Site settings → Environment variables**.
5. Una vez desplegado, ve a `https://tu-dominio.com/backoffice/` y entra con `ADMIN_PASSWORD`.

El comando de build se salta `lib/`, `scripts/` y `netlify/` (solo se publica el contenido cliente).

Las funciones se despliegan automáticamente. URLs:

```
https://tu-dominio.com/.netlify/functions/posts-public
https://tu-dominio.com/.netlify/functions/posts-get?slug=calima-costa-blanca
https://tu-dominio.com/.netlify/functions/auth-login
https://tu-dominio.com/.netlify/functions/auth-check
… (el resto son internas del backoffice)
```

## API

### Públicas (sin auth)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/.netlify/functions/posts-public` | Lista entradas publicadas |
| `GET` | `/.netlify/functions/posts-get?slug=X` | Devuelve una entrada publicada |

### Autenticación

| Método | Endpoint | Body |
|---|---|---|
| `POST` | `/.netlify/functions/auth-login` | `{ "password": "..." }` |
| `POST` | `/.netlify/functions/auth-logout` | — |
| `GET` | `/.netlify/functions/auth-check` | — |

### Backoffice (con cookie de sesión)

| Método | Endpoint | Body / Query |
|---|---|---|
| `GET` | `/.netlify/functions/posts-list` | — |
| `POST` | `/.netlify/functions/posts-create` | `{ title, slug, excerpt, body, dateLabel, imageDataUrl, published }` |
| `PUT` | `/.netlify/functions/posts-update?id=X` | mismo body |
| `DELETE` | `/.netlify/functions/posts-delete?id=X` | — |

## Esquema de la tabla

```sql
CREATE TABLE posts (
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
```

## Seguridad

- Las contraseñas se comparan en tiempo constante (`timingSafeEqualStr`).
- La sesión es una cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción, con JWT firmado (HS256) y expiración de 24 h.
- Las imágenes se almacenan como data URL. Saneo de `pickString` con tope de 4 MB para evitar payloads desbocados.
- `Cache-Control: no-store` en `/backoffice/*` y en las funciones (siempre datos frescos).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` en `/backoffice/*`.

### ¿Y el `.env`?

El `.env` **nunca llega a producción**. Tres capas de defensa:

1. **`scripts/build.js`** lo excluye explícitamente (junto con `lib/`, `scripts/`, `netlify/`, `package.json`, `node_modules/`, `.git/`, …) del directorio `_site/` que es lo único que Netlify publica.
2. **`.gitignore`** lo ignora, así que no se sube al repo de Git.
3. **`netlify.toml`** añade redirects `404` para cualquier intento de acceder a `/.env`, `/.env.example`, `/lib/*`, `/scripts/*`, `/package.json`, `/netlify.toml`, `/.git/*`, `/node_modules/*`.

Netlify **no lee** el `.env` del repo: las variables de entorno se configuran en **Site settings → Environment variables** del dashboard, que es donde AuthText las inyecta a las funciones en runtime.

## Próximos pasos sugeridos

- Mover las imágenes a un CDN / bucket y guardar solo la URL.
- Reemplazar el password único por una tabla de usuarios cuando haya varios editores.
- Backup diario de Turso (`turso db shell … ".dump"`).
