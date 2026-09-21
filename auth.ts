import { PrismaAdapter } from "@auth/prisma-adapter";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

async function resolveUserRole(userId: string, email: string | null | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email?.toLowerCase() === adminEmail) {
    await prisma.user.updateMany({
      where: { id: userId, role: { not: Role.ADMIN } },
      data: { role: Role.ADMIN },
    });
    return Role.ADMIN;
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return dbUser?.role ?? Role.USER;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          displayName: user.displayName,
          image: user.image ?? user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (trigger === "update" && session && "displayName" in session) {
        token.displayName =
          typeof session.displayName === "string" ? session.displayName : null;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { displayName: true, email: true, role: true },
        });
        if (user?.id || token.displayName === undefined) {
          token.displayName = dbUser?.displayName ?? null;
        }
        token.role = await resolveUserRole(
          token.sub,
          dbUser?.email ?? (typeof user?.email === "string" ? user.email : null),
        );
      }

      return token;
    },
  },
});
