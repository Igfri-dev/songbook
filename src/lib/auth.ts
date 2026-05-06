import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/song-content";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email o usuario y password",
      credentials: {
        identifier: { label: "Email o usuario", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await db.queryOne<{
          id: number;
          name: string;
          email: string;
          passwordHash: string | null;
          role: "ADMIN";
        }>(
          `SELECT id, name, email, passwordHash, role
             FROM users
            WHERE ${parsed.data.identifier.includes("@") ? "email" : "username"} = ?
            LIMIT 1`,
          [parsed.data.identifier],
        );

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = token.role === "ADMIN" ? "ADMIN" : undefined;
      }

      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
