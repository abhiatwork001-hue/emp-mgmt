import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/db";
import { Employee, Position } from "@/lib/models";
import bcrypt from "bcryptjs";
import { getAugmentedRolesAndPermissions } from "./auth-utils";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("[Auth] Authorize called with:", { email: credentials?.email });

                if (!credentials?.email || !credentials?.password) {
                    console.log("[Auth] Missing credentials");
                    return null;
                }

                try {
                    console.log("[Auth] Connecting to DB...");
                    await dbConnect();

                    console.log("[Auth] Finding employee:", credentials.email);
                    const employee = await Employee.findOne({ email: credentials.email });

                    if (!employee) {
                        console.log("[Auth] Employee not found");
                        return null;
                    }
                    console.log("[Auth] Employee found:", employee._id);

                    // Verify password
                    console.log("[Auth] Verifying password...");
                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        employee.password || ""
                    );

                    if (!isPasswordValid) {
                        console.log("[Auth] Password invalid");
                        return null;
                    }
                    console.log("[Auth] Password valid");

                    // Determine roles/permissions using unified helper
                    const position = employee.positionId ? await Position.findById(employee.positionId).populate('roles') : null;
                    const { roles: uniqueRoles, permissions } = getAugmentedRolesAndPermissions(employee, position);

                    return {
                        id: employee._id.toString(),
                        email: employee.email,
                        name: `${employee.firstName} ${employee.lastName}`,
                        roles: uniqueRoles,
                        permissions: permissions,
                        isPasswordChanged: employee.isPasswordChanged !== false
                    };
                } catch (error) {
                    console.error("[Auth] Error in authorize:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user) {
                (session.user as any).id = token.sub;
                (session.user as any).roles = token.roles;
                (session.user as any).permissions = token.permissions;
                (session.user as any).isPasswordChanged = token.isPasswordChanged;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.roles = (user as any).roles;
                token.permissions = (user as any).permissions;
                token.isPasswordChanged = (user as any).isPasswordChanged;
            }
            return token;
        },
    },
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
};
