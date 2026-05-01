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
DATABASE_URL="mysql://root@127.0.0.1:3307/cancionero"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

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
- Password: `Admin123!`

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
