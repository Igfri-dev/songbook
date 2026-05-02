# Cancionero

Webapp Next.js App Router para administrar y publicar un cancionero digital con letras y acordes estructurados.

## Stack

- Next.js 16 App Router
- TypeScript
- Prisma ORM 7
- MariaDB/MySQL en XAMPP, puerto `3307`
- TailwindCSS 4
- Auth.js / NextAuth con credenciales
- bcrypt
- Zod

## Configuracion

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` desde `.env.example`:

```bash
cp .env.example .env
```

Variables usadas localmente:

```env
DB_HOST="127.0.0.1"
DB_PORT="3307"
DB_USER="root"
DB_PASSWORD=""
DB_NAME="cancionero"
DB_CONNECTION_LIMIT="10"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:3000"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Cancionero <no-reply@cancionero.local>"
```

`APP_URL` se usa para generar los enlaces de invitacion de usuarios. `SMTP_SECURE` acepta `true`/`false`; normalmente es `true` con puerto `465` y `false` con `587`.

3. Crear base de datos si no existe:

```bash
/Applications/XAMPP/xamppfiles/bin/mysql -h 127.0.0.1 -P 3307 -u root -e "CREATE DATABASE IF NOT EXISTS cancionero CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## Prisma

Generar cliente:

```bash
npm run prisma:generate
```

Aplicar migraciones:

```bash
npm run db:migrate
```

Si XAMPP muestra `Column count of mysql.proc is wrong`, ejecuta `mysql_upgrade` con el usuario dueño del servidor MariaDB de XAMPP y repite la migracion.

Seed:

```bash
npm run db:seed
```

Usuario inicial:

- Email: `admin@cancionero.local`
- Usuario: `admin`
- Password: `Admin123!`

## Usuarios e invitaciones

En `/admin`, la seccion `Usuarios` permite crear cuentas ingresando solo el correo. El sistema deriva el usuario desde el correo antes del dominio, por ejemplo `test@dominio.com` genera el usuario `test`.

Si `SMTP_HOST` esta configurado, Cancionero envia el enlace para crear password por correo. Si no hay SMTP configurado, el enlace se muestra en el panel admin y en la consola del servidor para desarrollo local.

## Ejecucion

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Rutas

- `/`: cancionero publico
- `/login`: login admin
- `/admin`: panel admin protegido

## API publica movil

- `GET /api/mobile/manifest`
- `GET /api/mobile/index`
- `GET /api/mobile/songs/[slug]`
- `POST /api/mobile/songs/bulk`

La sincronizacion Android debe comparar `mainVersion`; si cambia, compara cada `contentVersion` antes de descargar canciones.

## Scripts utiles

```bash
npm run lint
npm run build
npm run db:studio
```
