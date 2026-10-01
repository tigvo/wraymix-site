import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const googleClientId = process.env.AUTH_GOOGLE_ID;

const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!googleClientId) {
  throw new Error("AUTH_GOOGLE_ID が設定されていません。");
}

if (!googleClientSecret) {
  throw new Error("AUTH_GOOGLE_SECRET が設定されていません。");
}

if (!adminEmail) {
  throw new Error("ADMIN_EMAIL が設定されていません。");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,

      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      const email = user.email?.trim().toLowerCase();

      if (!email) {
        return false;
      }

      return email === adminEmail;
    },
  },
});
