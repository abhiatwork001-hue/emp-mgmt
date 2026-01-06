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
                    const employee = await Employee.findOne({ email: credentials.email })
                        .select("firstName lastName email password roles positionId isPasswordChanged")
                        .lean();

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
                        isPasswordChanged: employee.isPasswordChanged !== false
                    };

                    console.log("[Auth] Successfully authorized. Payload keys:", Object.keys(authData));
                    console.log("[Auth] Roles count:", uniqueRoles.length, "Permissions count:", permissions.length);
                    const payloadSize = JSON.stringify(authData).length;
                    console.log("[Auth] Estimated payload size:", payloadSize, "bytes");

                    if (payloadSize > 2000) {
                        console.warn("[Auth] WARNING: payload size is unusually large!");
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
                session.user = {
                    ...session.user,
                    id: token.sub,
                    roles: token.r as string[],
                    permissions: token.p as string[],
                    isPasswordChanged: token.ipc as boolean
                } as any;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.r = (user as any).roles;
                token.p = (user as any).permissions;
                token.ipc = (user as any).isPasswordChanged;
            }
            return token;
        },
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    },
};
