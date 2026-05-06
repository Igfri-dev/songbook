import { forbiddenResponse, requirePanelSession, unauthorizedResponse, validationResponse } from "@/lib/admin";
import { getAdminSnapshot, getUserManagementSnapshot } from "@/lib/catalog";
import { db, transaction } from "@/lib/db";
import type { UserRole } from "@/lib/roles";
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

type ExistingUser = {
  id: number;
  email: string;
  username: string;
  passwordHash: string | null;
  role: UserRole;
};

async function snapshotFor(role: UserRole) {
  return role === "ADMIN" ? getAdminSnapshot() : getUserManagementSnapshot();
}

export async function POST(request: Request) {
  let session;

  try {
    session = await requirePanelSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = inviteUserSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationResponse(parsed.error);
  }

  const email = parsed.data.email;
  const requestedRole = parsed.data.role;
  const username = usernameFromEmail(email);
  const actorRole = session.user?.role ?? "USER";

  if (!username) {
    return Response.json({ error: "No se pudo derivar un usuario desde el correo." }, { status: 400 });
  }

  if (actorRole !== "ADMIN" && requestedRole === "ADMIN") {
    return forbiddenResponse();
  }

  const [existingEmailUser, existingUsernameUser] = await Promise.all([
    db.queryOne<ExistingUser>(
      "SELECT id, email, username, passwordHash, role FROM users WHERE email = ? LIMIT 1",
      [email],
    ),
    db.queryOne<Pick<ExistingUser, "email">>(
      "SELECT email FROM users WHERE username = ? LIMIT 1",
      [username],
    ),
  ]);

  if (actorRole !== "ADMIN" && existingEmailUser?.role === "ADMIN") {
    return forbiddenResponse();
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
  const role = existingEmailUser?.role ?? (actorRole === "ADMIN" ? requestedRole : "USER");
  const action = existingEmailUser?.passwordHash ? "reset" : "create";

  await transaction(async (tx) => {
    if (existingEmailUser) {
      if (!existingEmailUser.passwordHash) {
        await tx.execute(
          "UPDATE users SET name = ?, username = ?, role = ? WHERE email = ?",
          [username, username, role, email],
        );
      }
    } else {
      await tx.execute(
        "INSERT INTO users (name, email, username, passwordHash, role) VALUES (?, ?, ?, NULL, ?)",
        [username, email, username, role],
      );
    }

    await tx.execute(
      "UPDATE user_invitations SET acceptedAt = ? WHERE email = ? AND acceptedAt IS NULL",
      [new Date(), email],
    );

    await tx.execute(
      `INSERT INTO user_invitations (email, username, tokenHash, role, expiresAt, createdById)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        email,
        username,
        tokenHash,
        role,
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
    snapshot: await snapshotFor(actorRole),
    delivery,
    action,
  });
}
