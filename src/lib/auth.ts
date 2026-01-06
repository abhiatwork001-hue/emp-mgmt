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

                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    await dbConnect();

                    const employee = await Employee.findOne({ email: credentials.email })
                        .select("firstName lastName email password roles positionId isPasswordChanged")
                        .lean();

                    if (!employee) {
                        return null;
                    }

                    // Verify password
                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        employee.password || ""
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    // Determine roles/permissions using unified helper (using .lean() for position)
                    const position = employee.positionId
                        ? await Position.findById(employee.positionId)
                            .populate({ path: 'roles', select: 'name permissions' })
                            .select('name permissions roles')
                            .lean()
                        : null;
                    const { roles: uniqueRoles, permissions } = getAugmentedRolesAndPermissions(employee, position);

                    // Aggressive Sanitization
                    const sanitizedRoles = uniqueRoles.map(r => String(r)).filter(r => r.length < 100);
                    const sanitizedPermissions = permissions.map(p => {
                        const s = typeof p === 'string' ? p : (p as any).type || String(p);
                        return String(s);
                    }).filter(p => p.length < 200);

                    const authData = {
                        id: String(employee._id),
                        // Only keeping the absolute essentials for session detection
                        roles: sanitizedRoles,
                        permissions: sanitizedPermissions,
                        name: `${employee.firstName} ${employee.lastName}`,
                        email: employee.email,
                        isPasswordChanged: employee.isPasswordChanged !== false
                    };

                    const payloadSize = JSON.stringify(authData).length;

                    if (payloadSize > 2000) {
                        // console.warn("[Auth] WARNING: payload size is unusually large!"); // Removed log
                    }

                    return authData;
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
                // Ensure we don't overwrite with undefined if token is somehow missing data
                session.user = {
                    ...session.user,
                    id: token.sub || (session.user as any).id,
                    name: token.name || session.user.name,
                    email: token.email || session.user.email,
                    roles: (token.roles as string[]) || (session.user as any).roles,
                    permissions: (token.permissions as string[]) || (session.user as any).permissions,
                    isPasswordChanged: token.isPasswordChanged as boolean
                } as any;
            }
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.sub = user.id;
                token.roles = (user as any).roles;
                token.permissions = (user as any).permissions;
                token.name = (user as any).name || (user as any).firstName + " " + (user as any).lastName;
                token.email = (user as any).email;
                token.isPasswordChanged = (user as any).isPasswordChanged;
            }

            // Handle session update (e.g. after password change)
            if (trigger === "update" && session) {
                if (session.user) {
                    if (session.user.name) token.name = session.user.name;
                    if (session.user.email) token.email = session.user.email;
                    if (session.user.roles) token.roles = session.user.roles;
                    if (session.user.permissions) token.permissions = session.user.permissions;
                    if (session.user.isPasswordChanged !== undefined) {
                        token.isPasswordChanged = session.user.isPasswordChanged;
                    }
                }
            }

            return token;
        },
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    // @ts-ignore
    trustHost: true, // Required for Vercel/proxied environments
    pages: {
        signIn: "/login",
    },
};
