import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import connectDb from "@/db/connectDb";
import User from "@/models/User";

const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],

  pages: {
    signIn: '/login',
    signOut: '/login',
  },

  events: {
    async signOut({ token }) {
      // Clear session on sign out
      return Promise.resolve();
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "github") {
        try {
          await connectDb();

          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            await User.create({
              email: user.email,
              username: user.email.split("@")[0],
            });
          }

          return true;
        } catch (err) {
          console.error("❌ Error during sign-in:", err);
          return false;
        }
      }
      return true;
    },

    async session({ session }) {
      try {
        await connectDb();

        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.name = dbUser.username;
        }

        return session;
      } catch (err) {
        console.error("❌ Error during session callback:", err);
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
