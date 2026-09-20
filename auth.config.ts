import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import Google from "next-auth/providers/google";

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

export const authConfig = {
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
        const fromUser =
          "displayName" in user
            ? (user as { displayName?: string | null }).displayName
            : undefined;
        token.displayName =
          (typeof fromUser === "string" ? fromUser : null) ??
          (typeof user.name === "string" ? user.name : null);
        if ("role" in user && typeof (user as { role?: Role }).role === "string") {
          token.role = (user as { role: Role }).role;
        }
      }

      if (trigger === "update" && session && "displayName" in session) {
        const next = (session as { displayName?: unknown }).displayName;
        token.displayName = typeof next === "string" ? next : null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        const displayName =
          typeof token.displayName === "string" ? token.displayName : null;
        session.user.displayName = displayName;
        session.user.role =
          token.role === "ADMIN" || token.role === "USER" ? token.role : "USER";
        if (displayName) {
          session.user.name = displayName;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
