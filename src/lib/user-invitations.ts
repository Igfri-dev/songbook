import crypto from "crypto";
import nodemailer from "nodemailer";

const invitationDays = 7;

export type InvitationDelivery = {
  sent: boolean;
  setupUrl: string;
};

export function usernameFromEmail(email: string) {
  return email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "";
}

export function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createInvitationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function setupPasswordUrl(token: string) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = new URL("/set-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function invitationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + invitationDays);
  return expiresAt;
}

function booleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export async function sendInvitationEmail(email: string, setupUrl: string): Promise<InvitationDelivery> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = booleanEnv("SMTP_SECURE", port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "Cancionero <no-reply@cancionero.local>";

  if (!host) {
    console.info(`[Cancionero] Invitacion para ${email}: ${setupUrl}`);
    return { sent: false, setupUrl };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Crea tu password en Cancionero",
    text: [
      "Hola,",
      "",
      "Se creo una cuenta para ti en Cancionero.",
      `Abre este enlace para definir tu password: ${setupUrl}`,
      "",
      `El enlace vence en ${invitationDays} dias.`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1c1917">
        <h1 style="font-size:20px">Crea tu password en Cancionero</h1>
        <p>Se creo una cuenta para ti en Cancionero.</p>
        <p>
          <a href="${setupUrl}" style="display:inline-block;background:#047857;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">
            Crear password
          </a>
        </p>
        <p>El enlace vence en ${invitationDays} dias.</p>
      </div>
    `,
  });

  return { sent: true, setupUrl };
}
