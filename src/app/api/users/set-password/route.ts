import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { setPasswordSchema } from "@/lib/song-content";
import { hashInvitationToken } from "@/lib/user-invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = setPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const tokenHash = hashInvitationToken(parsed.data.token);
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return Response.json({ error: "El enlace no es valido o ya vencio." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const displayName = parsed.data.name || invitation.username;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { email: invitation.email },
      data: {
        name: displayName,
        username: invitation.username,
        passwordHash,
        role: "ADMIN",
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await tx.userInvitation.updateMany({
      where: {
        email: invitation.email,
        id: { not: invitation.id },
        acceptedAt: null,
      },
      data: { acceptedAt: new Date() },
    });
  });

  return Response.json({ ok: true });
}
