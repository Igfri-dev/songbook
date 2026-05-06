import { z } from "zod";
import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const publishSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = publishSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const now = new Date();
  await db.execute(
    "INSERT INTO catalog_versions (mainVersion, publishedAt, notes) VALUES (?, ?, ?)",
    [now, now, parsed.data.notes?.trim() || null],
  );

  return Response.json(await getAdminSnapshot());
}
