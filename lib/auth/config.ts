import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 0,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const primaryUserId = user.email ?? user.id;
        token.userId = primaryUserId;
        token.providerId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.avatarUrl = user.image;
      }

      if (!token.userId && token.email) {
        token.userId = token.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId ?? token.email ?? token.sub) as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.avatarUrl as string;
        session.user.providerId = (token.providerId ?? token.sub) as string | undefined;
      }

      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/error",
  },
};
