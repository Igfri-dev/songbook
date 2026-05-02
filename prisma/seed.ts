import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDatabaseConfig } from "../src/lib/db-env";

const adapter = new PrismaMariaDb(getDatabaseConfig());
const prisma = new PrismaClient({ adapter });

const adminEmail = "admin@cancionero.local";
const adminPassword = "Admin123!";

async function main() {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "Administrador", username: "admin", passwordHash, role: "ADMIN" },
    create: {
      name: "Administrador",
      email: adminEmail,
      username: "admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const entrada = await prisma.songCategory.upsert({
    where: { slug: "entrada" },
    update: { name: "Entrada", sortOrder: 0 },
    create: { name: "Entrada", slug: "entrada", sortOrder: 0 },
  });

  const comunion = await prisma.songCategory.upsert({
    where: { slug: "comunion" },
    update: { name: "Comunion", sortOrder: 1 },
    create: { name: "Comunion", slug: "comunion", sortOrder: 1 },
  });

  const tiempoPascual = await prisma.songCategory.upsert({
    where: { slug: "tiempo-pascual" },
    update: { name: "Tiempo pascual", parentId: entrada.id, sortOrder: 0 },
    create: {
      name: "Tiempo pascual",
      slug: "tiempo-pascual",
      parentId: entrada.id,
      sortOrder: 0,
    },
  });

  const now = new Date();

  const abreTuJardin = await prisma.song.upsert({
    where: { slug: "abre-tu-jardin" },
    update: {
      title: "Abre tu jardin",
      hasChords: true,
      isPublished: true,
      contentVersion: now,
      content: {
        upsert: {
          update: {
            contentJson: {
              sections: [
                {
                  type: "verse",
                  title: "Verso 1",
                  lines: [
                    {
                      lyrics: "Abre tu jardin, traigo una buena noticia;",
                      chords: [
                        { chord: "MI", at: 0 },
                        { chord: "FA#m", at: 11 },
                        { chord: "SOL#m", at: 17 },
                      ],
                    },
                    {
                      lyrics: "novedad sin fin, corramos a recibirla.",
                      chords: [
                        { chord: "LA", at: 0 },
                        { chord: "SI7", at: 18 },
                      ],
                    },
                  ],
                },
                {
                  type: "chorus",
                  title: "Estribillo",
                  lines: [
                    {
                      lyrics: "Aleluya, el Senor resucito.",
                      chords: [
                        { chord: "MI", at: 0 },
                        { chord: "SI7", at: 10 },
                        { chord: "MI", at: 23 },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          create: {
            contentJson: {
              sections: [
                {
                  type: "verse",
                  title: "Verso 1",
                  lines: [
                    {
                      lyrics: "Abre tu jardin, traigo una buena noticia;",
                      chords: [
                        { chord: "MI", at: 0 },
                        { chord: "FA#m", at: 11 },
                        { chord: "SOL#m", at: 17 },
                      ],
                    },
                    {
                      lyrics: "novedad sin fin, corramos a recibirla.",
                      chords: [
                        { chord: "LA", at: 0 },
                        { chord: "SI7", at: 18 },
                      ],
                    },
                  ],
                },
                {
                  type: "chorus",
                  title: "Estribillo",
                  lines: [
                    {
                      lyrics: "Aleluya, el Senor resucito.",
                      chords: [
                        { chord: "MI", at: 0 },
                        { chord: "SI7", at: 10 },
                        { chord: "MI", at: 23 },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    create: {
      title: "Abre tu jardin",
      slug: "abre-tu-jardin",
      hasChords: true,
      isPublished: true,
      contentVersion: now,
      content: {
        create: {
          contentJson: {
            sections: [
              {
                type: "verse",
                title: "Verso 1",
                lines: [
                  {
                    lyrics: "Abre tu jardin, traigo una buena noticia;",
                    chords: [
                      { chord: "MI", at: 0 },
                      { chord: "FA#m", at: 11 },
                      { chord: "SOL#m", at: 17 },
                    ],
                  },
                  {
                    lyrics: "novedad sin fin, corramos a recibirla.",
                    chords: [
                      { chord: "LA", at: 0 },
                      { chord: "SI7", at: 18 },
                    ],
                  },
                ],
              },
              {
                type: "chorus",
                title: "Estribillo",
                lines: [
                  {
                    lyrics: "Aleluya, el Senor resucito.",
                    chords: [
                      { chord: "MI", at: 0 },
                      { chord: "SI7", at: 10 },
                      { chord: "MI", at: 23 },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
  });

  const panDeVida = await prisma.song.upsert({
    where: { slug: "pan-de-vida" },
    update: {
      title: "Pan de vida",
      hasChords: true,
      isPublished: true,
      contentVersion: now,
      content: {
        upsert: {
          update: {
            contentJson: {
              sections: [
                {
                  type: "chorus",
                  title: "Estribillo",
                  lines: [
                    {
                      lyrics: "Pan de vida, cuerpo del Senor.",
                      chords: [
                        { chord: "DO", at: 0 },
                        { chord: "FA", at: 12 },
                        { chord: "SOL7", at: 24 },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          create: {
            contentJson: {
              sections: [
                {
                  type: "chorus",
                  title: "Estribillo",
                  lines: [
                    {
                      lyrics: "Pan de vida, cuerpo del Senor.",
                      chords: [
                        { chord: "DO", at: 0 },
                        { chord: "FA", at: 12 },
                        { chord: "SOL7", at: 24 },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    create: {
      title: "Pan de vida",
      slug: "pan-de-vida",
      hasChords: true,
      isPublished: true,
      contentVersion: now,
      content: {
        create: {
          contentJson: {
            sections: [
              {
                type: "chorus",
                title: "Estribillo",
                lines: [
                  {
                    lyrics: "Pan de vida, cuerpo del Senor.",
                    chords: [
                      { chord: "DO", at: 0 },
                      { chord: "FA", at: 12 },
                      { chord: "SOL7", at: 24 },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
  });

  await prisma.categorySong.upsert({
    where: {
      categoryId_songId: {
        categoryId: tiempoPascual.id,
        songId: abreTuJardin.id,
      },
    },
    update: { sortOrder: 0 },
    create: {
      categoryId: tiempoPascual.id,
      songId: abreTuJardin.id,
      sortOrder: 0,
    },
  });

  await prisma.categorySong.upsert({
    where: {
      categoryId_songId: {
        categoryId: comunion.id,
        songId: panDeVida.id,
      },
    },
    update: { sortOrder: 0 },
    create: {
      categoryId: comunion.id,
      songId: panDeVida.id,
      sortOrder: 0,
    },
  });

  await prisma.catalogVersion.create({
    data: {
      mainVersion: now,
      publishedAt: now,
      notes: "Seed inicial",
    },
  });

  console.log(`Seed listo. Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
