import { requireAdminSession, unauthorizedResponse, validationResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db, transaction } from "@/lib/db";
import { inviteUserSchema } from "@/lib/song-content";
import {
  createInvitationToken,
  hashInvitationToken,
  invitationExpiry,
  sendInvitationEmail,
  setupPasswordUrl,
  usernameFromEmail,
} from "@/lib/user-invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let session;

  try {
    session = await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = inviteUserSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationResponse(parsed.error);
  }

  const email = parsed.data.email;
  const username = usernameFromEmail(email);

  if (!username) {
    return Response.json({ error: "No se pudo derivar un usuario desde el correo." }, { status: 400 });
  }

  const [existingEmailUser, existingUsernameUser] = await Promise.all([
    db.queryOne<{ email: string; passwordHash: string | null }>(
      "SELECT email, passwordHash FROM users WHERE email = ? LIMIT 1",
      [email],
    ),
    db.queryOne<{ email: string }>(
      "SELECT email FROM users WHERE username = ? LIMIT 1",
      [username],
    ),
  ]);

  if (existingEmailUser?.passwordHash) {
    return Response.json({ error: "Ya existe un usuario activo con ese correo." }, { status: 409 });
  }

  if (existingUsernameUser && existingUsernameUser.email !== email) {
    return Response.json({
      error: `El usuario "${username}" ya esta usado por otro correo.`,
    }, { status: 409 });
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const setupUrl = setupPasswordUrl(token);
  const createdById = session.user?.id ? Number(session.user.id) : null;

  await transaction(async (tx) => {
    await tx.execute(
      `INSERT INTO users (name, email, username, passwordHash, role)
       VALUES (?, ?, ?, NULL, 'ADMIN')
       ON DUPLICATE KEY UPDATE name = VALUES(name), username = VALUES(username), role = 'ADMIN'`,
      [username, email, username],
    );

    await tx.execute(
      "UPDATE user_invitations SET acceptedAt = ? WHERE email = ? AND acceptedAt IS NULL",
      [new Date(), email],
    );

    await tx.execute(
      `INSERT INTO user_invitations (email, username, tokenHash, expiresAt, createdById)
       VALUES (?, ?, ?, ?, ?)`,
      [
        email,
        username,
        tokenHash,
        invitationExpiry(),
        createdById && Number.isFinite(createdById) ? createdById : null,
      ],
    );
  });

  let delivery;

  try {
    delivery = await sendInvitationEmail(email, setupUrl);
  } catch (error) {
    console.error("[Cancionero] No se pudo enviar invitacion", error);
    delivery = { sent: false, setupUrl };
  }

  return Response.json({
    snapshot: await getAdminSnapshot(),
    delivery,
  });
}
