import { z } from "zod";
import { forbiddenResponse, requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db, transaction } from "@/lib/db";

export const dynamic = "force-dynamic";

const idSchema = z.coerce.number().int().positive();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;

  try {
    session = await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const id = idSchema.parse((await params).id);

  if (Number(session.user?.id) === id) {
    return Response.json({ error: "No puedes eliminar tu propio usuario." }, { status: 400 });
  }

  const user = await db.queryOne<{ id: number; role: "ADMIN" | "USER" }>(
    "SELECT id, role FROM users WHERE id = ? LIMIT 1",
    [id],
  );

  if (!user) {
    const snapshot = await getAdminSnapshot();
    snapshot.currentUser = { id: Number(session.user?.id), role: "ADMIN" };
    return Response.json(snapshot);
  }

  if (user.role === "ADMIN") {
    const adminCount = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'",
    );

    if (Number(adminCount?.count ?? 0) <= 1) {
      return forbiddenResponse();
    }
  }

  await transaction(async (tx) => {
    await tx.execute("UPDATE user_invitations SET createdById = NULL WHERE createdById = ?", [id]);
    await tx.execute("DELETE FROM user_invitations WHERE email = (SELECT email FROM users WHERE id = ?)", [id]);
    await tx.execute("DELETE FROM users WHERE id = ?", [id]);
  });

  const snapshot = await getAdminSnapshot();
  snapshot.currentUser = { id: Number(session.user?.id), role: "ADMIN" };
  return Response.json(snapshot);
}
