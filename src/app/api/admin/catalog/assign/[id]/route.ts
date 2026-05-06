import { z } from "zod";
import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const idSchema = z.coerce.number().int().positive();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const id = idSchema.parse((await params).id);
  await db.execute("DELETE FROM category_songs WHERE id = ?", [id]).catch(() => null);

  return Response.json(await getAdminSnapshot());
}
