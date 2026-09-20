import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string | null;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    displayName?: string | null;
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    displayName?: string | null;
    role?: Role;
  }
}
