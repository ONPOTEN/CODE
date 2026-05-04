import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "TokenAuth",
      credentials: {
        token: { label: "Token", type: "text" },
        user: { label: "User", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.token || !credentials?.user) return null;
        try {
          return {
            id: "fake-id",
            apiToken: credentials.token as string,
            userJson: credentials.user as string
          };
        } catch (e) {
          return null;
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.apiToken = (user as any).apiToken;
        token.userData = (user as any).userJson;
      }
      return token;
    },
    session({ session, token }) {
      // @ts-ignore
      session.apiToken = token.apiToken;
      try {
        if (token.userData) {
          // @ts-ignore
          session.user = JSON.parse(token.userData as string) as any;
        }
      } catch (e) { }
      return session;
    }
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "centimet2-fallback-secret-for-jwt-session!"
});
