import bcrypt from "bcrypt";
import { db, transaction } from "@/lib/db";
import { setPasswordSchema } from "@/lib/song-content";
import { hashInvitationToken } from "@/lib/user-invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = setPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const tokenHash = hashInvitationToken(parsed.data.token);
  const invitation = await db.queryOne<{
    id: number;
    email: string;
    username: string;
    role: "ADMIN" | "USER";
    expiresAt: Date;
    acceptedAt: Date | null;
  }>(
    "SELECT id, email, username, role, expiresAt, acceptedAt FROM user_invitations WHERE tokenHash = ? LIMIT 1",
    [tokenHash],
  );

  if (!invitation || invitation.acceptedAt || new Date(invitation.expiresAt) < new Date()) {
    return Response.json({ error: "El enlace no es valido o ya vencio." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const displayName = parsed.data.name || invitation.username;

  await transaction(async (tx) => {
    await tx.execute(
      `UPDATE users
          SET name = ?, username = ?, passwordHash = ?, role = ?
        WHERE email = ?`,
      [displayName, invitation.username, passwordHash, invitation.role, invitation.email],
    );

    await tx.execute(
      "UPDATE user_invitations SET acceptedAt = ? WHERE id = ?",
      [new Date(), invitation.id],
    );

    await tx.execute(
      "UPDATE user_invitations SET acceptedAt = ? WHERE email = ? AND id <> ? AND acceptedAt IS NULL",
      [new Date(), invitation.email, invitation.id],
    );
  });

  return Response.json({ ok: true });
}
