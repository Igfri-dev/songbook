import { requireAdminSession, unauthorizedResponse, validationResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
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
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
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

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { email },
      update: {
        name: username,
        username,
        role: "ADMIN",
      },
      create: {
        name: username,
        email,
        username,
        passwordHash: null,
        role: "ADMIN",
      },
    });

    await tx.userInvitation.updateMany({
      where: { email, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });

    await tx.userInvitation.create({
      data: {
        email,
        username,
        tokenHash,
        expiresAt: invitationExpiry(),
        createdById: createdById && Number.isFinite(createdById) ? createdById : undefined,
      },
    });
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
