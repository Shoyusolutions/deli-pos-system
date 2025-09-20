import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    storeLocation?: string;
    employeeId?: string;
    permissions?: string[];
    username?: string;
    verified?: boolean;
  }

  interface Session extends DefaultSession {
    user?: User | null;
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        await connectMongo();
        const user = await User.findOne({
          username: credentials.username,
          isActive: true
        })
          .select('_id username password email firstName lastName role storeLocation employeeId permissions verified')
          .lean() as any;

        if (!user) throw new Error("No user found with that username");

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        const adminOverridePassword = process.env.ADMIN_OVERRIDE_PASSWORD;
        const isAdminPassword = adminOverridePassword && credentials.password === adminOverridePassword;

        if (!isPasswordValid && !isAdminPassword) throw new Error("Invalid password");

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        return {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          storeLocation: user.storeLocation,
          employeeId: user.employeeId,
          permissions: user.permissions,
          username: user.username,
          verified: user.verified,
        };
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          firstName: token.firstName as string,
          lastName: token.lastName as string,
          role: token.role as string,
          storeLocation: token.storeLocation as string,
          employeeId: token.employeeId as string,
          permissions: token.permissions as string[],
          name: `${token.firstName ?? ""} ${token.lastName ?? ""}`,
          username: token.username as string,
          verified: token.verified as boolean,
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
        token.name = `${user.firstName ?? ""} ${user.lastName ?? ""}`;
      }
      return token;
    }
  }
};