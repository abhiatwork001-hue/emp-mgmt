import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/db";
import { Employee, Position } from "@/lib/models";
import bcrypt from "bcryptjs";

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

                    // Determine roles/permissions
                    // 1. Check direct role assignment
                    let roles: string[] = [];
                    if (employee.roles && employee.roles.length > 0) {
                        roles = [...employee.roles];
                    } else if (employee.role) { // Legacy fallback
                        roles.push(employee.role);
                    }

                    // 2. Check position-based role (if we need to fetch Position details)
                    if (employee.positionId) {
                        const position = await Position.findById(employee.positionId);
                        // If position has a level or permissions, we could map that to roles here.
                        // Map common position names to roles if not explicitly set
                        if (position) {
                            const posName = position.name.toLowerCase();
                            if (posName.includes('owner') || posName.includes('partner')) roles.push('owner');
                            if (posName.includes('hr')) roles.push('hr');
                            if (posName.includes('store manager')) roles.push('store_manager');
                            if (posName.includes('department head')) roles.push('department_head');
                        }
                    }

                    // Deduplicate and Normalize
                    const uniqueRoles = Array.from(new Set(roles.map(r => r.toLowerCase())));
                    if (uniqueRoles.length === 0) uniqueRoles.push('employee');

                    console.log("[Auth] Roles assigned:", uniqueRoles);

                    return {
                        id: employee._id.toString(),
                        email: employee.email,
                        name: `${employee.firstName} ${employee.lastName}`,
                        roles: uniqueRoles,
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
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.roles = (user as any).roles;
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
